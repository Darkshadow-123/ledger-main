import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { api } from '@/lib/api'
import type { UsageEventsResponse } from '@/types/api'

export const useEvents = (page = 1, limit = 20) => {
  const { isSignedIn, getToken } = useAuth()

  return useQuery<UsageEventsResponse>({
    queryKey: ['events', page, limit],
    enabled:  !!isSignedIn,
    queryFn:  async () => {
      const token = await getToken()
      const { data } = await api.get('/usage/events', {
        headers: { Authorization: `Bearer ${token}` },
        params:  { page, limit }
      })
      return data
    }
  })
}