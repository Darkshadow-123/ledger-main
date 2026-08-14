import Decimal from 'decimal.js'
import { AppError } from './AppError'

const TOKENS_PER_UNIT = 1000

const MODEL_PRICING = {
  'gpt-4o-mini': {
    provider:          'openai' as const,
    providerModelId:   'gpt-4o-mini',
    inputPer1kTokens:  '0.00000015',
    outputPer1kTokens: '0.0000006',
  },
  'gpt-4o': {
    provider:          'openai' as const,
    providerModelId:   'gpt-4o',
    inputPer1kTokens:  '0.000005',
    outputPer1kTokens: '0.000015',
  },
  'gpt-3.5-turbo': {
    provider:          'openai' as const,
    providerModelId:   'gpt-3.5-turbo',
    inputPer1kTokens:  '0.0000005',
    outputPer1kTokens: '0.0000015',
  },

  'llama-3.1-8b': {
    provider:          'groq' as const,
    providerModelId:   'llama-3.1-8b-instant',
    inputPer1kTokens:  '0.00000015',
    outputPer1kTokens: '0.0000006',
  },
  'llama-3.3-70b': {
    provider:          'groq' as const,
    providerModelId:   'llama-3.3-70b-versatile',
    inputPer1kTokens:  '0.000005',
    outputPer1kTokens: '0.000015',
  },
  'mixtral-8x7b': {
    provider:          'groq' as const,
    providerModelId:   'mixtral-8x7b-32768',
    inputPer1kTokens:  '0.0000005',
    outputPer1kTokens: '0.0000015',
  },
} as const

type SupportedModel = keyof typeof MODEL_PRICING

export function calculateCost(
  model:            SupportedModel,
  promptTokens:     number,
  completionTokens: number
): Decimal {
  if (!Number.isFinite(promptTokens) || promptTokens < 0) {
    throw new AppError('Invalid prompt token count', 400, 'INVALID_PROMPT_TOKENS')
  }
  if (!Number.isFinite(completionTokens) || completionTokens < 0) {
    throw new AppError('Invalid completion token count', 400, 'INVALID_COMPLETION_TOKENS')
  }

  const pricing = MODEL_PRICING[model]
  if (!pricing) {
    throw new AppError(`Model '${model}' is not supported`, 400, 'UNSUPPORTED_MODEL')
  }

  const inputCost = new Decimal(promptTokens)
    .div(TOKENS_PER_UNIT)
    .mul(new Decimal(pricing.inputPer1kTokens))

  const outputCost = new Decimal(completionTokens)
    .div(TOKENS_PER_UNIT)
    .mul(new Decimal(pricing.outputPer1kTokens))

  return inputCost.plus(outputCost)
}

export function getSupportedModels(): SupportedModel[] {
  return Object.keys(MODEL_PRICING) as SupportedModel[]
}

export function getProviderModel(model: SupportedModel): string {
  const pricing = MODEL_PRICING[model]
  if (!pricing) {
    throw new AppError(`Model '${model}' is not supported`, 400, 'UNSUPPORTED_MODEL')
  }
  return pricing.providerModelId
}

export function getProviderForModel(model: SupportedModel): 'openai' | 'groq' {
  const pricing = MODEL_PRICING[model]
  if (!pricing) {
    throw new AppError(`Model '${model}' is not supported`, 400, 'UNSUPPORTED_MODEL')
  }
  return pricing.provider
}