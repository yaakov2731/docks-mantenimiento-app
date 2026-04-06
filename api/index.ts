import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import cookieParser from 'cookie-parser'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from '../server/routers'
import { createContext } from '../server/_core/trpc'
import botRouter from '../server/bot-api'
import { initDb, countUsers, createUser } from '../server/db'
import { readEnv } from '../server/_core/env'
import bcrypt from 'bcryptjs'

const app = express()
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

// Initialize DB before handling any request
let initPromise: Promise<void> | null = null
function getInitPromise() {
  if (!initPromise) {
    initPromise = (async () => {
      await initDb()
      if (await countUsers() === 0) {
        const username = readEnv('ADMIN_USERNAME') ?? 'admin'
        const password = readEnv('ADMIN_PASSWORD') ?? 'admin123'
        if (!readEnv('ADMIN_USERNAME') || !readEnv('ADMIN_PASSWORD')) {
          console.warn('[API] ⚠️  ADVERTENCIA: Usando credenciales de admin por defecto. Configura ADMIN_USERNAME y ADMIN_PASSWORD en producción.')
        }
        const hash = await bcrypt.hash(password, 10)
        await createUser({ username, password: hash, name: 'Administrador', role: 'admin' })
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
