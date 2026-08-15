import { Job, Worker } from 'bullmq'
import { Decimal } from 'decimal.js'
import IORedis from 'ioredis'
import { env } from '../config/env'
import { prisma } from '../config/prisma'
import { alertQueue } from '../queues/alert.queue'
import { UsageJobData } from '../queues/usage.queue'
import { getDailySpend, getMonthlySpend } from '../redis/counter'
import { publishUsageUpdate } from '../redis/pubsub'

const connection = new IORedis(
  env.REDIS_URL,
  {
    maxRetriesPerRequest: null
  }
)

const processUsageJob = async (
  job: Job<UsageJobData>
): Promise<void> => {
  const {
    userId,
    idempotencyKey,
    requestId,
    model,
    promptTokens,
    completionTokens,
    totalTokens,
    costUsd
  } = job.data

  try {
    await prisma.usageEvent.create({
      data: {
        idempotencyKey,
        requestId,
        userId,
        model,
        promptTokens,
        completionTokens,
        totalTokens,
        costUSD: new Decimal(costUsd)
      }
    })

    console.log(JSON.stringify({
      msg: 'UsageEvent written',
      jobId: job.id,
      userId,
      model,
      costUsd,
      requestId
    }))

    await publishUsageUpdate(userId, {
      userId,
      model,
      costUsd,
      totalTokens,
      requestId
    })

    const [
      dailySpend,
      monthlySpend
    ] = await Promise.all([
      getDailySpend(userId),
      getMonthlySpend(userId)
    ])

    await alertQueue.add(
      'threshold-check',
      {
        type: 'THRESHOLD_CHECK',
        userId,

        dailySpend:
          dailySpend.toString(),

        monthlySpend:
          monthlySpend.toString()
      }
    )

    await alertQueue.add(
      'anomaly-check',
      {
        type: 'ANOMALY_CHECK',
        userId
      }
    )

  } catch (error) {
    const prismaError = error as {
      code?: string
    }

    if (prismaError.code === 'P2002') {
      console.log(JSON.stringify({
        msg: 'Duplicate job skipped',
        jobId: job.id,
        idempotencyKey
      }))

      return
    }

    throw error
  }
}

export const usageWorker =
  new Worker<UsageJobData>(
    'usage-processing',
    processUsageJob,
    {
      connection,
      prefix: 'ledger',
      concurrency: 5,
      drainDelay: 30,
      stalledInterval: 60000
    }
  )

usageWorker.on('completed', job => {
  console.log(JSON.stringify({
    msg: 'Job completed',
    jobId: job.id
  }))
})

usageWorker.on('failed', (job, error) => {
  console.error(JSON.stringify({
    msg: 'Job failed',
    jobId: job?.id,

    error:
      error instanceof Error
        ? error.message
        : 'Unknown error'
  }))
})

const shutdown = async (): Promise<void> => {
  console.log(
    '[Worker] Shutting down gracefully...'
  )

  await usageWorker.close()
  await connection.quit()

  console.log(
    '[Worker] Shutdown complete'
  )

  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

console.log(
  '[Worker] Usage worker started'
)