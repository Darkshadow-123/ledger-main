import OpenAI from 'openai'
import { env } from '../config/env'
import { AppError } from './AppError'
import { getProviderModel, getProviderForModel } from './pricing'

const providerConfig = {
  openai: {
    apiKey:  env.OPENAI_API_KEY,
    baseURL: undefined,
  },
  groq: {
    apiKey:  env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  },
} as const

export type Message = {
  role:    'user' | 'assistant' | 'system'
  content: string
}

export interface OpenAIResponse {
  content: string
  usage: {
    promptTokens:     number
    completionTokens: number
    totalTokens:      number
  }
}

export async function callOpenAI(
  model:      string,
  messages:   Message[],
  requestId?: string
): Promise<OpenAIResponse> {
  try {

    const provider = getProviderForModel(model as any)
    const config   = providerConfig[provider]

    const client = new OpenAI({
      apiKey:  config.apiKey,
      baseURL: config.baseURL,
      timeout: 10000,
    })

    const response = await client.chat.completions.create(
      {
        model:    getProviderModel(model as any),
        messages,
      },
      {
        headers: requestId
          ? { 'x-request-id': requestId }
          : undefined,
      }
    )

    const choice = response.choices?.[0]
    if (!choice?.message?.content) {
      throw new AppError(
        'Empty response from AI provider',
        500,
        'AI_EMPTY_RESPONSE'
      )
    }

    const usage = response.usage
    if (!usage) {
      throw new AppError(
        'Missing usage data from AI provider',
        500,
        'AI_MISSING_USAGE'
      )
    }

    return {
      content: choice.message.content,
      usage: {
        promptTokens:     usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens:      usage.total_tokens,
      },
    }
  } catch (error: any) {
    console.error('[AI Provider Error]', {
      status:   error?.status,
      message:  error?.message,
      response: error?.response?.data,
      cause:    error,
    })

    if (error instanceof AppError) throw error

    if (error?.status === 429) {
      throw new AppError('AI provider rate limit exceeded', 429, 'AI_RATE_LIMIT')
    }
    if (error?.status === 401) {
      throw new AppError('Invalid AI provider API key', 401, 'AI_INVALID_KEY')
    }
    if (error?.status === 400) {
      throw new AppError('Invalid AI provider request', 400, 'AI_BAD_REQUEST')
    }

    throw new AppError(
      `AI provider request failed: ${error?.message || 'unknown error'}`,
      500,
      'AI_ERROR'
    )
  }
}