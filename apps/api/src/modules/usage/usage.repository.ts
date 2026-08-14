import { Decimal } from 'decimal.js'
import { prisma } from '../../config/prisma'

export type Period = 'daily' | 'monthly'

type UsageMetrics = {
  costUSD: Decimal
  totalTokens: number
  requests: number
}

type UsageBreakdown = UsageMetrics & {
  model: string
  promptTokens: number
  completionTokens: number
}

const DAY_IN_MS = 24 * 60 * 60 * 1000

const createUTCDate = (
  year: number,
  month: number,
  day: number
) => new Date(Date.UTC(year, month, day))

const getPeriodStart = (period: Period): Date => {
  const now = new Date()

  if (period === 'daily') {
    return createUTCDate(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
  }

  return createUTCDate(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    1
  )
}

const normalizeMetrics = (
  sum: {
    costUSD?: Decimal | number | null
    totalTokens?: number | null
  },
  requests: number
): UsageMetrics => ({
  costUSD: new Decimal(sum.costUSD ?? 0),
  totalTokens: sum.totalTokens ?? 0,
  requests
})

const buildHourlyBuckets = () =>
  Array.from({ length: 24 }, (_, hour) => ({
    hour,
    costUSD: new Decimal(0),
    totalTokens: 0,
    requests: 0
  }))

export const getUserSummary = async (userId: string) => {
  const [daily, monthly] = await Promise.all([
    prisma.usageEvent.aggregate({
      where: {
        userId,
        createdAt: {
          gte: getPeriodStart('daily')
        }
      },
      _sum: {
        costUSD: true,
        totalTokens: true
      },
      _count: {
        id: true
      }
    }),

    prisma.usageEvent.aggregate({
      where: {
        userId,
        createdAt: {
          gte: getPeriodStart('monthly')
        }
      },
      _sum: {
        costUSD: true,
        totalTokens: true
      },
      _count: {
        id: true
      }
    })
  ])

  return {
    daily: normalizeMetrics(daily._sum, daily._count.id),
    monthly: normalizeMetrics(monthly._sum, monthly._count.id)
  }
}

export const getUsageByModel = async (
  userId: string,
  from: Date,
  to: Date
): Promise<UsageBreakdown[]> => {
  const rows = await prisma.usageEvent.groupBy({
    by: ['model'],
    where: {
      userId,
      createdAt: {
        gte: from,
        lte: to
      }
    },
    _sum: {
      costUSD: true,
      promptTokens: true,
      completionTokens: true,
      totalTokens: true
    },
    _count: {
      id: true
    },
    orderBy: {
      _sum: {
        costUSD: 'desc'
      }
    }
  })

  return rows.map(row => ({
    model: row.model,
    costUSD: new Decimal(row._sum.costUSD ?? 0),
    promptTokens: row._sum.promptTokens ?? 0,
    completionTokens: row._sum.completionTokens ?? 0,
    totalTokens: row._sum.totalTokens ?? 0,
    requests: row._count.id
  }))
}

export const getHourlyUsage = async (
  userId: string,
  date: Date
) => {
  const startOfDay = createUTCDate(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  )

  const endOfDay = new Date(startOfDay.getTime() + DAY_IN_MS)

  const events = await prisma.usageEvent.findMany({
    where: {
      userId,
      createdAt: {
        gte: startOfDay,
        lt: endOfDay
      }
    },
    select: {
      createdAt: true,
      costUSD: true,
      totalTokens: true
    }
  })

  const buckets = buildHourlyBuckets()

  for (const event of events) {
    const hour = event.createdAt.getUTCHours()
    const bucket = buckets[hour]

    bucket.costUSD = bucket.costUSD.add(event.costUSD ?? 0)
    bucket.totalTokens += event.totalTokens ?? 0
    bucket.requests += 1
  }

  return buckets
}

export const getTopUsers = async (
  limit: number,
  period: Period
) => {
  const rows = await prisma.usageEvent.groupBy({
    by: ['userId'],
    where: {
      createdAt: {
        gte: getPeriodStart(period)
      }
    },
    _sum: {
      costUSD: true,
      totalTokens: true
    },
    _count: {
      id: true
    },
    orderBy: {
      _sum: {
        costUSD: 'desc'
      }
    },
    take: limit
  })

  return rows.map(row => ({
    userId: row.userId,
    ...normalizeMetrics(row._sum, row._count.id)
  }))
}

export const getUsageEvents = async (
  userId: string,
  page: number,
  limit: number
) => {
  const skip = (page - 1) * limit

  const where = { userId }

  const [events, total] = await Promise.all([
    prisma.usageEvent.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit,
      select: {
        id: true,
        model: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        costUSD: true,
        requestId: true,
        createdAt: true
      }
    }),

    prisma.usageEvent.count({ where })
  ])

  const totalPages = Math.ceil(total / limit)

  return {
    events,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }
}