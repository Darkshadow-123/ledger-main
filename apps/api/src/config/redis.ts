import Redis from 'ioredis'
import { env } from '../config/env'

let isReady = false

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  connectTimeout: 10000,
  connectionName: 'ledger-api',

  retryStrategy: (times) => {
    
    if (!isReady && times > 3) {
      console.error('[Redis] failed to connect on startup. Exiting...')
      process.exit(1)
    }

    const delay = Math.min(times * 50, 2000)
    return delay
  },
})

// Events
redis.on('connect', () => {
  console.log('[Redis] connected')
})

redis.on('ready', () => {
  isReady = true
  console.log('[Redis] ready')
})

redis.on('error', (err) => {
  console.error('[Redis] error:', err)
})

redis.on('reconnecting', () => {
  console.warn('[Redis] reconnecting...')
})

export const connectRedis = async () => {
  try {
    await redis.ping()
    console.log('[Redis] connection verified')
  } catch (err) {
    console.error('[Redis] failed to connect on startup')
    process.exit(1)
  }
}

process.on('SIGINT', async () => {
  console.log('[Redis] shutting down...')
  await redis.quit()
  process.exit(0)
})