import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './routers'
import { createContext } from './_core/trpc'
import { initDb, countUsers, createUser } from './db'
import botRouter from './bot-api'
import { readEnv } from './_core/env'
import bcrypt from 'bcryptjs'
import path from 'path'

const app = express()
const PORT = process.env.PORT ?? 3001

const allowedOrigin = process.env.CLIENT_URL ?? 'http://localhost:5173'
app.use(cors({ origin: allowedOrigin, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

// tRPC
app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }))

// Bot REST API
app.use('/api/bot', botRouter)

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// Serve static client in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(process.cwd(), 'dist/client')
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')))
}

;(async () => {
  await initDb()
  if (await countUsers() === 0) {
    const username = readEnv('ADMIN_USERNAME') ?? 'admin'
    const password = readEnv('ADMIN_PASSWORD') ?? 'admin123'
    const hash = await bcrypt.hash(password, 10)
    await createUser({ username, password: hash, name: 'Administrador', role: 'admin' })
    console.log(`[Server] Admin creado: ${username}`)
  }
  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`)
    console.log(`[tRPC]   http://localhost:${PORT}/trpc`)
    console.log(`[Bot API] http://localhost:${PORT}/api/bot`)
  })
})()
