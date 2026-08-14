import { QueryClient } from '@tanstack/react-query'

let client: QueryClient | null = null

export const getQueryClient = () => {
  if (!client) {
    client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          retry: 1,
          refetchOnWindowFocus: false
        }
      }
    })
  }
  return client
}

export const queryClient = getQueryClient()