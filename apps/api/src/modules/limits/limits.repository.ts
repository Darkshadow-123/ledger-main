import { redis } from '../../config/redis'
import { prisma } from '../../config/prisma'
import { Decimal } from 'decimal.js'

const BASE_TTL = 300
const JITTER = 60
const CACHE_VERSION = 'v1'

const getLimitsKey = (userId: string) =>
  `limits:${CACHE_VERSION}:${userId}`

const getLockKey = (userId: string) =>
  `limits:lock:${userId}`

type CachedUserLimit = {
  id: string
  userId: string
  dailyLimitUSD: string
  monthlyLimitUSD: string
  updatedAt: string
}

const withJitter = (ttl: number) => {
  return ttl + Math.floor(Math.random() * JITTER)
}

const safeParse = (value: string): CachedUserLimit | null => {
  try {
    const parsed = JSON.parse(value)
    if (
      typeof parsed.dailyLimitUSD !== 'string' ||
      typeof parsed.monthlyLimitUSD !== 'string'
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export const getUserLimits = async (userId: string) => {
  const cacheKey = getLimitsKey(userId)

  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      const parsed = safeParse(cached)
      if (parsed) {
        return {
          ...parsed,
          dailyLimitUSD:   new Decimal(parsed.dailyLimitUSD),
          monthlyLimitUSD: new Decimal(parsed.monthlyLimitUSD),
          updatedAt:       new Date(parsed.updatedAt)
        }
      }
      await redis.del(cacheKey)
    }
  } catch {}

  const lockKey = getLockKey(userId)
  const lockAcquired = await redis.set(lockKey, '1', 'EX', 5, 'NX')

  if (!lockAcquired) {
    await new Promise(res => setTimeout(res, 50))
    const retry = await redis.get(cacheKey)
    if (retry) {
      const parsed = safeParse(retry)
      if (parsed) {
        return {
          ...parsed,
          dailyLimitUSD:   new Decimal(parsed.dailyLimitUSD),
          monthlyLimitUSD: new Decimal(parsed.monthlyLimitUSD),
          updatedAt:       new Date(parsed.updatedAt)
        }
      }
    }
  }

  await prisma.user.upsert({
    where:  { id: userId },
    update: {},
    create: {
      id:    userId,
      email: `${userId}@placeholder.ledger`
    }
  })
  
  const limits = await prisma.userLimit.upsert({
    where:  { userId },
    update: {},
    create: {
      userId,
      dailyLimitUSD:   new Decimal(5.00),
      monthlyLimitUSD: new Decimal(50.00)
    }
})

  const cachePayload: CachedUserLimit = {
    id:              limits.id,
    userId:          limits.userId,
    dailyLimitUSD:   limits.dailyLimitUSD.toString(),
    monthlyLimitUSD: limits.monthlyLimitUSD.toString(),
    updatedAt:       limits.updatedAt.toISOString()
  }

  try {
    await redis.set(
      cacheKey,
      JSON.stringify(cachePayload),
      'EX',
      withJitter(BASE_TTL)
    )
  } catch {}

  return limits
}

export const invalidateCache = async (userId: string): Promise<void> => {
  try {
    await redis.del(getLimitsKey(userId))
  } catch {}
}