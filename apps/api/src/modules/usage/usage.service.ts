import { Decimal } from 'decimal.js'

import { getDailySpend, getMonthlySpend } from '../../redis/counter'
import { getUserLimits } from '../limits/limits.repository'

import {
  getHourlyUsage,
  getUsageByModel,
  getUsageEvents,
  getUserSummary
} from './usage.repository'

const APPROACHING_LIMIT_THRESHOLD = 80

const calculatePercentage = (
  spent: Decimal,
  limit: Decimal
): number => {
  if (limit.isZero()) {
    return 100
  }

  return spent
    .div(limit)
    .mul(100)
    .toDecimalPlaces(2)
    .toNumber()
}

const buildLimitSummary = (
  summary: {
    costUSD: Decimal
    totalTokens: number
    requests: number
  },
  spend: Decimal,
  limit: Decimal
) => {
  const percentage = calculatePercentage(spend, limit)

  return {
    ...summary,
    limit,
    currentSpend: spend,
    remaining: Decimal.max(limit.sub(spend), 0),
    percentage,
    isApproachingLimit:
      percentage >= APPROACHING_LIMIT_THRESHOLD
  }
}

export const getSummaryWithLimits = async (
  userId: string
) => {
  const [summary, limits, dailySpend, monthlySpend] =
    await Promise.all([
      getUserSummary(userId),
      getUserLimits(userId),
      getDailySpend(userId),
      getMonthlySpend(userId)
    ])

  const dailyLimit = new Decimal(
    limits.dailyLimitUSD.toString()
  )

  const monthlyLimit = new Decimal(
    limits.monthlyLimitUSD.toString()
  )

  return {
    daily: buildLimitSummary(
      summary.daily,
      dailySpend,
      dailyLimit
    ),

    monthly: buildLimitSummary(
      summary.monthly,
      monthlySpend,
      monthlyLimit
    )
  }
}

export const getModelBreakdown = (
  userId: string,
  from: Date,
  to: Date
) => {
  return getUsageByModel(userId, from, to)
}

export const getHourlyBreakdown = (
  userId: string,
  date: Date
) => {
  return getHourlyUsage(userId, date)
}

export const getPaginatedEvents = (
  userId: string,
  page: number,
  limit: number
) => {
  return getUsageEvents(userId, page, limit)
}