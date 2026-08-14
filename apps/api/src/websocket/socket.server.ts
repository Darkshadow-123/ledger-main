import { IncomingMessage, Server } from 'http'
import { verifyToken } from '@clerk/backend'
import {
  WebSocket,
  WebSocketServer
} from 'ws'

import { env } from '../config/env'

import {
  addConnection,
  AuthenticatedWebSocket,
  removeConnection
} from './socket.rooms'

export let wss: WebSocketServer

const HEARTBEAT_INTERVAL_MS = 30_000

const authenticateSocket = async (
  req: IncomingMessage
): Promise<string> => {
  const url = new URL(
    req.url ?? '',
    'http://localhost'
  )

  const token =
    url.searchParams.get('token')

  if (!token) {
    throw new Error('Missing token')
  }

  const payload = await verifyToken(token, {
    secretKey: env.CLERK_SECRET_KEY,
    authorizedParties: ['http://localhost:3000']
  })

  return payload.sub
}

const cleanupConnection = (
  ws: AuthenticatedWebSocket
): void => {
  removeConnection(ws.userId, ws)
}

export const initWebSocketServer = (
  server: Server
): void => {
  wss = new WebSocketServer({ server })

  console.log(
    '[WS] WebSocket server initialized'
  )

  wss.on(
    'connection',
    async (
      ws: AuthenticatedWebSocket,
      req: IncomingMessage
    ) => {
      try {
        ws.userId = await authenticateSocket(req)
        ws.isAlive = true
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Authentication failed'

        ws.close(1008, message)
        return
      }

      addConnection(ws.userId, ws)

      console.log(
        `[WS] User connected: ${ws.userId}`
      )

      ws.on('pong', () => {
        ws.isAlive = true
      })

      ws.on('close', () => {
        cleanupConnection(ws)

        console.log(
          `[WS] User disconnected: ${ws.userId}`
        )
      })

      ws.on('error', error => {
        console.error(
          `[WS] Error for user ${ws.userId}:`,
          error.message
        )

        cleanupConnection(ws)
      })
    }
  )

  const heartbeat = setInterval(() => {
    wss.clients.forEach(client => {
      const ws =
        client as AuthenticatedWebSocket

      if (ws.isAlive === false) {
        ws.terminate()
        return
      }

      ws.isAlive = false
      ws.ping()
    })
  }, HEARTBEAT_INTERVAL_MS)

  wss.on('close', () => {
    clearInterval(heartbeat)
  })
}