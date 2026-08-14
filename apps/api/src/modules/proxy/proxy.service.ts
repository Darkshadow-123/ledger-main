import Decimal from "decimal.js"
import { AppError } from "../../lib/AppError"
import { generateIdempotencyKey } from "../../lib/idempotency"
import { callOpenAI, Message } from "../../lib/openai"
import { calculateCost, getSupportedModels } from "../../lib/pricing"
import { checkAndIncrementAtomic } from "../../redis/counter"
import { checkCanProceed } from "../limits/limits.service"

interface ChatRequest {
  userId: string
  model: string
  messages: Message[]
  requestId: string
}

const supportedModels = getSupportedModels()

type SupportedModel = (typeof supportedModels)[number]

const SAFETY_BUFFER_MULTIPLIER = new Decimal(5)

const estimatePromptCost = (
  model: SupportedModel,
  messages: Message[]
): Decimal => {
  const totalCharacters = messages.reduce(
    (sum, message) => sum + message.content.length,
    0
  )

  const estimatedPromptTokens = Math.ceil(totalCharacters / 4)

  return calculateCost(model, estimatedPromptTokens, 0)
}

const applySafetyBuffer = (estimatedCost: Decimal): Decimal => {
  return estimatedCost.mul(SAFETY_BUFFER_MULTIPLIER)
}

const sanitizeJobId = (jobId: string): string => {
  return jobId.replace(/:/g, "-")
}

export const processChatRequest = async ({
  userId,
  model,
  messages,
  requestId,
}: ChatRequest) => {
  if (!supportedModels.includes(model as SupportedModel)) {
    throw new AppError(
      "Unsupported model",
      400,
      "INVALID_MODEL"
    )
  }

  const typedModel = model as SupportedModel

  const idempotencyKey = generateIdempotencyKey(
    userId,
    requestId
  )

  const estimatedCost = estimatePromptCost(
    typedModel,
    messages
  )

  const bufferedCost = applySafetyBuffer(
    estimatedCost
  )

  const { allowed, reason } = await checkCanProceed(
    bufferedCost,
    userId
  )

  if (!allowed) {
    throw new AppError(
      reason ?? "Spending limit exceeded",
      402,
      "LIMIT_EXCEEDED"
    )
  }

  const response = await callOpenAI(
    typedModel,
    messages,
    requestId
  )

  const actualCost = calculateCost(
    typedModel,
    response.usage.promptTokens,
    response.usage.completionTokens
  )

  const { getUserLimits } = await import(
    "../limits/limits.repository"
  )

  const limits = await getUserLimits(userId)

  await checkAndIncrementAtomic(
    userId,
    actualCost,
    new Decimal(limits.dailyLimitUSD.toString()),
    new Decimal(limits.monthlyLimitUSD.toString())
  )

  const { usageQueue } = await import(
    "../../queues/usage.queue"
  )

  await usageQueue.add(
    "process-usage",
    {
      userId,
      requestId,
      idempotencyKey,
      model: typedModel,
      promptTokens: response.usage.promptTokens,
      completionTokens: response.usage.completionTokens,
      totalTokens: response.usage.totalTokens,
      costUsd: actualCost.toString(),
    },
    {
      jobId: sanitizeJobId(idempotencyKey),
    }
  )

  return {
    content: response.content,
    usage: response.usage,
    costUSD: actualCost.toString(),
    model: typedModel,
  }
}