import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma/client"
import { env } from "./env"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL })
  })

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export const connectDatabase = async (retries = 5, delayMs = 2000): Promise<void> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`
      console.log('[Database] Connected and ready')
      return
    } catch (error: any) {
      console.warn(`[Database] Database starting up (attempt ${attempt}/${retries})...`)
      if (attempt === retries) {
        console.error('[Database] Failed to connect after retries:', error.message)
        throw error
      }
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
}