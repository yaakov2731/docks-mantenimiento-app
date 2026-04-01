import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import session from 'express-session'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './routers'
import { createContext } from './_core/trpc'
import { initDb, countUsers, createUser } from './db'
import bcrypt from 'bcryptjs'
import botRouter from './bot-api'
import path from 'path'
import { COOKIE_NAME } from '../shared/const'

const app = express()
const PORT = process.env.PORT ?? 3001

// Middleware
const allowedOrigin = process.env.CLIENT_URL ?? 'http://localhost:5173'
app.use(cors({ origin: allowedOrigin, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(session({
  name: COOKIE_NAME,
  secret: process.env.SESSION_SECRET ?? 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 },
}))

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
  // Auto-seed admin if no users exist
  if (await countUsers() === 0) {
    const username = process.env.ADMIN_USERNAME ?? 'admin'
    const password = process.env.ADMIN_PASSWORD ?? 'admin123'
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
