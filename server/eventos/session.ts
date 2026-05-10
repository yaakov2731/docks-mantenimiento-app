import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { eq } from 'drizzle-orm'
import * as schema from '../../drizzle/schema'
import { readEnv } from '../_core/env'

const client = createClient({ url: readEnv('TURSO_URL')!, authToken: readEnv('TURSO_TOKEN')! })
const db = drizzle(client, { schema })

export type EventosMenuContext = {
  step?: string
  nombre?: string
  tipoEvento?: string
  fechaEstimada?: string
  cantidadInvitados?: string
  presupuesto?: string
  serviciosExtra?: string[]
  seguimiento?: string
  contactoExtra?: string
  pendingText?: boolean
  pendingField?: string
  seguimientoIntent?: string
  [key: string]: unknown
}

export type EventosSession = {
  id: number
  waNumber: string
  userName: string
  currentMenu: string
  contextData: EventosMenuContext
  menuHistory: string[]
  lastActivityAt: Date
  createdAt: Date
}

const SESSION_TIMEOUT_MS = 15 * 60 * 1000

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try { return JSON.parse(value) as T } catch { return fallback }
}

function toSession(row: typeof schema.botEventosSession.$inferSelect): EventosSession {
  return {
    id: row.id,
    waNumber: row.waNumber,
    userName: row.userName,
    currentMenu: row.currentMenu,
    contextData: parseJson<EventosMenuContext>(row.contextData ?? null, {}),
    menuHistory: parseJson<string[]>(row.menuHistory ?? null, []),
    lastActivityAt: row.lastActivityAt,
    createdAt: row.createdAt,
  }
}

export async function getSession(waNumber: string): Promise<EventosSession | null> {
  const [row] = await db.select().from(schema.botEventosSession)
    .where(eq(schema.botEventosSession.waNumber, waNumber))
  return row ? toSession(row) : null
}

export async function createSession(waNumber: string): Promise<EventosSession> {
  try {
    await db.insert(schema.botEventosSession).values({
      waNumber,
      userName: 'Visitante',
      currentMenu: 'main',
      contextData: '{}',
      menuHistory: '[]',
      lastActivityAt: new Date(),
      createdAt: new Date(),
    } as any).run()
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error ?? '')
    if (!msg.includes('UNIQUE constraint failed')) throw error
  }
  return (await getSession(waNumber))!
}

export async function updateSession(
  waNumber: string,
  updates: Partial<{
    currentMenu: string
    contextData: EventosMenuContext
    menuHistory: string[]
    userName: string
  }>
): Promise<void> {
  const toSet: Record<string, unknown> = { lastActivityAt: new Date() }
  if (updates.currentMenu !== undefined) toSet.currentMenu = updates.currentMenu
  if (updates.contextData !== undefined) toSet.contextData = JSON.stringify(updates.contextData)
  if (updates.menuHistory !== undefined) toSet.menuHistory = JSON.stringify(updates.menuHistory)
  if (updates.userName !== undefined) toSet.userName = updates.userName
  await db.update(schema.botEventosSession).set(toSet as any)
    .where(eq(schema.botEventosSession.waNumber, waNumber)).run()
}

export async function navigateTo(
  session: EventosSession,
  menu: string,
  context?: Partial<EventosMenuContext>
): Promise<EventosSession> {
  const newHistory = [...session.menuHistory, session.currentMenu].slice(-10)
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

export async function navigateBack(session: EventosSession): Promise<{ session: EventosSession; previousMenu: string }> {
  const history = [...session.menuHistory]
  const previousMenu = history.pop() ?? 'main'
  await updateSession(session.waNumber, {
    currentMenu: previousMenu,
    menuHistory: history,
  })
  return {
    session: { ...session, currentMenu: previousMenu, menuHistory: history },
    previousMenu,
  }
}

export async function resetToMain(session: EventosSession): Promise<EventosSession> {
  await updateSession(session.waNumber, {
    currentMenu: 'main',
    contextData: {},
    menuHistory: [],
  })
  return { ...session, currentMenu: 'main', contextData: {}, menuHistory: [] }
}

export function isSessionExpired(session: EventosSession): boolean {
  return Date.now() - session.lastActivityAt.getTime() > SESSION_TIMEOUT_MS
}

export async function deleteSession(waNumber: string): Promise<void> {
  await db.delete(schema.botEventosSession).where(eq(schema.botEventosSession.waNumber, waNumber)).run()
}
