import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { api } from '@/lib/api'
import type { SummaryResponse } from '@/types/api'

export const useSummary = () => {
  const { isSignedIn, getToken } = useAuth()

  return useQuery<SummaryResponse>({
    queryKey: ['summary'],
    enabled:  !!isSignedIn,
    queryFn:  async () => {
      const token = await getToken()
      const { data } = await api.get('/usage/summary', {
        headers: { Authorization: `Bearer ${token}` }
      })
      return data
    }
  })
}