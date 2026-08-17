import { Job, Worker } from 'bullmq'
import IORedis from 'ioredis'
import { AlertType } from '../generated/prisma/client'
import { env } from '../config/env'
import { prisma } from '../config/prisma'
import { getUserLimits } from '../modules/limits/limits.repository'
import { AlertJobData } from '../queues/alert.queue'
import { publishAlertTriggered } from '../redis/pubsub'

const connection = new IORedis(
  env.REDIS_URL,
  {
    maxRetriesPerRequest: null
  }
)

const ALERT_TTL_SECONDS = 172800

const getAlertDedupKey = (
  userId: string,
  type: AlertType
): string => {
  const date = new Date()
    .toISOString()
    .slice(0, 10)

  return `alert:${userId}:${type}:${date}`
}

const hasAlertFired = async (
  userId: string,
  type: AlertType
): Promise<boolean> => {
  const key = getAlertDedupKey(
    userId,
    type
  )

  return (await connection.get(key)) !== null
}

const markAlertFired = async (
  userId: string,
  type: AlertType
): Promise<void> => {
  const key = getAlertDedupKey(
    userId,
    type
  )

  await connection.set(
    key,
    '1',
    'EX',
    ALERT_TTL_SECONDS
  )
}

const fireAlert = async (
  userId: string,
  type: AlertType,
  threshold: number
): Promise<void> => {
  if (await hasAlertFired(userId, type)) {
    return
  }

  const now = new Date()

  await prisma.alert.upsert({
    where: {
      userId_type: {
        userId,
        type
      }
    },

    update: {
      triggered: true,
      triggeredAt: now
    },

    create: {
      userId,
      type,
      threshold,
      triggered: true,
      triggeredAt: now
    }
  })

  await markAlertFired(userId, type)

  await publishAlertTriggered(userId, {
    userId,
    type,
    threshold
  })

  console.log(
    `[AlertWorker] Alert fired: ${type} for ${userId}`
  )
}

const calculatePercentage = (
  spend: number,
  limit: number
): number => {
  if (limit <= 0) {
    return 0
  }

  return (spend / limit) * 100
}

const handleThresholdCheck = async (
  userId: string,
  dailySpend: string,
  monthlySpend: string
): Promise<void> => {
  const limits = await getUserLimits(userId)

  const daily =
    parseFloat(dailySpend)

  const monthly =
    parseFloat(monthlySpend)

  const dailyLimit =
    parseFloat(
      limits.dailyLimitUSD.toString()
    )

  const monthlyLimit =
    parseFloat(
      limits.monthlyLimitUSD.toString()
    )

  const dailyPercentage =
    calculatePercentage(
      daily,
      dailyLimit
    )

  const monthlyPercentage =
    calculatePercentage(
      monthly,
      monthlyLimit
    )

  if (dailyPercentage >= 100) {
    await fireAlert(
      userId,
      AlertType.DAILY_LIMIT_100,
      100
    )
  } else if (dailyPercentage >= 80) {
    await fireAlert(
      userId,
      AlertType.DAILY_LIMIT_80,
      80
    )
  }

  if (monthlyPercentage >= 100) {
    await fireAlert(
      userId,
      AlertType.MONTHLY_LIMIT_100,
      100
    )
  } else if (monthlyPercentage >= 80) {
    await fireAlert(
      userId,
      AlertType.MONTHLY_LIMIT_80,
      80
    )
  }
}

const handleAnomalyCheck = async (
  userId: string
): Promise<void> => {
  const now = new Date()

  const currentHour =
    now.getUTCHours()

  const sevenDaysAgo = new Date(
    now.getTime() -
    7 * 24 * 60 * 60 * 1000
  )

  const startOfToday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
  )

  const historicalEvents =
    await prisma.usageEvent.findMany({
      where: {
        userId,

        createdAt: {
          gte: sevenDaysAgo,
          lt: startOfToday
        }
      },

      select: {
        createdAt: true,
        costUSD: true
      }
    })

  const uniqueDays = new Set(
    historicalEvents.map(event =>
      event.createdAt
        .toISOString()
        .slice(0, 10)
    )
  )

  if (uniqueDays.size < 3) {
    return
  }

  let baselineTotal = 0
  let baselineCount = 0

  for (const event of historicalEvents) {
    if (
      event.createdAt.getUTCHours() !==
      currentHour
    ) {
      continue
    }

    baselineTotal += parseFloat(
      event.costUSD?.toString() ?? '0'
    )

    baselineCount += 1
  }

  const baseline =
    baselineTotal /
    (baselineCount || 1)

  const currentHourStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      currentHour
    )
  )

  const currentHourEvents =
    await prisma.usageEvent.findMany({
      where: {
        userId,

        createdAt: {
          gte: currentHourStart
        }
      },

      select: {
        costUSD: true
      }
    })

  const currentSpend =
    currentHourEvents.reduce(
      (sum, event) => {
        return (
          sum +
          parseFloat(
            event.costUSD?.toString() ?? '0'
          )
        )
      },
      0
    )

  if (
    baseline > 0 &&
    currentSpend > baseline * 3
  ) {
    await fireAlert(
      userId,
      AlertType.ANOMALY,
      300
    )

    console.log(
      `[AlertWorker] Anomaly detected for ${userId}`
    )
  }
}

const processAlertJob = async (
  job: Job<AlertJobData>
): Promise<void> => {
  if (
    job.data.type ===
    'THRESHOLD_CHECK'
  ) {
    await handleThresholdCheck(
      job.data.userId,
      job.data.dailySpend,
      job.data.monthlySpend
    )

    return
  }

  await handleAnomalyCheck(
    job.data.userId
  )
}

export const alertWorker =
  new Worker<AlertJobData>(
    'alert-processing',
    processAlertJob,
    {
      connection,
      prefix: 'ledger',
      concurrency: 3,
      drainDelay: 300,
      skipStalledCheck: true
    }
  )

alertWorker.on('completed', job => {
  console.log(JSON.stringify({
    msg: 'Alert job completed',
    jobId: job.id
  }))
})

alertWorker.on('failed', (job, error) => {
  console.error(JSON.stringify({
    msg: 'Alert job failed',
    jobId: job?.id,

    error:
      error instanceof Error
        ? error.message
        : 'Unknown error'
  }))
})

const shutdown = async (): Promise<void> => {
  await alertWorker.close()
  await connection.quit()

  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

console.log(
  '[AlertWorker] Started'
)