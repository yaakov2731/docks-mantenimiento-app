import { createClient } from '@libsql/client/web'
import { drizzle } from 'drizzle-orm/libsql'
import { eq, and, or, like } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
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
      wa_id TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
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
      asignacion_estado TEXT NOT NULL DEFAULT 'sin_asignar',
      email_enviado INTEGER NOT NULL DEFAULT 0,
      asignado_a TEXT,
      asignado_id INTEGER,
      asignacion_respondida_at INTEGER,
      trabajo_iniciado_at INTEGER,
      trabajo_acumulado_segundos INTEGER NOT NULL DEFAULT 0,
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
      wa_id TEXT,
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
    `CREATE TABLE IF NOT EXISTS bot_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wa_number TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
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
      asignado_a TEXT,
      asignado_id INTEGER,
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
  const alterStmts = [
    `ALTER TABLE users ADD COLUMN activo INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE users ADD COLUMN wa_id TEXT`,
    `ALTER TABLE reportes ADD COLUMN trabajo_iniciado_at INTEGER`,
    `ALTER TABLE reportes ADD COLUMN trabajo_acumulado_segundos INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE reportes ADD COLUMN asignacion_estado TEXT NOT NULL DEFAULT 'sin_asignar'`,
    `ALTER TABLE reportes ADD COLUMN asignacion_respondida_at INTEGER`,
    `ALTER TABLE leads ADD COLUMN asignado_a TEXT`,
    `ALTER TABLE leads ADD COLUMN asignado_id INTEGER`,
  ]
  for (const sql of alterStmts) {
    try {
      await client.execute(sql)
    } catch (_error) {
      // Column already exists in upgraded databases.
    }
  }
  console.log('[DB] Tables ready')
}

// --- USERS ---
export async function getUserByUsername(username: string) {
  const rows = await db.select().from(schema.users).where(eq(schema.users.username, username))
  const active = rows.find(user => user.activo !== false)
  return active ?? null
}
export async function getUsers() {
  const rows = await db.select().from(schema.users)
  return rows
    .filter(user => user.activo !== false)
    .sort((a, b) => a.name.localeCompare(b.name))
}
export async function getSalesUsers() {
  const rows = await getUsers()
  return rows.filter(user => user.role === 'sales' || user.role === 'admin')
}
export async function getUserById(id: number) {
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, id))
  return rows[0] ?? null
}
export async function createUser(data: { username: string; password: string; name: string; role?: 'admin' | 'employee' | 'sales'; waId?: string }) {
  await db.insert(schema.users).values(data).run()
}
export async function createPanelUser(data: { username: string; password: string; name: string; role: 'admin' | 'sales'; waId?: string }) {
  const hash = await bcrypt.hash(data.password, 10)
  await db.insert(schema.users).values({
    username: data.username,
    password: hash,
    name: data.name,
    role: data.role,
    waId: normalizeWaNumber(data.waId) || null,
    activo: true,
  }).run()
}
export async function updateUserPassword(id: number, newPassword: string) {
  const hash = await bcrypt.hash(newPassword, 10)
  await db.update(schema.users).set({ password: hash } as any).where(eq(schema.users.id, id)).run()
}
export async function deactivateUser(id: number) {
  await db.update(schema.users).set({ activo: false } as any).where(eq(schema.users.id, id)).run()
}
export async function updateUserWhatsapp(id: number, waId?: string) {
  await db.update(schema.users).set({ waId: normalizeWaNumber(waId) || null } as any).where(eq(schema.users.id, id)).run()
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
  return rows
    .map(r => ({ ...r, tiempoTrabajadoSegundos: getReporteTiempoTrabajadoSegundos(r) }))
    .sort((a, b) => (b.createdAt as any) - (a.createdAt as any))
}
export async function getReporteById(id: number) {
  const rows = await db.select().from(schema.reportes).where(eq(schema.reportes.id, id))
  const reporte = rows[0] ?? null
  return reporte ? { ...reporte, tiempoTrabajadoSegundos: getReporteTiempoTrabajadoSegundos(reporte) } : null
}
export async function actualizarReporte(id: number, data: Partial<typeof schema.reportes.$inferInsert>) {
  await db.update(schema.reportes).set({ ...data, updatedAt: new Date() } as any).where(eq(schema.reportes.id, id)).run()
}
export function getReporteTiempoTrabajadoSegundos(reporte: any) {
  const acumulado = Number(reporte.trabajoAcumuladoSegundos ?? 0)
  if (!reporte.trabajoIniciadoAt) return acumulado
  const iniciadoAt = new Date(reporte.trabajoIniciadoAt).getTime()
  const adicional = Math.max(0, Math.floor((Date.now() - iniciadoAt) / 1000))
  return acumulado + adicional
}
export async function iniciarTrabajoReporte(id: number) {
  const reporte = await getReporteById(id)
  if (!reporte) return null
  if (reporte.estado === 'completado' || reporte.estado === 'cancelado') return reporte
  if (reporte.trabajoIniciadoAt) {
    if (reporte.estado !== 'en_progreso') {
      await actualizarReporte(id, {
        estado: 'en_progreso',
        asignacionEstado: reporte.asignadoId ? 'aceptada' : reporte.asignacionEstado,
        asignacionRespondidaAt: reporte.asignadoId && !reporte.asignacionRespondidaAt ? new Date() : reporte.asignacionRespondidaAt,
      })
    }
    return getReporteById(id)
  }
  await actualizarReporte(id, {
    estado: 'en_progreso',
    trabajoIniciadoAt: new Date(),
    asignacionEstado: reporte.asignadoId ? 'aceptada' : reporte.asignacionEstado,
    asignacionRespondidaAt: reporte.asignadoId && !reporte.asignacionRespondidaAt ? new Date() : reporte.asignacionRespondidaAt,
  })
  return getReporteById(id)
}
export async function pausarTrabajoReporte(id: number) {
  const reporte = await getReporteById(id)
  if (!reporte) return null
  const acumulado = getReporteTiempoTrabajadoSegundos(reporte)
  await actualizarReporte(id, {
    estado: 'pausado',
    trabajoIniciadoAt: null as any,
    trabajoAcumuladoSegundos: acumulado,
  })
  return getReporteById(id)
}
export async function completarTrabajoReporte(id: number) {
  const reporte = await getReporteById(id)
  if (!reporte) return null
  const acumulado = getReporteTiempoTrabajadoSegundos(reporte)
  await actualizarReporte(id, {
    estado: 'completado',
    asignacionEstado: reporte.asignadoId ? 'aceptada' : reporte.asignacionEstado,
    asignacionRespondidaAt: reporte.asignadoId && !reporte.asignacionRespondidaAt ? new Date() : reporte.asignacionRespondidaAt,
    completadoAt: new Date(),
    trabajoIniciadoAt: null as any,
    trabajoAcumuladoSegundos: acumulado,
  })
  return getReporteById(id)
}
export async function getEstadisticas() {
  const [all, empleados, actualizaciones] = await Promise.all([
    db.select().from(schema.reportes),
    getEmpleados(),
    db.select().from(schema.actualizaciones),
  ])
  const total = all.length
  const pendientes = all.filter(r => r.estado === 'pendiente').length
  const enProgreso = all.filter(r => r.estado === 'en_progreso').length
  const pausados = all.filter(r => r.estado === 'pausado').length
  const completados = all.filter(r => r.estado === 'completado').length
  const cancelados = all.filter(r => r.estado === 'cancelado').length
  const abiertos = pendientes + enProgreso + pausados
  const totalGestionable = total - cancelados
  const rankingEmpleadosHoy = buildEmployeeRanking(all, empleados, actualizaciones)
  const asignacionesPendientes = all.filter(r => r.asignadoId && r.asignacionEstado === 'pendiente_confirmacion').length
  const controlAsignacionesHoy = buildAssignmentControl(actualizaciones)
  return {
    total,
    abiertos,
    pendientes,
    enProgreso,
    pausados,
    completados,
    cancelados,
    asignacionesPendientes,
    asignacionesAceptadasHoy: controlAsignacionesHoy.aceptadasHoy,
    asignacionesRechazadasHoy: controlAsignacionesHoy.rechazadasHoy,
    urgentes: all.filter(r => r.prioridad === 'urgente' && !['completado', 'cancelado'].includes(r.estado)).length,
    tasaCompletitud: totalGestionable > 0 ? Math.round((completados / totalGestionable) * 100) : 0,
    porCategoria: ['electrico', 'plomeria', 'estructura', 'limpieza', 'seguridad', 'climatizacion', 'otro']
      .map(c => ({ categoria: c, count: all.filter(r => r.categoria === c && !['completado', 'cancelado'].includes(r.estado)).length })),
    porPrioridad: ['baja', 'media', 'alta', 'urgente']
      .map(p => ({ prioridad: p, count: all.filter(r => r.prioridad === p && !['completado', 'cancelado'].includes(r.estado)).length })),
    rankingEmpleadosHoy,
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
  await db.insert(schema.empleados).values({ ...data, waId: normalizeWaNumber(data.waId) || null }).run()
}
export async function actualizarEmpleado(id: number, data: Partial<typeof schema.empleados.$inferInsert>) {
  const normalized = 'waId' in data ? { ...data, waId: normalizeWaNumber(data.waId) || null } : data
  await db.update(schema.empleados).set(normalized as any).where(eq(schema.empleados.id, id)).run()
}
export async function getEmpleadoById(id: number) {
  const rows = await db.select().from(schema.empleados).where(eq(schema.empleados.id, id))
  return rows[0] ?? null
}
export async function getEmpleadoByWaId(waNumber: string) {
  const normalized = waNumber.replace(/\D/g, '')
  const rows = await db.select().from(schema.empleados).where(eq(schema.empleados.activo, true))
  return rows.find(e => {
    if (!e.waId) return false
    const stored = e.waId.replace(/\D/g, '')
    // Match exact OR if incoming number ends with stored (handles missing country code)
    return normalized === stored || normalized.endsWith(stored)
  }) ?? null
}
export async function getTareasEmpleado(empleadoId: number) {
  const rows = await db.select().from(schema.reportes).where(eq(schema.reportes.asignadoId, empleadoId))
  return rows
    .filter(r => r.estado !== 'completado' && r.estado !== 'cancelado')
    .map(r => ({ ...r, tiempoTrabajadoSegundos: getReporteTiempoTrabajadoSegundos(r) }))
    .sort((a, b) => {
      const estadoRank = statusRank(a.estado) - statusRank(b.estado)
      if (estadoRank !== 0) return estadoRank
      return priorityRank(b.prioridad) - priorityRank(a.prioridad) || (a.createdAt as any) - (b.createdAt as any)
    })
}

export async function getNextAssignableReporteForEmpleado(empleadoId: number) {
  const empleado = await getEmpleadoById(empleadoId)
  if (!empleado) return null

  const rows = await db.select().from(schema.reportes)
  const disponibles = rows
    .filter(r => !r.asignadoId && r.estado === 'pendiente')
    .sort((a, b) => priorityRank(b.prioridad) - priorityRank(a.prioridad) || (a.createdAt as any) - (b.createdAt as any))

  if (disponibles.length === 0) return null

  const especialidad = normalizeText(empleado.especialidad ?? '')
  if (!especialidad) return disponibles[0]

  const preferido = disponibles.find(r => employeeMatchesReporte(especialidad, r))
  return preferido ?? disponibles[0]
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

// --- BOT QUEUE ---
export async function enqueueBotMessage(waNumber: string, message: string) {
  await db.insert(schema.botQueue).values({ waNumber, message }).run()
}
export async function getPendingBotMessages() {
  return db.select().from(schema.botQueue).where(eq(schema.botQueue.status, 'pending'))
}
export async function markBotMessageSent(id: number) {
  await db.update(schema.botQueue).set({ status: 'sent' }).where(eq(schema.botQueue.id, id)).run()
}
export async function markBotMessageFailed(id: number) {
  await db.update(schema.botQueue).set({ status: 'failed' }).where(eq(schema.botQueue.id, id)).run()
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

export async function limpiarDatosDemo() {
  const [reportes, leads, botQueue] = await Promise.all([
    db.select().from(schema.reportes),
    db.select().from(schema.leads),
    db.select().from(schema.botQueue),
  ])

  const reportesDemo = reportes.filter(reporte => isDemoRecord([
    reporte.locatario,
    reporte.local,
    reporte.titulo,
    reporte.descripcion,
    reporte.contacto,
  ]))
  const leadsDemo = leads.filter(lead => isDemoRecord([
    lead.nombre,
    lead.telefono,
    lead.email,
    lead.rubro,
    lead.tipoLocal,
    lead.mensaje,
  ]))
  const queueDemo = botQueue.filter(item => isDemoRecord([item.message, item.waNumber]))

  for (const actualizacion of await db.select().from(schema.actualizaciones)) {
    if (reportesDemo.some(reporte => reporte.id === actualizacion.reporteId)) {
      await db.delete(schema.actualizaciones).where(eq(schema.actualizaciones.id, actualizacion.id)).run()
    }
  }

  for (const reporte of reportesDemo) {
    await db.delete(schema.reportes).where(eq(schema.reportes.id, reporte.id)).run()
  }
  for (const lead of leadsDemo) {
    await db.delete(schema.leads).where(eq(schema.leads.id, lead.id)).run()
  }
  for (const item of queueDemo) {
    await db.delete(schema.botQueue).where(eq(schema.botQueue.id, item.id)).run()
  }

  return {
    reportes: reportesDemo.length,
    leads: leadsDemo.length,
    colaBot: queueDemo.length,
    total: reportesDemo.length + leadsDemo.length + queueDemo.length,
  }
}

function priorityRank(prioridad: string) {
  switch (prioridad) {
    case 'urgente': return 4
    case 'alta': return 3
    case 'media': return 2
    case 'baja': return 1
    default: return 0
  }
}

function statusRank(estado: string) {
  switch (estado) {
    case 'en_progreso': return 0
    case 'pausado': return 1
    case 'pendiente': return 2
    default: return 3
  }
}

function employeeMatchesReporte(especialidad: string, reporte: any) {
  const haystack = normalizeText(`${reporte.categoria} ${reporte.titulo} ${reporte.descripcion}`)
  const checks: Record<string, string[]> = {
    electrico: ['electrico', 'electricista', 'luz', 'tablero', 'enchufe'],
    plomeria: ['plomeria', 'plomero', 'agua', 'caño', 'canilla', 'fuga'],
    estructura: ['estructura', 'albanil', 'carpinter', 'techo', 'pared', 'puerta', 'vidrio'],
    limpieza: ['limpieza', 'limpiar', 'residuos', 'basura'],
    seguridad: ['seguridad', 'alarma', 'camaras', 'cerradura'],
    climatizacion: ['climatizacion', 'aire', 'frio', 'calor', 'calefaccion'],
  }

  return Object.values(checks).some(words =>
    words.some(word => especialidad.includes(word) && haystack.includes(word))
  )
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function buildEmployeeRanking(reportes: any[], empleados: any[], actualizaciones: any[]) {
  const { start, end } = getBuenosAiresDayRange()
  const now = Date.now()
  const employeeMap = new Map<number, {
    empleadoId: number
    nombre: string
    tareasActivas: number
    pendientesConfirmacion: number
    completadasHoy: number
    aceptadasHoy: number
    rechazadasHoy: number
    horasTrabajadasHoySegundos: number
  }>()

  for (const empleado of empleados) {
    employeeMap.set(empleado.id, {
      empleadoId: empleado.id,
      nombre: empleado.nombre,
      tareasActivas: 0,
      pendientesConfirmacion: 0,
      completadasHoy: 0,
      aceptadasHoy: 0,
      rechazadasHoy: 0,
      horasTrabajadasHoySegundos: 0,
    })
  }

  for (const reporte of reportes) {
    if (!reporte.asignadoId || !employeeMap.has(reporte.asignadoId)) continue
    const bucket = employeeMap.get(reporte.asignadoId)!
    if (!['completado', 'cancelado'].includes(reporte.estado)) {
      bucket.tareasActivas += 1
    }
    if (reporte.asignacionEstado === 'pendiente_confirmacion') {
      bucket.pendientesConfirmacion += 1
    }
    if (isWithinDay(reporte.completadoAt, start, end)) {
      bucket.completadasHoy += 1
    }
    bucket.horasTrabajadasHoySegundos += estimateWorkedSecondsToday(reporte, actualizaciones, start, now)
  }

  for (const actualizacion of actualizaciones) {
    if (!isWithinDay(actualizacion.createdAt, start, end)) continue
    const empleado = [...employeeMap.values()].find(item => item.nombre === actualizacion.usuarioNombre)
    if (!empleado) continue
    if (isAssignmentAcceptedEvent(actualizacion)) {
      empleado.aceptadasHoy += 1
    }
    if (isAssignmentRejectedEvent(actualizacion)) {
      empleado.rechazadasHoy += 1
    }
  }

  return [...employeeMap.values()]
    .filter(item =>
      item.tareasActivas > 0 ||
      item.pendientesConfirmacion > 0 ||
      item.completadasHoy > 0 ||
      item.aceptadasHoy > 0 ||
      item.rechazadasHoy > 0 ||
      item.horasTrabajadasHoySegundos > 0
    )
    .sort((a, b) =>
      b.aceptadasHoy - a.aceptadasHoy ||
      b.horasTrabajadasHoySegundos - a.horasTrabajadasHoySegundos ||
      b.completadasHoy - a.completadasHoy ||
      b.tareasActivas - a.tareasActivas ||
      a.nombre.localeCompare(b.nombre)
    )
}

function estimateWorkedSecondsToday(reporte: any, actualizaciones: any[], dayStart: number, now: number) {
  const eventosHoy = actualizaciones
    .filter(a => a.reporteId === reporte.id && isWithinDay(a.createdAt, dayStart, dayStart + 24 * 60 * 60 * 1000))
    .sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt))

  let total = 0
  let segmentoActivoDesde: number | null = reporte.estado === 'en_progreso' && reporte.trabajoIniciadoAt
    ? Math.max(toMs(reporte.trabajoIniciadoAt), dayStart)
    : null

  for (const evento of eventosHoy) {
    const eventoMs = toMs(evento.createdAt)
    if (isStartTimerEvent(evento)) {
      segmentoActivoDesde = eventoMs
      continue
    }
    if (isStopTimerEvent(evento)) {
      const inicio = segmentoActivoDesde ?? dayStart
      total += Math.max(0, Math.floor((eventoMs - inicio) / 1000))
      segmentoActivoDesde = null
    }
  }

  if (segmentoActivoDesde !== null && reporte.estado === 'en_progreso') {
    total += Math.max(0, Math.floor((now - segmentoActivoDesde) / 1000))
  }

  if (total === 0 && isWithinDay(reporte.updatedAt, dayStart, dayStart + 24 * 60 * 60 * 1000)) {
    return Math.min(getReporteTiempoTrabajadoSegundos(reporte), Math.max(0, Math.floor((now - dayStart) / 1000)))
  }

  return total
}

function isStartTimerEvent(evento: any) {
  const text = normalizeText(`${evento.tipo} ${evento.descripcion}`)
  return evento.tipo === 'timer' && (
    text.includes('iniciada') ||
    text.includes('acepto la tarea') ||
    text.includes('confirmo recepcion')
  )
}

function isStopTimerEvent(evento: any) {
  const text = normalizeText(`${evento.tipo} ${evento.descripcion}`)
  return (evento.tipo === 'timer' && text.includes('pausada')) || evento.tipo === 'completado'
}

function buildAssignmentControl(actualizaciones: any[]) {
  const { start, end } = getBuenosAiresDayRange()
  const hoy = actualizaciones.filter(a => isWithinDay(a.createdAt, start, end))
  return {
    aceptadasHoy: hoy.filter(isAssignmentAcceptedEvent).length,
    rechazadasHoy: hoy.filter(isAssignmentRejectedEvent).length,
  }
}

function isAssignmentAcceptedEvent(evento: any) {
  const text = normalizeText(`${evento.tipo} ${evento.descripcion}`)
  return text.includes('acepto la tarea')
}

function isAssignmentRejectedEvent(evento: any) {
  const text = normalizeText(`${evento.tipo} ${evento.descripcion}`)
  return (
    text.includes('no puede tomar la tarea') ||
    text.includes('esta de franco') ||
    text.includes('esta ocupado')
  )
}

function getBuenosAiresDayRange(reference = Date.now()) {
  const offsetMs = 3 * 60 * 60 * 1000
  const shifted = new Date(reference - offsetMs)
  const start = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) + offsetMs
  return { start, end: start + 24 * 60 * 60 * 1000 }
}

function isWithinDay(value: any, start: number, end: number) {
  if (!value) return false
  const ms = toMs(value)
  return ms >= start && ms < end
}

function toMs(value: any) {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  return new Date(value).getTime()
}

function isDemoRecord(values: any[]) {
  const haystack = normalizeText(values.filter(Boolean).join(' '))
  return ['prueba', 'demo', 'test-', 'test ', 'ejemplo', 'qa '].some(marker => haystack.includes(marker))
}

function normalizeWaNumber(value?: string | null) {
  if (!value) return ''
  return value.replace(/\D/g, '')
}
