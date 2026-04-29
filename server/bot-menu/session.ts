/**
 * CRUD de sesiones de conversación — bot_session
 * Cada número de WhatsApp tiene una sesión activa con su menú actual y contexto.
 */
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { eq } from 'drizzle-orm'
import * as schema from '../../drizzle/schema'
import { readEnv } from '../_core/env'

const client = createClient({ url: readEnv('TURSO_URL')!, authToken: readEnv('TURSO_TOKEN')! })
const db = drizzle(client, { schema })

export type UserType = 'employee' | 'admin' | 'sales' | 'public'

export type MenuContext = {
  tareaId?: number
  rondaId?: number
  reporteId?: number
  empleadoId?: number
  leadId?: number
  page?: number
  step?: string
  motivo?: string
  pendingText?: boolean   // true cuando el siguiente mensaje es texto libre
  pendingField?: string   // campo que se va a llenar con texto libre
  [key: string]: unknown
}

export type BotSession = {
  id: number
  waNumber: string
  userType: UserType
  userId: number
  userName: string
  currentMenu: string
  contextData: MenuContext
  menuHistory: string[]
  lastActivityAt: Date
  createdAt: Date
}

/** Timeout de sesión: 10 minutos */
const SESSION_TIMEOUT_MS = 10 * 60 * 1000

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try { return JSON.parse(value) as T } catch { return fallback }
}

function toSession(row: typeof schema.botSession.$inferSelect): BotSession {
  return {
    id: row.id,
    waNumber: row.waNumber,
    userType: row.userType as UserType,
    userId: row.userId,
    userName: row.userName,
    currentMenu: row.currentMenu,
    contextData: parseJson<MenuContext>(row.contextData ?? null, {}),
    menuHistory: parseJson<string[]>(row.menuHistory ?? null, []),
    lastActivityAt: row.lastActivityAt,
    createdAt: row.createdAt,
  }
}

/** Obtiene la sesión activa. Devuelve null si no existe. */
export async function getSession(waNumber: string): Promise<BotSession | null> {
  const [row] = await db.select().from(schema.botSession)
    .where(eq(schema.botSession.waNumber, waNumber))
  return row ? toSession(row) : null
}

/** Crea una sesión nueva para el usuario. */
export async function createSession(params: {
  waNumber: string
  userType: UserType
  userId: number
  userName: string
}): Promise<BotSession> {
  await db.insert(schema.botSession).values({
    waNumber: params.waNumber,
    userType: params.userType,
    userId: params.userId,
    userName: params.userName,
    currentMenu: 'main',
    contextData: '{}',
    menuHistory: '[]',
    lastActivityAt: new Date(),
    createdAt: new Date(),
  } as any).run()
  const session = await getSession(params.waNumber)
  return session!
}

/** Actualiza el menú actual y el contexto. */
export async function updateSession(
  waNumber: string,
  updates: Partial<{
    currentMenu: string
    contextData: MenuContext
    menuHistory: string[]
    lastActivityAt: Date
  }>
): Promise<void> {
  const toSet: Record<string, unknown> = { lastActivityAt: new Date() }
  if (updates.currentMenu !== undefined) toSet.currentMenu = updates.currentMenu
  if (updates.contextData !== undefined) toSet.contextData = JSON.stringify(updates.contextData)
  if (updates.menuHistory !== undefined) toSet.menuHistory = JSON.stringify(updates.menuHistory)
  if (updates.lastActivityAt !== undefined) toSet.lastActivityAt = updates.lastActivityAt
  await db.update(schema.botSession).set(toSet as any)
    .where(eq(schema.botSession.waNumber, waNumber)).run()
}

/** Navega a un nuevo menú, guardando el actual en el historial. */
export async function navigateTo(
  session: BotSession,
  menu: string,
  context?: Partial<MenuContext>
): Promise<BotSession> {
  const newHistory = [...session.menuHistory, session.currentMenu].slice(-10) // máx 10 niveles
  const newContext = context !== undefined
    ? { ...session.contextData, ...context }
    : session.contextData
  await updateSession(session.waNumber, {
    currentMenu: menu,
    contextData: newContext,
    menuHistory: newHistory,
  })
  return { ...session, currentMenu: menu, contextData: newContext, menuHistory: newHistory }
}

/** Vuelve al menú anterior (pop del historial). */
export async function navigateBack(session: BotSession): Promise<{ session: BotSession; previousMenu: string }> {
  const history = [...session.menuHistory]
  const previousMenu = history.pop() ?? 'main'
  await updateSession(session.waNumber, {
    currentMenu: previousMenu,
    menuHistory: history,
    contextData: session.contextData,
  })
  return {
    session: { ...session, currentMenu: previousMenu, menuHistory: history, contextData: session.contextData },
    previousMenu,
  }
}

/** Resetea la sesión al menú principal. */
export async function resetToMain(session: BotSession): Promise<BotSession> {
  await updateSession(session.waNumber, {
    currentMenu: 'main',
    contextData: {},
    menuHistory: [],
  })
  return { ...session, currentMenu: 'main', contextData: {}, menuHistory: [] }
}

/** Verifica si la sesión expiró por inactividad. */
export function isSessionExpired(session: BotSession): boolean {
  return Date.now() - session.lastActivityAt.getTime() > SESSION_TIMEOUT_MS
}

/** Elimina la sesión (para forzar re-identificación). */
export async function deleteSession(waNumber: string): Promise<void> {
  await db.delete(schema.botSession).where(eq(schema.botSession.waNumber, waNumber)).run()
}
