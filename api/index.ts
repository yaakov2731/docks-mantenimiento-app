import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from '../server/routers'
import { createContext } from '../server/_core/trpc'
import botRouter from '../server/bot-api'
import roundsHttpRouter from '../server/rounds/http'
import { initDb, countUsers, createUser } from '../server/db'
import { readEnv } from '../server/_core/env'
import bcrypt from 'bcryptjs'

const allowedOrigin = readEnv('CLIENT_URL') ?? '*'

const app = express()
app.use(cors({ origin: allowedOrigin, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

// Initialize DB before handling any request
let initPromise: Promise<void> | null = null
function getInitPromise() {
  if (!initPromise) {
    initPromise = (async () => {
      await initDb()
      if (await countUsers() === 0) {
        const hash = await bcrypt.hash(readEnv('ADMIN_PASSWORD') ?? 'admin123', 10)
        await createUser({
          username: readEnv('ADMIN_USERNAME') ?? 'admin',
          password: hash,
          name: 'Administrador',
          role: 'admin',
        })
      }
    })().catch(err => {
      // Reset so next request retries
      initPromise = null
      throw err
    })
  }
  return initPromise
}

app.use(async (_req, _res, next) => {
  try {
    await getInitPromise()
    next()
  } catch (err) {
    next(err)
  }
})

app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }))
app.use('/api/bot', botRouter)
app.use('/api', roundsHttpRouter)
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

// Global error handler — returns JSON so client can parse it
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API ERROR]', err)
  res.status(500).json({
    error: true,
    message: err?.message ?? 'Internal server error',
  })
})

export default app
