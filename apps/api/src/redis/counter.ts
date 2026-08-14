import { redis } from '../config/redis'
import { prisma } from '../config/prisma'
import { Decimal } from 'decimal.js'
import { AppError } from '../lib/AppError'

const toMicro = (value: Decimal): number =>
Number(value.mul(1_000_000).toFixed(0))

const fromMicro = (value: number): Decimal =>
new Decimal(value).div(1_000_000)


const luaScript = `
local daily   = tonumber(redis.call('GET', KEYS[1])) or 0
local monthly = tonumber(redis.call('GET', KEYS[2])) or 0

local cost         = tonumber(ARGV[1])
local dailyLimit   = tonumber(ARGV[2])
local monthlyLimit = tonumber(ARGV[3])
local dailyTTL     = tonumber(ARGV[4])
local monthlyTTL   = tonumber(ARGV[5])

if cost < 0 then
  return {0, daily, monthly}
end

if (daily + cost) > dailyLimit or (monthly + cost) > monthlyLimit then
  return {0, daily, monthly}
end

daily   = daily + cost
monthly = monthly + cost

redis.call('SET',    KEYS[1], daily)
redis.call('SET',    KEYS[2], monthly)
redis.call('EXPIRE', KEYS[1], dailyTTL)
redis.call('EXPIRE', KEYS[2], monthlyTTL)

return {1, daily, monthly}
`

redis.defineCommand('checkAndIncrement', {
  numberOfKeys: 2,
  lua: luaScript
})

const getDailyKey = (userId: string): string => {
  const date = new Date().toISOString().slice(0, 10)
  return `billing:daily:${userId}:${date}`
}

const getMonthlyKey = (userId: string): string => {
  const month = new Date().toISOString().slice(0, 7)
  return `billing:monthly:${userId}:${month}`
}

const getSecondsUntilEndOfDayUTC = (): number => {
  const now = new Date()
  const end = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  ))
  return Math.floor((end.getTime() - now.getTime()) / 1000)
}

const getSecondsUntilEndOfMonthUTC = (): number => {
  const now = new Date()
  const end = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    1
  ))
  return Math.floor((end.getTime() - now.getTime()) / 1000)
}

const recoverSpendFromDB = async (
  userId: string
): Promise<{ daily: Decimal; monthly: Decimal }> => {
  const now = new Date()

  const startOfDay = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ))

  const startOfMonth = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    1
  ))

  const [dailySum, monthlySum] = await Promise.all([
    prisma.usageEvent.aggregate({
      where: { userId, createdAt: { gte: startOfDay } },
      _sum: { costUSD: true }
    }),
    prisma.usageEvent.aggregate({
      where: { userId, createdAt: { gte: startOfMonth } },
      _sum: { costUSD: true }
    })
  ])

  return {
    daily:   new Decimal(dailySum._sum.costUSD   ?? 0),
    monthly: new Decimal(monthlySum._sum.costUSD ?? 0)
  }
}

export const checkAndIncrementAtomic = async (
  userId: string,
  costUSD: Decimal,
  dailyLimitUSD: Decimal,
  monthlyLimitUSD: Decimal
): Promise<{ allowed: boolean; currentDailySpend: Decimal }> => {

  const dailyKey   = getDailyKey(userId)
  const monthlyKey = getMonthlyKey(userId)

  const [dailyExists, monthlyExists] = await Promise.all([
    redis.exists(dailyKey),
    redis.exists(monthlyKey)
  ])

  if (!dailyExists || !monthlyExists) {
    const recovered = await recoverSpendFromDB(userId)

    await Promise.all([
      redis.set(dailyKey,   toMicro(recovered.daily)),
      redis.set(monthlyKey, toMicro(recovered.monthly))
    ])

    await Promise.all([
      redis.expire(dailyKey,   getSecondsUntilEndOfDayUTC()),
      redis.expire(monthlyKey, getSecondsUntilEndOfMonthUTC())
    ])
  }

  const result = await (redis as any).checkAndIncrement(
    dailyKey,
    monthlyKey,
    toMicro(costUSD),
    toMicro(dailyLimitUSD),
    toMicro(monthlyLimitUSD),
    getSecondsUntilEndOfDayUTC(),
    getSecondsUntilEndOfMonthUTC()
  )

  if (!Array.isArray(result) || result.length < 3) {
    throw new AppError('Unexpected response from Redis counter script', 500, 'COUNTER_SCRIPT_ERROR')
  }

  return {
    allowed: result[0] === 1,
    currentDailySpend: fromMicro(result[1])
  }
}

export const getDailySpend = async (userId: string): Promise<Decimal> => {
  const value = await redis.get(getDailyKey(userId))
  return fromMicro(Number(value ?? 0))
}

export const getMonthlySpend = async (userId: string): Promise<Decimal> => {
  const value = await redis.get(getMonthlyKey(userId))
  return fromMicro(Number(value ?? 0))
}