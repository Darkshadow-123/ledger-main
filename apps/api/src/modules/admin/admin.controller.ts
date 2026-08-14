import { Request, Response, NextFunction } from 'express'
import { Decimal } from 'decimal.js'
import { prisma } from '../../config/prisma'
import { AppError } from '../../lib/AppError'
import { getDailySpend, getMonthlySpend } from '../../redis/counter'
import { invalidateCache } from '../limits/limits.repository'
import { getSummaryWithLimits } from '../usage/usage.service'

const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where:  { id },
    select: { id: true, email: true }
  })
  if (!user) throw new AppError(`User ${id} not found`, 404, 'USER_NOT_FOUND')
  return user
}

export const getUsers = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, createdAt: true,
        userLimit: { select: { dailyLimitUSD: true, monthlyLimitUSD: true } }
      }
    })

    const usersWithSpend = await Promise.all(
      users.map(async user => {
        const [dailySpend, monthlySpend] = await Promise.all([
          getDailySpend(user.id),
          getMonthlySpend(user.id)
        ])
        return {
          ...user,
          dailySpend:   dailySpend.toFixed(8),
          monthlySpend: monthlySpend.toFixed(8)
        }
      })
    )

    res.status(200).json({ users: usersWithSpend })
  } catch (error) {
    next(error)
  }
}

export const getUserUsage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    const [user, summary] = await Promise.all([
      getUserById(id),
      getSummaryWithLimits(id)
    ])
    res.status(200).json({ user, summary })
  } catch (error) {
    next(error)
  }
}

export const updateUserLimits = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    const { dailyLimitUSD, monthlyLimitUSD } = req.body

    if (dailyLimitUSD === undefined && monthlyLimitUSD === undefined) {
      throw new AppError('Provide at least one limit value', 400, 'INVALID_BODY')
    }

    await getUserById(id)

    const data: Record<string, Decimal> = {}
    if (dailyLimitUSD  !== undefined) data.dailyLimitUSD  = new Decimal(dailyLimitUSD)
    if (monthlyLimitUSD !== undefined) data.monthlyLimitUSD = new Decimal(monthlyLimitUSD)

    const updated = await prisma.userLimit.update({
      where: { userId: id },
      data
    })

    await invalidateCache(id)

    res.status(200).json({
      message: 'User limits updated',
      limits: {
        dailyLimitUSD:   updated.dailyLimitUSD.toString(),
        monthlyLimitUSD: updated.monthlyLimitUSD.toString(),
        updatedAt:       updated.updatedAt
      }
    })
  } catch (error) {
    next(error)
  }
}