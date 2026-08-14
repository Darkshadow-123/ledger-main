import { redis } from '../config/redis'
import { AppError } from './AppError'

const IDEMPOTENCY_TTL_SECONDS = 86400
const IDEMPOTENCY_KEY_PREFIX = 'idempotency'

const buildRedisKey = (Key: string) => 
`${IDEMPOTENCY_KEY_PREFIX}:${Key}`

export const generateIdempotencyKey = (
    userId: string,
    requestId: string
): string => {
    if(!userId || !requestId){
        throw new AppError(
            'Invalid idempotency inputs',
            500,
            'IDEMPOTENCY_GENERATION_FAILED'
        )
    }
    return `${userId}:${requestId}`
}

export const tryMarkAsProcessed = async (key: string): Promise<boolean> => {
    const result = await redis.set(
      buildRedisKey(key),
      'processed',
      'EX',
      IDEMPOTENCY_TTL_SECONDS,
      'NX'
    )
  
    return result === 'OK'
}