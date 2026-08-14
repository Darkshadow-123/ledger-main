import { Queue } from 'bullmq'
import IORedis from 'ioredis'

import { env } from '../config/env'

export type AlertJobData =
  | {
      type: 'THRESHOLD_CHECK'
      userId: string
      dailySpend: string
      monthlySpend: string
    }
  | {
      type: 'ANOMALY_CHECK'
      userId: string
    }

const connection = new IORedis(
  env.REDIS_URL,
  {
    maxRetriesPerRequest: null
  }
)

export const alertQueue =
  new Queue<AlertJobData>(
    'alert-processing',
    {
      connection,
      prefix: 'ledger',

      defaultJobOptions: {
        attempts: 3,

        backoff: {
          type: 'exponential',
          delay: 1000
        },

        removeOnComplete: true,
        removeOnFail: 100
      }
    }
)