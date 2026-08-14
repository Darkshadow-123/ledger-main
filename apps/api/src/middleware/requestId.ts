import { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'

export const requestId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const incoming = req.headers['x-request-id']
  const id = typeof incoming === 'string' ? incoming : randomUUID()
  req.headers['x-request-id'] = id
  res.setHeader('x-request-id', id)
  next()
}