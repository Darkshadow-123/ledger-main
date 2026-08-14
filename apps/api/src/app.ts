import express from 'express'
import { requestId } from './middleware/requestId'
import { errorHandler } from './middleware/errorHandler'
import authRouter from './modules/auth/auth.routes'
import proxyRouter from './modules/proxy/proxy.routes'
import limitsRouter from './modules/limits/limits.routes'
import usageRouter from './modules/usage/usage.routes'
import adminRouter from './modules/admin/admin.routes'
import alertsRouter from './modules/alerts/alerts.routes'
import { prisma } from './config/prisma'
import { redis } from './config/redis'
import cors from 'cors'

const app = express()

app.use(cors({
  origin: [
    'http://localhost:3000',
    process.env.FRONTEND_URL ?? ''
  ].filter(Boolean),
  credentials: true
}))

app.use(requestId)

app.use('/auth', authRouter)

app.use(express.json())

app.use('/proxy',  proxyRouter)
app.use('/limits', limitsRouter)
app.use('/usage',  usageRouter)
app.use('/admin',  adminRouter)
app.use('/alerts', alertsRouter)

app.get('/health', async (req, res) => {
  try {
    await redis.ping()
    await prisma.$queryRaw`SELECT 1`
    res.json({
      status: 'ok',
      redis:  'ok',
      db:     'ok',
      uptime: process.uptime()
    })
  } catch {
    res.status(500).json({
      status: 'error',
      redis:  'unavailable',
      db:     'unavailable',
      uptime: process.uptime()
    })
  }
})

app.use(errorHandler)

export default app