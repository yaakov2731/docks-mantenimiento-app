import { initTRPC, TRPCError } from '@trpc/server'
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import jwt from 'jsonwebtoken'
import { readEnv } from './env'

const JWT_SECRET = readEnv('SESSION_SECRET') ?? 'dev-secret-change-me'
export const JWT_COOKIE = 'docks_token'

export type SessionUser = {
  id: number
  username: string
  name: string
  role: 'admin' | 'employee' | 'sales' | 'collections'
}

export function createContext({ req, res }: CreateExpressContextOptions) {
  let user: SessionUser | null = null
  const token = req.cookies?.[JWT_COOKIE]
  if (token) {
    try {
      user = jwt.verify(token, JWT_SECRET) as SessionUser
    } catch {}
  }
  return { req, res, user }
}

export type Context = ReturnType<typeof createContext>

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, user: ctx.user as NonNullable<typeof ctx.user> } })
})
