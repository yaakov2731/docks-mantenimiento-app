import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './routers'
import { createContext } from './_core/trpc'
import { initDb, countUsers, createUser } from './db'
import botRouter from './bot-api'
import roundsHttpRouter from './rounds/http'
import { readEnv } from './_core/env'
import bcrypt from 'bcryptjs'
import path from 'path'
import fs from 'fs'

const app = express()
const PORT = process.env.PORT ?? 3001

const allowedOrigin = readEnv('CLIENT_URL') ?? '*'
app.use(cors({ origin: allowedOrigin, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }))
app.use('/api/bot', botRouter)
app.use('/api', roundsHttpRouter)
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// Serve static client (production build)
const clientDist = path.join(process.cwd(), 'dist/client')
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')))
}

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server ERROR]', err)
  res.status(500).json({ error: true, message: err?.message ?? 'Internal server error' })
})

// Start listening immediately so Railway healthcheck passes,
// then initialize DB in the background
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
