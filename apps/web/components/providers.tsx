'use client'
import { ClerkProvider } from '@clerk/nextjs'
import { QueryClientProvider } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/queryClient'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { setAuthToken } from '@/lib/api'
import { Toaster } from 'sonner'
import type { Appearance } from '@clerk/types'

const AuthSync = ({ children }: { children: React.ReactNode }) => {
  const { getToken } = useAuth()
  useEffect(() => {
    const syncToken = async () => {
      const token = await getToken()
      setAuthToken(token)
    }
    syncToken()
  }, [getToken])
  return <>{children}</>
}

export const Providers = ({ 
  children,
  appearance
}: { 
  children: React.ReactNode
  appearance: Appearance
}) => {
  const [mounted, setMounted] = useState(false)
  const [client] = useState(() => getQueryClient())

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <ClerkProvider appearance={appearance}>
      <QueryClientProvider client={client}>
        {mounted ? (
          <AuthSync>
            {children}
            <Toaster position="top-right" richColors />
          </AuthSync>
        ) : (
          <>
            {children}
            <Toaster position="top-right" richColors />
          </>
        )}
      </QueryClientProvider>
    </ClerkProvider>
  )
}