import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../lib/AppError'

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const requestId = req.headers['x-request-id']

  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of err.issues) {
      const key = issue.path.join('.')
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', fields: fieldErrors },
      requestId,
    })
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
      requestId,
    })
  }

  const errorMessage = err instanceof Error ? err.message : ''
  if (errorMessage.includes('57P03') || errorMessage.includes('database system is starting up')) {
    return res.status(503).json({
      success: false,
      error: { code: 'DATABASE_STARTING_UP', message: 'Database is currently starting up, please retry in a few seconds' },
      requestId,
    })
  }

  console.error('Unhandled error', {
    message: errorMessage || 'Unknown error',
    stack: err instanceof Error ? err.stack : undefined,
    requestId,
  })

  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' },
    requestId,
  })
}