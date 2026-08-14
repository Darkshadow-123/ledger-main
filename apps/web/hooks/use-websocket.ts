'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useQueryClient } from '@tanstack/react-query'

type WebSocketMessage = {
  type: 'USAGE_UPDATE' | 'ALERT_TRIGGERED'
  data: object
}

export const useWebSocket = () => {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelay = useRef(1000)
  const reconnectCount = useRef(0)
  const MAX_RECONNECTS = 5

  const connect = useCallback(async () => {
    if (reconnectCount.current >= MAX_RECONNECTS) {
      console.warn('[WS] Max reconnects reached — stopping')
      return
    }

    const token = await getToken()
    if (!token) return

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
    const wsUrl = apiUrl.replace(/^http/, 'ws')
    const ws = new WebSocket(`${wsUrl}?token=${token}`)

    ws.onopen = () => {
      console.log('[WS] Connected')
      reconnectDelay.current = 1000
      reconnectCount.current = 0
    }

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)

        if (message.type === 'USAGE_UPDATE') {
          queryClient.invalidateQueries({ queryKey: ['limits'] })
          queryClient.invalidateQueries({ queryKey: ['summary'] })
          queryClient.invalidateQueries({ queryKey: ['events'] })
        }

        if (message.type === 'ALERT_TRIGGERED') {
          queryClient.invalidateQueries({ queryKey: ['alerts'] })
        }
      } catch (error) {
        console.error('[WS] Failed to parse message:', error)
      }
    }

    ws.onclose = (event) => {
      console.log('[WS] Disconnected — code:', event.code, 'reason:', event.reason)

      if (event.code === 1008) {
        console.warn('[WS] Auth failed — not retrying')
        return
      }

      reconnectCount.current += 1
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000)
        connect()
      }, reconnectDelay.current)
    }

    ws.onerror = () => {
      ws.close()
    }

    wsRef.current = ws
  }, [getToken, queryClient])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])
}