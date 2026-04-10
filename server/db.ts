import { createClient } from '@libsql/client'
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
    `CREATE TABLE IF NOT EXISTS empleado_asistencia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empleado_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      canal TEXT NOT NULL,
      nota TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS empleado_asistencia_auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attendance_event_id INTEGER NOT NULL,
      accion TEXT NOT NULL,
      valor_anterior_tipo TEXT,
      valor_anterior_timestamp INTEGER,
      valor_anterior_canal TEXT,
      valor_anterior_nota TEXT,
      valor_nuevo_tipo TEXT,
      valor_nuevo_timestamp INTEGER,
      valor_nuevo_canal TEXT,
      valor_nuevo_nota TEXT,
      motivo TEXT NOT NULL,
      admin_user_id INTEGER NOT NULL,
      admin_user_name TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS empleado_liquidacion_cierre (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empleado_id INTEGER NOT NULL,
      periodo_tipo TEXT NOT NULL,
      periodo_desde TEXT NOT NULL,
      periodo_hasta TEXT NOT NULL,
      dias_trabajados INTEGER NOT NULL DEFAULT 0,
      segundos_trabajados INTEGER NOT NULL DEFAULT 0,
      promedio_segundos_por_dia INTEGER NOT NULL DEFAULT 0,
      pago_diario INTEGER NOT NULL DEFAULT 0,
      pago_semanal INTEGER NOT NULL DEFAULT 0,
      pago_quincenal INTEGER NOT NULL DEFAULT 0,
      pago_mensual INTEGER NOT NULL DEFAULT 0,
      tarifa_periodo TEXT NOT NULL,
      tarifa_monto INTEGER NOT NULL DEFAULT 0,
      total_pagar INTEGER NOT NULL DEFAULT 0,
      cerrado_por_id INTEGER,
      cerrado_por_nombre TEXT NOT NULL,
      closed_at INTEGER NOT NULL DEFAULT (unixepoch()),
      pagado_at INTEGER,
      pagado_por_id INTEGER,
      pagado_por_nombre TEXT
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
    `CREATE TABLE IF NOT EXISTS rondas_plantilla (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'ronda_banos',
      descripcion TEXT,
      intervalo_horas INTEGER NOT NULL,
      checklist_objetivo TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS rondas_programacion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plantilla_id INTEGER NOT NULL,
      modo_programacion TEXT NOT NULL,
      dia_semana INTEGER,
      fecha_especial TEXT,
      hora_inicio TEXT NOT NULL,
      hora_fin TEXT NOT NULL,
      empleado_id INTEGER NOT NULL,
      empleado_nombre TEXT NOT NULL,
      empleado_wa_id TEXT NOT NULL,
      supervisor_user_id INTEGER,
      supervisor_nombre TEXT,
      supervisor_wa_id TEXT,
      escalacion_habilitada INTEGER NOT NULL DEFAULT 1,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS rondas_ocurrencia (
      id INTEGER PRIMARY KEY,
      plantilla_id INTEGER NOT NULL,
      programacion_id INTEGER NOT NULL,
      fecha_operativa TEXT NOT NULL,
      programado_at INTEGER NOT NULL,
      programado_at_label TEXT,
      recordatorio_enviado_at INTEGER,
      confirmado_at INTEGER,
      empleado_id INTEGER NOT NULL,
      empleado_nombre TEXT NOT NULL,
      empleado_wa_id TEXT NOT NULL,
      supervisor_wa_id TEXT,
      nombre_ronda TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      canal_confirmacion TEXT NOT NULL DEFAULT 'whatsapp',
      nota TEXT,
      escalado_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS rondas_evento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ocurrencia_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      actor_tipo TEXT NOT NULL DEFAULT 'system',
      actor_id INTEGER,
      actor_nombre TEXT,
      descripcion TEXT NOT NULL,
      metadata_json TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS tareas_operativas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      origen TEXT NOT NULL,
      reporte_id INTEGER,
      tipo_trabajo TEXT NOT NULL,
      titulo TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      ubicacion TEXT NOT NULL,
      prioridad TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'pendiente_asignacion',
      empleado_id INTEGER,
      empleado_nombre TEXT,
      empleado_wa_id TEXT,
      asignado_at INTEGER,
      aceptado_at INTEGER,
      trabajo_iniciado_at INTEGER,
      trabajo_acumulado_segundos INTEGER NOT NULL DEFAULT 0,
      pausado_at INTEGER,
      terminado_at INTEGER,
      orden_asignacion INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS tareas_operativas_evento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tarea_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      actor_tipo TEXT NOT NULL DEFAULT 'system',
      actor_id INTEGER,
      actor_nombre TEXT,
      descripcion TEXT NOT NULL,
      metadata_json TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
  ]
  for (const sql of stmts) {
    await client.execute(sql)
  }
  const indexStmts = [
    `CREATE UNIQUE INDEX IF NOT EXISTS tareas_operativas_unica_activa_por_empleado
      ON tareas_operativas(empleado_id)
      WHERE estado = 'en_progreso'`,
  ]
  for (const sql of indexStmts) {
    try {
      await client.execute(sql)
    } catch (error) {
      console.warn('[DB] Could not create operational-task unique index', error)
    }
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
    `ALTER TABLE empleado_asistencia ADD COLUMN timestamp INTEGER`,
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

function assertNotFutureAttendanceDate(fechaHora: Date) {
  if (toMs(fechaHora) > Date.now()) {
    throw new Error('No se permiten marcaciones futuras')
  }
}

function getAttendanceEventTime(evento: { timestamp?: Date | number | null; createdAt?: Date | number | null }) {
  return toMs(evento.timestamp ?? evento.createdAt)
}

function toBuenosAiresDateKey(value: Date | number) {
  const offsetMs = 3 * 60 * 60 * 1000
  const shifted = new Date(toMs(value) - offsetMs)
  const year = shifted.getUTCFullYear()
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const day = String(shifted.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isAttendanceDateInsideClosedPeriod(
  closures: schema.EmpleadoLiquidacionCierre[],
  empleadoId: number,
  fechaHora: Date | number
) {
  const eventDayKey = toBuenosAiresDateKey(fechaHora)
  return closures.some(cierre =>
    cierre.empleadoId === empleadoId &&
    eventDayKey >= cierre.periodoDesde &&
    eventDayKey <= cierre.periodoHasta
  )
}

async function assertAttendancePeriodOpenForEmpleado(empleadoId: number, fechaHora: Date, errorMessage: string) {
  const closures = await db.select().from(schema.empleadoLiquidacionCierre)
  if (isAttendanceDateInsideClosedPeriod(closures, empleadoId, fechaHora)) {
    throw new Error(errorMessage)
  }
}

// --- ASISTENCIA EMPLEADOS ---
export async function getEmpleadoAttendanceEvents(empleadoId: number) {
  const rows = await db.select().from(schema.empleadoAsistencia).where(eq(schema.empleadoAsistencia.empleadoId, empleadoId))
  return rows.sort((a, b) => getAttendanceEventTime(a) - getAttendanceEventTime(b))
}

export async function getEmpleadoAttendanceStatus(empleadoId: number) {
  const rows = await getEmpleadoAttendanceEvents(empleadoId)
  const latest = rows[rows.length - 1] ?? null
  const { start, end } = getBuenosAiresDayRange()
  const now = Date.now()

  let openShiftAt: number | null = null
  let workedSecondsToday = 0

  for (const row of rows) {
    const rowMs = getAttendanceEventTime(row)
    if (row.tipo === 'entrada') {
      openShiftAt = rowMs
      continue
    }

    if (row.tipo === 'salida' && openShiftAt !== null) {
      const segmentStart = Math.max(openShiftAt, start)
      const segmentEnd = Math.min(rowMs, end)
      if (segmentEnd > segmentStart) {
        workedSecondsToday += Math.floor((segmentEnd - segmentStart) / 1000)
      }
      openShiftAt = null
    }
  }

  if (openShiftAt !== null) {
    const segmentStart = Math.max(openShiftAt, start)
    const segmentEnd = Math.min(now, end)
    if (segmentEnd > segmentStart) {
      workedSecondsToday += Math.floor((segmentEnd - segmentStart) / 1000)
    }
  }

  const todayRows = rows.filter(row => isWithinDay(getAttendanceEventTime(row), start, end))
  const lastEntry = [...rows].reverse().find(row => row.tipo === 'entrada') ?? null
  const onShift = latest?.tipo === 'entrada'
  const currentShiftSeconds = onShift && lastEntry
    ? Math.max(0, Math.floor((now - getAttendanceEventTime(lastEntry)) / 1000))
    : 0

  return {
    onShift,
    lastAction: latest?.tipo ?? null,
    lastActionAt: latest ? new Date(getAttendanceEventTime(latest)) : null,
    lastChannel: latest?.canal ?? null,
    lastEntryAt: lastEntry ? new Date(getAttendanceEventTime(lastEntry)) : null,
    workedSecondsToday,
    currentShiftSeconds,
    todayEntries: todayRows.filter(row => row.tipo === 'entrada').length,
    todayExits: todayRows.filter(row => row.tipo === 'salida').length,
  }
}

export async function registerEmpleadoAttendance(
  empleadoId: number,
  tipo: 'entrada' | 'salida',
  canal: 'whatsapp' | 'panel' | 'manual_admin' = 'panel',
  nota?: string
) {
  const current = await getEmpleadoAttendanceStatus(empleadoId)

  if (tipo === 'entrada' && current.onShift) {
    return { success: false, code: 'already_on_shift' as const, status: current }
  }

  if (tipo === 'salida' && !current.onShift) {
    return { success: false, code: 'not_on_shift' as const, status: current }
  }

  await db.insert(schema.empleadoAsistencia).values({
    empleadoId,
    tipo,
    timestamp: new Date(),
    canal,
    nota,
  }).run()

  return {
    success: true,
    code: 'ok' as const,
    status: await getEmpleadoAttendanceStatus(empleadoId),
  }
}

export async function createManualAttendanceEvent({
  empleadoId,
  tipo,
  fechaHora,
  nota,
}: {
  empleadoId: number
  tipo: 'entrada' | 'salida'
  fechaHora: Date
  nota?: string
}) {
  assertNotFutureAttendanceDate(fechaHora)
  await assertAttendancePeriodOpenForEmpleado(empleadoId, fechaHora, 'No se puede crear una marcacion en un periodo cerrado')

  await db.insert(schema.empleadoAsistencia).values({
    empleadoId,
    tipo,
    timestamp: fechaHora,
    canal: 'manual_admin',
    nota,
  }).run()

  return { success: true }
}

export async function getAttendanceAuditTrailForEmpleado(empleadoId: number) {
  const [eventos, auditoria] = await Promise.all([
    getEmpleadoAttendanceEvents(empleadoId),
    db.select().from(schema.empleadoAsistenciaAuditoria),
  ])

  const ids = new Set(eventos.map(evento => evento.id))

  return auditoria
    .filter(item => ids.has(item.attendanceEventId))
    .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt))
}

export async function correctManualAttendanceEvent({
  attendanceEventId,
  tipo,
  fechaHora,
  nota,
  motivo,
  admin,
}: {
  attendanceEventId: number
  tipo: 'entrada' | 'salida'
  fechaHora: Date
  nota?: string
  motivo: string
  admin: { id: number; name: string }
}) {
  assertNotFutureAttendanceDate(fechaHora)

  const currentRows = await db.select().from(schema.empleadoAsistencia).where(eq(schema.empleadoAsistencia.id, attendanceEventId))
  const current = currentRows[0]

  if (!current) {
    throw new Error('Marcacion no encontrada')
  }

  const closures = await db.select().from(schema.empleadoLiquidacionCierre)
  const isClosed = isAttendanceDateInsideClosedPeriod(closures, current.empleadoId, getAttendanceEventTime(current))
    || isAttendanceDateInsideClosedPeriod(closures, current.empleadoId, fechaHora)

  if (isClosed) {
    throw new Error('No se puede corregir una marcacion de un periodo cerrado')
  }

  await db.insert(schema.empleadoAsistenciaAuditoria).values({
    attendanceEventId,
    accion: 'correccion_manual',
    valorAnteriorTipo: current.tipo,
    valorAnteriorTimestamp: current.timestamp ?? current.createdAt,
    valorAnteriorCanal: current.canal,
    valorAnteriorNota: current.nota,
    valorNuevoTipo: tipo,
    valorNuevoTimestamp: fechaHora,
    valorNuevoCanal: 'manual_admin',
    valorNuevoNota: nota,
    motivo,
    adminUserId: admin.id,
    adminUserName: admin.name,
  }).run()

  await db.update(schema.empleadoAsistencia).set({
    tipo,
    timestamp: fechaHora,
    canal: 'manual_admin',
    nota,
  } as any).where(eq(schema.empleadoAsistencia.id, attendanceEventId)).run()

  return { success: true }
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
    waId: normalizeWaNumber(data.waId),
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
  await db.insert(schema.empleados).values(data).run()
}
export async function actualizarEmpleado(id: number, data: Partial<typeof schema.empleados.$inferInsert>) {
  await db.update(schema.empleados).set(data as any).where(eq(schema.empleados.id, id)).run()
}
export async function getEmpleadoById(id: number) {
  const rows = await db.select().from(schema.empleados).where(eq(schema.empleados.id, id))
  return rows[0] ?? null
}
export async function getEmpleadoActivoById(id: number) {
  const empleado = await getEmpleadoById(id)
  if (!empleado || empleado.activo === false) return null
  return empleado
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

// --- TAREAS OPERATIVAS ---
export async function getOperationalTaskById(id: number) {
  const rows = await db.select().from(schema.tareasOperativas).where(eq(schema.tareasOperativas.id, id))
  const task = rows[0] ?? null
  return task ? toOperationalTaskRecord(task) : null
}

export async function getActiveOperationalTaskForEmployee(empleadoId: number) {
  const rows = await db.select().from(schema.tareasOperativas).where(and(
    eq(schema.tareasOperativas.empleadoId, empleadoId),
    eq(schema.tareasOperativas.estado, 'en_progreso'),
  ))
  const task = rows[0] ?? null
  return task ? toOperationalTaskRecord(task) : null
}

export async function updateOperationalTask(id: number, data: Partial<typeof schema.tareasOperativas.$inferInsert>) {
  await db.update(schema.tareasOperativas)
    .set({
      ...data,
      empleadoWaId: data.empleadoWaId !== undefined ? normalizeOptionalWaNumber(data.empleadoWaId) : undefined,
      updatedAt: new Date(),
    } as any)
    .where(eq(schema.tareasOperativas.id, id))
    .run()
}

export async function createOperationalTask(data: typeof schema.tareasOperativas.$inferInsert): Promise<number> {
  const assigned = Boolean(data.empleadoId)
  const now = new Date()
  const rows = await db.insert(schema.tareasOperativas).values({
    ...data,
    empleadoWaId: normalizeOptionalWaNumber(data.empleadoWaId),
    estado: data.estado ?? (assigned ? 'pendiente_confirmacion' : 'pendiente_asignacion'),
    asignadoAt: data.asignadoAt ?? (assigned ? now : null),
    trabajoAcumuladoSegundos: Number(data.trabajoAcumuladoSegundos ?? 0),
    ordenAsignacion: Number(data.ordenAsignacion ?? 0),
    updatedAt: data.updatedAt ?? now,
  }).returning({ id: schema.tareasOperativas.id })
  return rows[0].id
}

export async function createOperationalTaskFromReporte(input: {
  reporteId: number
  tipoTrabajo: string
  empleadoId?: number
}) {
  const reporte = await getReporteById(input.reporteId)
  if (!reporte) throw new Error('Reporte no encontrado')

  const effectiveEmployeeId = typeof input.empleadoId === 'number'
    ? input.empleadoId
    : typeof reporte.asignadoId === 'number'
      ? reporte.asignadoId
      : undefined

  const empleado = typeof effectiveEmployeeId === 'number'
    ? await getEmpleadoById(effectiveEmployeeId)
    : null

  if (typeof effectiveEmployeeId === 'number' && !empleado) {
    throw new Error('Empleado no encontrado')
  }

  const ubicacion = typeof reporte.local === 'string' && reporte.local.trim().toLowerCase().startsWith('local')
    ? reporte.local.trim()
    : `Local ${reporte.local}`.trim()

  const id = await createOperationalTask({
    origen: 'reclamo',
    reporteId: reporte.id,
    tipoTrabajo: input.tipoTrabajo,
    titulo: reporte.titulo,
    descripcion: reporte.descripcion,
    ubicacion,
    prioridad: reporte.prioridad as any,
    empleadoId: empleado?.id,
    empleadoNombre: empleado?.nombre ?? undefined,
    empleadoWaId: empleado?.waId ?? undefined,
  } as any)

  return { id }
}

export async function listOperationalTasks() {
  const rows = await db.select().from(schema.tareasOperativas)
  return rows.map(toOperationalTaskRecord).sort(compareOperationalTasks)
}

export async function listOperationalTasksByEmployee(empleadoId: number) {
  const rows = await db.select().from(schema.tareasOperativas).where(eq(schema.tareasOperativas.empleadoId, empleadoId))
  return rows.map(toOperationalTaskRecord).sort(compareOperationalTasks)
}

export async function getNextOperationalTaskForEmployee(empleadoId: number, currentTaskId?: number) {
  const rows = await listOperationalTasksByEmployee(empleadoId)
  return rows.find(task => task.estado === 'pendiente_confirmacion' && task.id !== currentTaskId) ?? null
}

export async function acceptOperationalTask(taskId: number, empleadoId: number) {
  try {
    return await db.transaction(async (tx) => {
      const taskRows = await tx.select().from(schema.tareasOperativas).where(eq(schema.tareasOperativas.id, taskId))
      const task = taskRows[0] ?? null
      if (!task) throw new Error('Operational task not found')
      if (task.empleadoId !== empleadoId) {
        throw new Error('Operational task does not belong to employee')
      }
      if (task.estado !== 'pendiente_confirmacion') {
        throw new Error('Operational task is not awaiting confirmation')
      }

      const activeRows = await tx.select().from(schema.tareasOperativas).where(and(
        eq(schema.tareasOperativas.empleadoId, empleadoId),
        eq(schema.tareasOperativas.estado, 'en_progreso'),
      ))
      const activeTask = activeRows[0] ?? null
      if (activeTask && activeTask.id !== taskId) {
        throw new Error('Employee already has an active operational task')
      }

      const now = new Date()
      const updates = {
        estado: 'en_progreso',
        aceptadoAt: task.aceptadoAt ?? now,
        trabajoIniciadoAt: now,
        pausadoAt: null,
      }

      await tx.update(schema.tareasOperativas)
        .set({
          ...updates,
          updatedAt: now,
        } as any)
        .where(eq(schema.tareasOperativas.id, taskId))
        .run()

      await tx.insert(schema.tareasOperativasEvento).values([
        {
          tareaId: taskId,
          tipo: 'aceptacion',
          actorTipo: 'employee',
          actorId: empleadoId,
          actorNombre: task.empleadoNombre ?? null,
          descripcion: 'Tarea aceptada por el empleado',
          metadataJson: null,
          createdAt: now,
        },
        {
          tareaId: taskId,
          tipo: 'inicio',
          actorTipo: 'employee',
          actorId: empleadoId,
          actorNombre: task.empleadoNombre ?? null,
          descripcion: 'Trabajo iniciado',
          metadataJson: null,
          createdAt: now,
        },
      ]).run()

      return toOperationalTaskRecord({
        ...task,
        ...updates,
        trabajoAcumuladoSegundos: Number(task.trabajoAcumuladoSegundos ?? 0),
        updatedAt: now,
      } as any)
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Employee already has an active operational task') {
        throw error
      }
      const message = error.message.toLowerCase()
      if (message.includes('unique constraint failed') || message.includes('constraint failed')) {
        throw new Error('Employee already has an active operational task')
      }
    }
    throw error
  }
}

export async function addOperationalTaskEvent(event: {
  tareaId: number
  tipo: 'asignacion' | 'aceptacion' | 'rechazo' | 'inicio' | 'pausa' | 'reanudar' | 'terminacion' | 'cancelacion' | 'reasignacion' | 'admin_update'
  actorTipo?: 'system' | 'employee' | 'admin'
  actorId?: number | null
  actorNombre?: string | null
  descripcion: string
  metadata?: Record<string, unknown> | null
  createdAt?: Date
}) {
  await db.insert(schema.tareasOperativasEvento).values({
    tareaId: event.tareaId,
    tipo: event.tipo,
    actorTipo: event.actorTipo ?? 'system',
    actorId: event.actorId ?? null,
    actorNombre: event.actorNombre ?? null,
    descripcion: event.descripcion,
    metadataJson: event.metadata ? JSON.stringify(event.metadata) : null,
    createdAt: event.createdAt ?? new Date(),
  }).run()
}

export async function persistOperationalTaskChange(
  taskId: number,
  data: Partial<typeof schema.tareasOperativas.$inferInsert>,
  events: Array<{
    tareaId: number
    tipo: 'asignacion' | 'aceptacion' | 'rechazo' | 'inicio' | 'pausa' | 'reanudar' | 'terminacion' | 'cancelacion' | 'reasignacion' | 'admin_update'
    actorTipo?: 'system' | 'employee' | 'admin'
    actorId?: number | null
    actorNombre?: string | null
    descripcion: string
    metadata?: Record<string, unknown> | null
    createdAt?: Date
  }>
) {
  await db.transaction(async (tx) => {
    await tx.update(schema.tareasOperativas)
      .set({
        ...data,
        empleadoWaId: data.empleadoWaId !== undefined ? normalizeOptionalWaNumber(data.empleadoWaId) : undefined,
        updatedAt: new Date(),
      } as any)
      .where(eq(schema.tareasOperativas.id, taskId))
      .run()

    if (events.length === 0) return

    await tx.insert(schema.tareasOperativasEvento).values(events.map((event) => ({
      tareaId: event.tareaId,
      tipo: event.tipo,
      actorTipo: event.actorTipo ?? 'system',
      actorId: event.actorId ?? null,
      actorNombre: event.actorNombre ?? null,
      descripcion: event.descripcion,
      metadataJson: event.metadata ? JSON.stringify(event.metadata) : null,
      createdAt: event.createdAt ?? new Date(),
    }))).run()
  })
}

export async function getOperationalTasksOverview() {
  const [rows, events] = await Promise.all([
    listOperationalTasks(),
    db.select().from(schema.tareasOperativasEvento),
  ])
  const { start, end } = getBuenosAiresDayRange()
  const employeeMap = new Map<number, {
    empleadoId: number
    empleadoNombre: string
    activas: number
    pausadas: number
    pendientes: number
    terminadasHoy: number
    tiempoActivoSegundos: number
  }>()

  for (const task of rows) {
    if (!task.empleadoId) continue
    const bucket = employeeMap.get(task.empleadoId) ?? {
      empleadoId: task.empleadoId,
      empleadoNombre: task.empleadoNombre ?? `Empleado ${task.empleadoId}`,
      activas: 0,
      pausadas: 0,
      pendientes: 0,
      terminadasHoy: 0,
      tiempoActivoSegundos: 0,
    }
    if (task.estado === 'en_progreso') bucket.activas += 1
    if (task.estado === 'pausada') bucket.pausadas += 1
    if (task.estado === 'pendiente_confirmacion') bucket.pendientes += 1
    if (isWithinDay(task.terminadoAt, start, end)) bucket.terminadasHoy += 1
    bucket.tiempoActivoSegundos += Number(task.tiempoTrabajadoSegundos ?? 0)
    employeeMap.set(task.empleadoId, bucket)
  }

  return {
    total: rows.length,
    activas: rows.filter(task => task.estado === 'en_progreso').length,
    pausadas: rows.filter(task => task.estado === 'pausada').length,
    pendientesAsignacion: rows.filter(task => task.estado === 'pendiente_asignacion').length,
    pendientesConfirmacion: rows.filter(task => task.estado === 'pendiente_confirmacion').length,
    terminadasHoy: rows.filter(task => isWithinDay(task.terminadoAt, start, end)).length,
    rechazadasHoy: events.filter(event => event.tipo === 'rechazo' && isWithinDay(event.createdAt, start, end)).length,
    derivadasDesdeReportes: rows.filter(task => task.origen === 'reclamo').length,
    empleadosConColaAlta: [...employeeMap.values()].filter(item => item.pendientes >= 3).length,
    porEmpleado: [...employeeMap.values()].sort((a, b) =>
      b.activas - a.activas ||
      b.pendientes - a.pendientes ||
      b.tiempoActivoSegundos - a.tiempoActivoSegundos ||
      a.empleadoNombre.localeCompare(b.empleadoNombre)
    ),
  }
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

// --- RONDAS ---
export async function listActiveTemplates() {
  const rows = await db.select().from(schema.rondasPlantilla).where(eq(schema.rondasPlantilla.activo, true))
  return rows
    .filter((template) => template.intervaloHoras > 0)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map((template) => ({
      id: template.id,
      intervaloHoras: template.intervaloHoras,
    }))
}

export async function createRoundTemplate(data: {
  nombre: string
  descripcion?: string
  intervaloHoras: number
  checklistObjetivo?: string
}) {
  const rows = await db.insert(schema.rondasPlantilla).values({
    nombre: data.nombre.trim(),
    descripcion: data.descripcion?.trim() || null,
    intervaloHoras: data.intervaloHoras,
    checklistObjetivo: data.checklistObjetivo?.trim() || null,
    activo: true,
    updatedAt: new Date(),
  }).returning({ id: schema.rondasPlantilla.id })

  return { id: rows[0].id }
}

export async function listSchedulesForTemplate(templateId: number) {
  const rows = await db.select().from(schema.rondasProgramacion).where(eq(schema.rondasProgramacion.plantillaId, templateId))
  return rows
    .filter((schedule) => schedule.activo !== false)
    .sort((a, b) => {
      if ((a.fechaEspecial ?? '') !== (b.fechaEspecial ?? '')) {
        return (a.fechaEspecial ?? '').localeCompare(b.fechaEspecial ?? '')
      }
      if ((a.diaSemana ?? -1) !== (b.diaSemana ?? -1)) {
        return (a.diaSemana ?? -1) - (b.diaSemana ?? -1)
      }
      return a.horaInicio.localeCompare(b.horaInicio)
    })
    .map((schedule) => ({
      id: schedule.id,
      plantillaId: schedule.plantillaId,
      modoProgramacion: schedule.modoProgramacion,
      diaSemana: schedule.diaSemana ?? undefined,
      fechaEspecial: schedule.fechaEspecial ?? undefined,
      horaInicio: schedule.horaInicio,
      horaFin: schedule.horaFin,
      empleadoId: schedule.empleadoId,
      empleadoNombre: schedule.empleadoNombre,
      empleadoWaId: schedule.empleadoWaId,
      supervisorWaId: schedule.supervisorWaId ?? undefined,
    }))
}

export async function saveRoundSchedule(input: {
  plantillaId: number
  modoProgramacion: 'semanal' | 'fecha_especial'
  diaSemana?: number
  fechaEspecial?: string
  horaInicio: string
  horaFin: string
  empleadoId: number
  supervisorUserId?: number
  escalacionHabilitada?: boolean
}) {
  const empleado = await getEmpleadoById(input.empleadoId)
  if (!empleado) throw new Error('Empleado no encontrado')

  const empleadoWaId = normalizeOptionalWaNumber(empleado.waId)
  if (!empleadoWaId) throw new Error('El empleado debe tener WhatsApp cargado para asignar una ronda')

  const supervisor = input.supervisorUserId ? await getUserById(input.supervisorUserId) : null

  const rows = await db.insert(schema.rondasProgramacion).values({
    plantillaId: input.plantillaId,
    modoProgramacion: input.modoProgramacion,
    diaSemana: input.modoProgramacion === 'semanal' ? input.diaSemana ?? null : null,
    fechaEspecial: input.modoProgramacion === 'fecha_especial' ? input.fechaEspecial ?? null : null,
    horaInicio: input.horaInicio,
    horaFin: input.horaFin,
    empleadoId: empleado.id,
    empleadoNombre: empleado.nombre,
    empleadoWaId,
    supervisorUserId: supervisor?.id ?? null,
    supervisorNombre: supervisor?.name ?? null,
    supervisorWaId: normalizeOptionalWaNumber(supervisor?.waId),
    escalacionHabilitada: input.escalacionHabilitada ?? true,
    activo: true,
    updatedAt: new Date(),
  }).returning({ id: schema.rondasProgramacion.id })

  return { id: rows[0].id }
}

export async function getRoundOverviewForDashboard(dateKey = toBuenosAiresDateKey(new Date())) {
  const rows = await db.select().from(schema.rondasOcurrencia).where(eq(schema.rondasOcurrencia.fechaOperativa, dateKey))
  const ordered = rows.sort((a, b) => toMs(a.programadoAt) - toMs(b.programadoAt))
  const nextPending = ordered.find((occurrence) => occurrence.estado === 'pendiente')
  const latestConfirmed = [...ordered]
    .filter((occurrence) => occurrence.confirmadoAt)
    .sort((a, b) => toMs(b.confirmadoAt) - toMs(a.confirmadoAt))[0]
  const overdue = ordered.filter((occurrence) => occurrence.estado === 'vencido').length
  const pending = ordered.filter((occurrence) => occurrence.estado === 'pendiente').length

  return {
    fechaOperativa: dateKey,
    total: ordered.length,
    pendientes: pending,
    cumplidos: ordered.filter((occurrence) => occurrence.estado === 'cumplido').length,
    cumplidosConObservacion: ordered.filter((occurrence) => occurrence.estado === 'cumplido_con_observacion').length,
    vencidos: overdue,
    estadoGeneral: overdue > 0 ? 'atrasado' : pending > 0 ? 'pendiente' : 'estable',
    ultimaConfirmacion: latestConfirmed?.confirmadoAt ? formatTimeLabel(latestConfirmed.confirmadoAt) : null,
    proximoControl: nextPending
      ? {
          id: nextPending.id,
          hora: nextPending.programadoAtLabel ?? formatTimeLabel(nextPending.programadoAt),
          responsable: nextPending.empleadoNombre,
        }
      : null,
  }
}

export async function getRoundTimeline(dateKey: string) {
  const rows = await db.select().from(schema.rondasOcurrencia).where(eq(schema.rondasOcurrencia.fechaOperativa, dateKey))
  return rows
    .sort((a, b) => toMs(a.programadoAt) - toMs(b.programadoAt))
    .map((occurrence) => ({
      ...toRoundOccurrenceRecord(occurrence),
      estado: occurrence.estado,
      canalConfirmacion: occurrence.canalConfirmacion,
      nota: occurrence.nota,
    }))
}

export async function listOccurrencesForDate(templateId: number, dateKey: string) {
  const rows = await db.select().from(schema.rondasOcurrencia).where(and(
    eq(schema.rondasOcurrencia.plantillaId, templateId),
    eq(schema.rondasOcurrencia.fechaOperativa, dateKey),
  ))
  return rows
    .sort((a, b) => toMs(a.programadoAt) - toMs(b.programadoAt))
    .map(toRoundOccurrenceRecord)
}

export async function createOccurrences(rows: Array<{
  id: number
  plantillaId: number
  programacionId: number
  fechaOperativa: string
  programadoAt: Date
  programadoAtLabel?: string
  estado: 'pendiente' | 'vencido'
  recordatorioEnviadoAt: Date | null
  confirmadoAt: Date | null
  escaladoAt: Date | null
  empleadoId: number
  empleadoNombre: string
  empleadoWaId: string
  supervisorWaId?: string | null
  nombreRonda: string
}>) {
  if (rows.length === 0) return
  await db.insert(schema.rondasOcurrencia).values(rows.map((row) => ({
    id: row.id,
    plantillaId: row.plantillaId,
    programacionId: row.programacionId,
    fechaOperativa: row.fechaOperativa,
    programadoAt: row.programadoAt,
    programadoAtLabel: row.programadoAtLabel ?? null,
    estado: row.estado,
    recordatorioEnviadoAt: row.recordatorioEnviadoAt,
    confirmadoAt: row.confirmadoAt,
    escaladoAt: row.escaladoAt,
    empleadoId: row.empleadoId,
    empleadoNombre: row.empleadoNombre,
    empleadoWaId: normalizeWaNumber(row.empleadoWaId),
    supervisorWaId: normalizeOptionalWaNumber(row.supervisorWaId),
    nombreRonda: row.nombreRonda,
  }))).onConflictDoNothing().run()
}

export async function listReminderCandidates(now: Date) {
  const rows = await db.select().from(schema.rondasOcurrencia).where(eq(schema.rondasOcurrencia.estado, 'pendiente'))
  return rows
    .filter((occurrence) => {
      if (occurrence.confirmadoAt) return false
      return toMs(occurrence.programadoAt) <= now.getTime()
    })
    .sort((a, b) => toMs(a.programadoAt) - toMs(b.programadoAt))
    .map(toRoundOccurrenceRecord)
}

export async function getRoundOccurrenceById(id: number) {
  const rows = await db.select().from(schema.rondasOcurrencia).where(eq(schema.rondasOcurrencia.id, id))
  const occurrence = rows[0]
  if (!occurrence) return null
  return {
    ...toRoundOccurrenceRecord(occurrence),
    estado: occurrence.estado,
    canalConfirmacion: occurrence.canalConfirmacion,
    nota: occurrence.nota,
  }
}

export async function getOccurrenceById(id: number) {
  return getRoundOccurrenceById(id)
}

export async function updateRoundOccurrenceStatus(
  id: number,
  data: {
    estado: 'pendiente' | 'cumplido' | 'cumplido_con_observacion' | 'vencido' | 'cancelado'
    confirmadoAt?: Date | null
    canalConfirmacion?: 'whatsapp' | 'panel' | 'system'
    nota?: string | null
    escaladoAt?: Date | null
  }
) {
  const updates: Record<string, unknown> = {
    estado: data.estado,
    updatedAt: new Date(),
  }
  if (data.confirmadoAt !== undefined) updates.confirmadoAt = data.confirmadoAt
  if (data.canalConfirmacion !== undefined) updates.canalConfirmacion = data.canalConfirmacion
  if (data.nota !== undefined) updates.nota = data.nota
  if (data.escaladoAt !== undefined) updates.escaladoAt = data.escaladoAt
  await db.update(schema.rondasOcurrencia).set(updates as any).where(eq(schema.rondasOcurrencia.id, id)).run()
}

export async function markOccurrenceReply(
  id: number,
  estado: 'cumplido' | 'cumplido_con_observacion' | 'vencido',
  nota?: string | null
) {
  await updateRoundOccurrenceStatus(id, {
    estado,
    nota: nota ?? null,
    confirmadoAt: new Date(),
    canalConfirmacion: 'whatsapp',
  })
}

export async function markReminderSent(id: number, at: Date) {
  await db.update(schema.rondasOcurrencia).set({
    recordatorioEnviadoAt: at,
    updatedAt: at,
  } as any).where(eq(schema.rondasOcurrencia.id, id)).run()
}

export async function markOccurrenceOverdue(id: number) {
  await db.update(schema.rondasOcurrencia).set({
    estado: 'vencido',
    updatedAt: new Date(),
  } as any).where(eq(schema.rondasOcurrencia.id, id)).run()
}

export async function createRoundEvent(event: {
  occurrenceId: number
  type: 'recordatorio' | 'confirmacion' | 'observacion' | 'vencimiento' | 'escalacion' | 'admin_update'
  at?: Date
  actorType?: 'system' | 'employee' | 'admin'
  actorId?: number | null
  actorName?: string | null
  description?: string
  metadata?: Record<string, unknown> | null
}) {
  await db.insert(schema.rondasEvento).values({
    ocurrenciaId: event.occurrenceId,
    tipo: event.type,
    actorTipo: event.actorType ?? 'system',
    actorId: event.actorId ?? null,
    actorNombre: event.actorName ?? null,
    descripcion: event.description ?? describeRoundEvent(event.type),
    metadataJson: event.metadata ? JSON.stringify(event.metadata) : null,
    createdAt: event.at ?? new Date(),
  }).run()
}

export async function addOccurrenceEvent(event: {
  occurrenceId: number
  type: 'recordatorio' | 'confirmacion' | 'observacion' | 'vencimiento' | 'escalacion' | 'admin_update'
  at: Date
  actorType?: 'system' | 'employee' | 'admin'
  actorId?: number | null
  actorName?: string | null
  description?: string
  metadata?: Record<string, unknown> | null
}) {
  await createRoundEvent({
    occurrenceId: event.occurrenceId,
    type: event.type,
    at: event.at,
    actorType: event.actorType ?? 'system',
    actorId: event.actorId ?? null,
    actorName: event.actorName ?? null,
    description: event.description,
    metadata: event.metadata ?? { source: 'rounds-service' },
  })
}

export async function notifySupervisor(item: {
  id: number
  supervisorWaId?: string
  nombreRonda?: string
  empleadoNombre?: string
  fechaOperativa?: string
  programadoAtLabel?: string
}) {
  const waIds = await getRoundEscalationTargets(item.supervisorWaId)
  if (waIds.length === 0) return

  const message = [
    `Alerta supervisor: ${item.nombreRonda ?? 'Control de banos'}`,
    `Control ${item.id} vencido${item.programadoAtLabel ? ` a las ${item.programadoAtLabel}` : ''}.`,
    item.empleadoNombre ? `Responsable: ${item.empleadoNombre}.` : null,
    item.fechaOperativa ? `Fecha operativa: ${item.fechaOperativa}.` : null,
  ].filter(Boolean).join('\n')

  for (const waId of waIds) {
    await enqueueBotMessage(waId, message)
  }
  await db.update(schema.rondasOcurrencia).set({
    escaladoAt: new Date(),
    updatedAt: new Date(),
  } as any).where(eq(schema.rondasOcurrencia.id, item.id)).run()
  await createRoundEvent({
    occurrenceId: item.id,
    type: 'escalacion',
    actorType: 'system',
    metadata: { source: 'notifySupervisor' },
  })
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

function getOperationalTaskTiempoTrabajadoSegundos(task: any) {
  const acumulado = Number(task.trabajoAcumuladoSegundos ?? 0)
  if (!task.trabajoIniciadoAt) return acumulado
  const iniciadoAt = new Date(task.trabajoIniciadoAt).getTime()
  const adicional = Math.max(0, Math.floor((Date.now() - iniciadoAt) / 1000))
  return acumulado + adicional
}

function toOperationalTaskRecord(task: schema.TareaOperativa) {
  return {
    ...task,
    tiempoTrabajadoSegundos: getOperationalTaskTiempoTrabajadoSegundos(task),
  }
}

function compareOperationalTasks(left: any, right: any) {
  return operationalTaskStateRank(left.estado) - operationalTaskStateRank(right.estado) ||
    priorityRank(right.prioridad) - priorityRank(left.prioridad) ||
    Number(left.ordenAsignacion ?? 0) - Number(right.ordenAsignacion ?? 0) ||
    toMs(left.createdAt) - toMs(right.createdAt)
}

function operationalTaskStateRank(estado: string) {
  switch (estado) {
    case 'en_progreso': return 0
    case 'pausada': return 1
    case 'pendiente_confirmacion': return 2
    case 'pendiente_asignacion': return 3
    case 'rechazada': return 4
    case 'terminada': return 5
    case 'cancelada': return 6
    default: return 7
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
  return evento.tipo === 'timer' && (text.includes('iniciada') || text.includes('confirmo recepcion') || text.includes('confirmo recepcion'))
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
  return text.includes('no puede tomar la tarea')
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

function normalizeOptionalWaNumber(value?: string | null) {
  const normalized = normalizeWaNumber(value)
  return normalized || null
}

function toBuenosAiresDateKey(value: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(value)
}

function formatTimeLabel(value: Date | string | number) {
  return toDate(value).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

async function getRoundEscalationTargets(supervisorWaId?: string | null) {
  const directTarget = normalizeOptionalWaNumber(supervisorWaId)
  if (directTarget) return [directTarget]

  const rows = await db.select().from(schema.users)
  const fallbackTargets = rows
    .filter((user) => user.activo !== false && user.role === 'admin')
    .map((user) => normalizeOptionalWaNumber(user.waId))
    .filter((value): value is string => Boolean(value))

  return [...new Set(fallbackTargets)]
}

function toRoundOccurrenceRecord(occurrence: schema.RondaOcurrencia) {
  return {
    id: occurrence.id,
    plantillaId: occurrence.plantillaId,
    programacionId: occurrence.programacionId,
    fechaOperativa: occurrence.fechaOperativa,
    programadoAt: toDate(occurrence.programadoAt),
    programadoAtLabel: occurrence.programadoAtLabel ?? undefined,
    estado: occurrence.estado === 'vencido' ? 'vencido' : 'pendiente',
    recordatorioEnviadoAt: toNullableDate(occurrence.recordatorioEnviadoAt),
    confirmadoAt: toNullableDate(occurrence.confirmadoAt),
    escaladoAt: toNullableDate(occurrence.escaladoAt),
    empleadoId: occurrence.empleadoId,
    empleadoNombre: occurrence.empleadoNombre,
    empleadoWaId: occurrence.empleadoWaId,
    supervisorWaId: occurrence.supervisorWaId ?? undefined,
    nombreRonda: occurrence.nombreRonda,
  }
}

function toDate(value: Date | string | number) {
  return value instanceof Date ? value : new Date(value)
}

function toNullableDate(value: Date | string | number | null) {
  return value ? toDate(value) : null
}

function describeRoundEvent(type: 'recordatorio' | 'confirmacion' | 'observacion' | 'vencimiento' | 'escalacion' | 'admin_update') {
  switch (type) {
    case 'recordatorio': return 'Recordatorio enviado'
    case 'confirmacion': return 'Control confirmado'
    case 'observacion': return 'Control confirmado con observacion'
    case 'vencimiento': return 'Control vencido por falta de respuesta'
    case 'escalacion': return 'Incidente escalado a supervisor'
    case 'admin_update': return 'Actualizacion administrativa'
    default: return 'Evento de ronda'
  }
}
