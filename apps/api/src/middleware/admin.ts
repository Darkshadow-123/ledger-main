import { NextFunction, Request, Response } from 'express'

import { AppError } from '../lib/AppError'

const adminUserIds = new Set(
  (process.env.ADMIN_USER_IDS ?? '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)
)

if (adminUserIds.size === 0) {
  console.warn(
    '[Admin] ADMIN_USER_IDS is empty. Admin routes are disabled.'
  )
}

export const adminMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const userId = req.user?.id

  if (!userId) {
    throw new AppError(
      'Unauthorized',
      401,
      'UNAUTHORIZED'
    )
  }

  if (!adminUserIds.has(userId)) {
    throw new AppError(
      'Forbidden',
      403,
      'FORBIDDEN'
    )
  }

  next()
}