import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './routers'
import { createContext } from './_core/trpc'
import botRouter from './bot-api'
import roundsHttpRouter from './rounds/http'

const allowedOrigin = process.env.CLIENT_URL ?? 'http://localhost:5173'

const app = express()
app.use(cors({ origin: allowedOrigin, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }))
app.use('/api/bot', botRouter)
app.use('/api', roundsHttpRouter)
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

export default app
