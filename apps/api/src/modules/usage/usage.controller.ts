import { Request, Response, NextFunction } from 'express'
import { AppError } from '../../lib/AppError'
import {
  getHourlyBreakdown,
  getModelBreakdown,
  getPaginatedEvents,
  getSummaryWithLimits
} from './usage.service'

const getUserId = (req: Request): string => {
  const userId = req.user?.id
  if (!userId) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED')
  return userId
}

const getDateRange = (from?: string, to?: string) => {
  const now = new Date()
  return {
    from: from ? new Date(from) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    to:   to   ? new Date(to)   : now
  }
}

export const getSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const summary = await getSummaryWithLimits(getUserId(req))
    res.status(200).json(summary)
  } catch (error) {
    next(error)
  }
}

export const getBreakdown = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserId(req)
    const { from, to } = getDateRange(
      req.query.from as string,
      req.query.to as string
    )
    const breakdown = await getModelBreakdown(userId, from, to)
    res.status(200).json({ from, to, breakdown })
  } catch (error) {
    next(error)
  }
}

export const getEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserId(req)
    const page  = Math.max(1, Number(req.query.page)  || 1)
    const limit = Math.min(100, Number(req.query.limit) || 20)
    const events = await getPaginatedEvents(userId, page, limit)
    res.status(200).json(events)
  } catch (error) {
    next(error)
  }
}

export const getHourly = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserId(req)
    const date = req.query.date ? new Date(req.query.date as string) : new Date()
    const buckets = await getHourlyBreakdown(userId, date)
    res.status(200).json({ date, buckets })
  } catch (error) {
    next(error)
  }
}