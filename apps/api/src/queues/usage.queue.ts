import { Queue } from "bullmq"
import IORedis from "ioredis"

export interface UsageJobData {
  userId: string
  idempotencyKey: string
  requestId: string
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  costUsd: string
}

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null
})

export const usageQueue = new Queue<UsageJobData>("usage-processing", {
  connection,
  prefix: "ledger",
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000
    },
    removeOnComplete: true,
    removeOnFail: 100
  }
})