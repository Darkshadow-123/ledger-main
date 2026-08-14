import { Request, Response, NextFunction } from "express"
import { getUserLimits, invalidateCache } from "./limits.repository"
import { getDailySpend, getMonthlySpend } from "../../redis/counter"
import { prisma } from "../../config/prisma"
import { Decimal } from "decimal.js"
import { AppError } from "../../lib/AppError"

export const getLimits = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id

    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED')
    }

    const [limits, dailySpend, monthlySpend] = await Promise.all([
      getUserLimits(userId),
      getDailySpend(userId),
      getMonthlySpend(userId)
    ])

    const dailyLimit   = new Decimal(limits.dailyLimitUSD.toString())
    const monthlyLimit = new Decimal(limits.monthlyLimitUSD.toString())

    const dailyRemaining   = Decimal.max(dailyLimit.sub(dailySpend), 0)
    const monthlyRemaining = Decimal.max(monthlyLimit.sub(monthlySpend), 0)

    const dailyPercentage = dailyLimit.isZero()
    ? 100
    : dailySpend.div(dailyLimit).mul(100).toDecimalPlaces(4).toNumber()

    const monthlyPercentage = monthlyLimit.isZero()
    ? 100
    : monthlySpend.div(monthlyLimit).mul(100).toDecimalPlaces(4).toNumber()

    res.status(200).json({
      daily: {
        limit: dailyLimit.toFixed(4),
        spent: dailySpend.toFixed(8),
        remaining: dailyRemaining.toFixed(8),
        percentage: dailyPercentage
      },
      monthly: {
        limit: monthlyLimit.toFixed(4),
        spent: monthlySpend.toFixed(8),
        remaining: monthlyRemaining.toFixed(8),
        percentage: monthlyPercentage
      }
    })

  } catch (error) {
    next(error)
  }
}

export const updateLimits = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id

    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED')
    }

    const { dailyLimitUSD, monthlyLimitUSD } = req.body

    if (dailyLimitUSD === undefined && monthlyLimitUSD === undefined) {
      throw new AppError(
        'Provide at least one of dailyLimitUSD or monthlyLimitUSD',
        400,
        'INVALID_BODY'
      )
    }

    const data: Record<string, Decimal> = {}

    if (dailyLimitUSD !== undefined) {
      data.dailyLimitUSD = new Decimal(dailyLimitUSD)
    }

    if (monthlyLimitUSD !== undefined) {
      data.monthlyLimitUSD = new Decimal(monthlyLimitUSD)
    }

    const updated = await prisma.userLimit.update({
      where: { userId },
      data
    })

    await invalidateCache(userId)

    res.status(200).json({
        message: 'Limits updated successfully',
        limits: {
            dailyLimitUSD: updated.dailyLimitUSD.toString(),
            monthlyLimitUSD: updated.monthlyLimitUSD.toString(),
            updatedAt: updated.updatedAt
        }
    })

  } catch (error) {
    next(error)
  }
}