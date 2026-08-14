export type LimitsResponse = {
    daily: {
      limit: string
      spent: string
      remaining: string
      percentage: number
    }
    monthly: {
      limit: string
      spent: string
      remaining: string
      percentage: number
    }
}
  
export type UsageEvent = {
    id: string
    model: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    costUSD: string
    requestId: string
    createdAt: string
}
  
export type UsageEventsResponse = {
    events: UsageEvent[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
}
  
export type SummaryResponse = {
    daily: {
      costUSD: string
      totalTokens: number
      requests: number
      limit: string
      currentSpend: string
      remaining: string
      percentage: number
      isApproachingLimit: boolean
    }
    monthly: {
      costUSD: string
      totalTokens: number
      requests: number
      limit: string
      currentSpend: string
      remaining: string
      percentage: number
      isApproachingLimit: boolean
    }
}