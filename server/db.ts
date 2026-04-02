import { createClient } from '@libsql/client/web'
import { drizzle } from 'drizzle-orm/libsql'
import { eq, and, or, like } from 'drizzle-orm'
import * as schema from '../drizzle/schema'
import { readEnv } from './_core/env'

const TURSO_URL = readEnv('TURSO_URL')
const TURSO_TOKEN = readEnv('TURSO_TOKEN')

if (!TURSO_URL || !TURSO_TOKEN) {
  throw new Error('TURSO_URL and TURSO_TOKEN env vars are required')
}

const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
export const db = drizzle(client, { schema })

// --- Init tables ---
export async function initDb() {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS reportes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      locatario TEXT NOT NULL,
      local TEXT NOT NULL,
      planta TEXT NOT NULL,
      contacto TEXT,
      email_locatario TEXT,
      categoria TEXT NOT NULL,
      prioridad TEXT NOT NULL,
      titulo TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      fotos TEXT,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      email_enviado INTEGER NOT NULL DEFAULT 0,
      asignado_a TEXT,
      asignado_id INTEGER,
      completado_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS actualizaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporte_id INTEGER NOT NULL,
      usuario_id INTEGER,
      usuario_nombre TEXT NOT NULL,
      tipo TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      estado_anterior TEXT,
      estado_nuevo TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS empleados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT,
      telefono TEXT,
      especialidad TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS notificaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      nombre TEXT NOT NULL,
      destino TEXT NOT NULL,
      activo INTEGER NOT NULL DEFAULT 1,
      recibe_nuevos INTEGER NOT NULL DEFAULT 1,
      recibe_urgentes INTEGER NOT NULL DEFAULT 1,
      recibe_completados INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      telefono TEXT,
      email TEXT,
      wa_id TEXT,
      rubro TEXT,
      tipo_local TEXT,
      mensaje TEXT,
      turno_fecha TEXT,
      turno_hora TEXT,
      estado TEXT NOT NULL DEFAULT 'nuevo',
      notas TEXT,
      fuente TEXT NOT NULL DEFAULT 'web',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
  ]
  for (const sql of stmts) {
    await client.execute(sql)
  }
  console.log('[DB] Tables ready')
}

// --- USERS ---
export async function getUserByUsername(username: string) {
  const rows = await db.select().from(schema.users).where(eq(schema.users.username, username))
  return rows[0] ?? null
}
export async function createUser(data: { username: string; password: string; name: string; role?: 'admin' | 'employee' }) {
  await db.insert(schema.users).values(data).run()
}
export async function countUsers(): Promise<number> {
  const rows = await db.select().from(schema.users)
  return rows.length
}

// --- REPORTES ---
export async function crearReporte(data: typeof schema.reportes.$inferInsert): Promise<number> {
  const rows = await db.insert(schema.reportes).values(data).returning({ id: schema.reportes.id })
  return rows[0].id
}
export async function getReportes(filters?: { estado?: string; prioridad?: string; busqueda?: string }) {
  const conds: any[] = []
  if (filters?.estado) conds.push(eq(schema.reportes.estado, filters.estado as any))
  if (filters?.prioridad) conds.push(eq(schema.reportes.prioridad, filters.prioridad as any))
  if (filters?.busqueda) {
    conds.push(or(
      like(schema.reportes.titulo, `%${filters.busqueda}%`),
      like(schema.reportes.locatario, `%${filters.busqueda}%`),
      like(schema.reportes.local, `%${filters.busqueda}%`),
    ))
  }
  const q = db.select().from(schema.reportes)
  const rows: schema.Reporte[] = conds.length > 0
    ? await (q.where(and(...conds)) as any)
    : await q
  return rows.sort((a, b) => (b.createdAt as any) - (a.createdAt as any))
}
export async function getReporteById(id: number) {
  const rows = await db.select().from(schema.reportes).where(eq(schema.reportes.id, id))
  return rows[0] ?? null
}
export async function actualizarReporte(id: number, data: Partial<typeof schema.reportes.$inferInsert>) {
  await db.update(schema.reportes).set({ ...data, updatedAt: new Date() } as any).where(eq(schema.reportes.id, id)).run()
}
export async function getEstadisticas() {
  const all = await db.select().from(schema.reportes)
  const total = all.length
  const pendientes = all.filter(r => r.estado === 'pendiente').length
  const enProgreso = all.filter(r => r.estado === 'en_progreso').length
  const pausados = all.filter(r => r.estado === 'pausado').length
  const completados = all.filter(r => r.estado === 'completado').length
  const cancelados = all.filter(r => r.estado === 'cancelado').length
  const abiertos = pendientes + enProgreso + pausados
  const totalGestionable = total - cancelados
  return {
    total,
    abiertos,
    pendientes,
    enProgreso,
    pausados,
    completados,
    cancelados,
    urgentes: all.filter(r => r.prioridad === 'urgente' && !['completado', 'cancelado'].includes(r.estado)).length,
    tasaCompletitud: totalGestionable > 0 ? Math.round((completados / totalGestionable) * 100) : 0,
    porCategoria: ['electrico', 'plomeria', 'estructura', 'limpieza', 'seguridad', 'climatizacion', 'otro']
      .map(c => ({ categoria: c, count: all.filter(r => r.categoria === c && !['completado', 'cancelado'].includes(r.estado)).length })),
    porPrioridad: ['baja', 'media', 'alta', 'urgente']
      .map(p => ({ prioridad: p, count: all.filter(r => r.prioridad === p && !['completado', 'cancelado'].includes(r.estado)).length })),
  }
}

// --- ACTUALIZACIONES ---
export async function crearActualizacion(data: typeof schema.actualizaciones.$inferInsert) {
  await db.insert(schema.actualizaciones).values(data).run()
}
export async function getActualizacionesByReporte(reporteId: number) {
  const rows = await db.select().from(schema.actualizaciones).where(eq(schema.actualizaciones.reporteId, reporteId))
  return rows.sort((a, b) => (b.createdAt as any) - (a.createdAt as any))
}

// --- EMPLEADOS ---
export async function getEmpleados() {
  return db.select().from(schema.empleados).where(eq(schema.empleados.activo, true))
}
export async function crearEmpleado(data: typeof schema.empleados.$inferInsert) {
  await db.insert(schema.empleados).values(data).run()
}
export async function actualizarEmpleado(id: number, data: Partial<typeof schema.empleados.$inferInsert>) {
  await db.update(schema.empleados).set(data as any).where(eq(schema.empleados.id, id)).run()
}

// --- NOTIFICACIONES ---
export async function getNotificaciones() {
  return db.select().from(schema.notificaciones)
}
export async function crearNotificacion(data: typeof schema.notificaciones.$inferInsert) {
  await db.insert(schema.notificaciones).values(data).run()
}
export async function actualizarNotificacion(id: number, data: Partial<typeof schema.notificaciones.$inferInsert>) {
  await db.update(schema.notificaciones).set(data as any).where(eq(schema.notificaciones.id, id)).run()
}
export async function eliminarNotificacion(id: number) {
  await db.delete(schema.notificaciones).where(eq(schema.notificaciones.id, id)).run()
}

// --- LEADS ---
export async function crearLead(data: typeof schema.leads.$inferInsert): Promise<number> {
  const rows = await db.insert(schema.leads).values(data).returning({ id: schema.leads.id })
  return rows[0].id
}
export async function getLeads(filters?: { estado?: string }) {
  const q = db.select().from(schema.leads)
  const rows: schema.Lead[] = filters?.estado
    ? await (q.where(eq(schema.leads.estado, filters.estado as any)) as any)
    : await q
  return rows.sort((a, b) => (b.createdAt as any) - (a.createdAt as any))
}
export async function getLeadById(id: number) {
  const rows = await db.select().from(schema.leads).where(eq(schema.leads.id, id))
  return rows[0] ?? null
}
export async function actualizarLead(id: number, data: Partial<typeof schema.leads.$inferInsert>) {
  await db.update(schema.leads).set({ ...data, updatedAt: new Date() } as any).where(eq(schema.leads.id, id)).run()
}
