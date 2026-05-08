import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './routers'
import { createContext } from './_core/trpc'
import { initDb, countUsers, createUser } from './db'
import botRouter from './bot-api'
import roundsHttpRouter from './rounds/http'
import leadsHttpRouter from './leads/http'
import { readEnv } from './_core/env'
import bcrypt from 'bcryptjs'
import path from 'path'
import fs from 'fs'

const app = express()
const PORT = process.env.PORT ?? 3001
const isProd = process.env.NODE_ENV === 'production'

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Vite assets tienen hashes dinámicos
  crossOriginEmbedderPolicy: false,
}))

// CORS — solo permite el origen configurado; en dev permite localhost
const allowedOrigin = readEnv('CLIENT_URL') ?? (isProd ? false : 'http://localhost:5173')
app.use(cors({ origin: allowedOrigin, credentials: true }))

// Body limit reducido — los mensajes del bot nunca necesitan 10mb
app.use(express.json({ limit: '10kb' }))
app.use(cookieParser())

// Rate limiting — bot API: 120 req/min por IP (el bot hace polling, no explosiones)
const botRateLimit = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
})

// Rate limiting — endpoints de login/trpc: 30 req/min por IP
const authRateLimit = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
})

app.use('/api/bot', botRateLimit, botRouter)
app.use('/trpc', authRateLimit, createExpressMiddleware({ router: appRouter, createContext }))
app.use('/api', roundsHttpRouter)
app.use('/api', leadsHttpRouter)
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// Serve static client (production build)
const clientDist = path.join(process.cwd(), 'dist/client')
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')))
}

// Error handler — no exponer detalles en producción
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server ERROR]', err)
  const message = isProd ? 'Internal server error' : (err?.message ?? 'Internal server error')
  res.status(500).json({ error: true, message })
})

app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`)
  console.log(`[tRPC]    http://localhost:${PORT}/trpc`)
  console.log(`[Bot API] http://localhost:${PORT}/api/bot`)
})

;(async () => {
  await initDb()
  if (await countUsers() === 0) {
    const username = readEnv('ADMIN_USERNAME') ?? 'admin'
    const password = readEnv('ADMIN_PASSWORD') ?? 'admin123'
    if (!readEnv('ADMIN_USERNAME') || !readEnv('ADMIN_PASSWORD')) {
      console.warn('[Server] ⚠️  ADVERTENCIA: Usando credenciales de admin por defecto. Configura ADMIN_USERNAME y ADMIN_PASSWORD en producción.')
    }
    const hash = await bcrypt.hash(password, 10)
    await createUser({ username, password: hash, name: 'Administrador', role: 'admin' })
    console.log(`[Server] Admin creado: ${username}`)
  }
})()
