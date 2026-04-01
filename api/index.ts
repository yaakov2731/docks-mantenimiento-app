import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from '../server/routers'
import { createContext } from '../server/_core/trpc'
import botRouter from '../server/bot-api'
import { initDb, countUsers, createUser } from '../server/db'
import bcrypt from 'bcryptjs'

const app = express()
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }))
app.use('/api/bot', botRouter)
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

let ready = false
app.use(async (_req, _res, next) => {
  if (!ready) {
    await initDb()
    if (await countUsers() === 0) {
      const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD ?? 'admin123', 10)
      await createUser({
        username: process.env.ADMIN_USERNAME ?? 'admin',
        password: hash,
        name: 'Administrador',
        role: 'admin',
      })
    }
    ready = true
  }
  next()
})

export default app
