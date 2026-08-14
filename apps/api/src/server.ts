import http from 'http'
import app from './app'
import { env } from './config/env'
import { connectRedis } from './config/redis'
import { initWebSocketServer } from './websocket/socket.server'
import { initSubscriber, closePubSub } from './redis/pubsub'
import './workers/usage.worker'
import './workers/alert.worker'

const startServer = async (): Promise<void> => {
  await connectRedis()
  await initSubscriber()

  const server = http.createServer(app)

  initWebSocketServer(server)

  server.listen(env.PORT, () => {
    console.log(`[Server] Running on port ${env.PORT}`)
  })

  const shutdown = async (): Promise<void> => {
    console.log('[Server] Shutting down...')
    server.close(async () => {
      await closePubSub()
      console.log('[Server] Shutdown complete')
      process.exit(0)
    })
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT',  shutdown)
}

startServer()