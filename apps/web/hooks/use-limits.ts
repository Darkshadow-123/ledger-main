import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { api } from '@/lib/api'
import type { LimitsResponse } from '@/types/api'

export const useLimits = () => {
  const { isSignedIn, getToken } = useAuth()

  return useQuery<LimitsResponse>({
    queryKey: ['limits'],
    enabled:  !!isSignedIn,
    queryFn:  async () => {
      const token = await getToken()
      const { data } = await api.get('/limits', {
        headers: { Authorization: `Bearer ${token}` }
      })
      return data
    }
  })
}