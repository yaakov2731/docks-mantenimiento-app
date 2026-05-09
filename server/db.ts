import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { eq, and, or, like, inArray, sql, desc, not, isNull, isNotNull, lt, lte, gte } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import * as schema from '../drizzle/schema'
import { readEnv } from './_core/env'

const TURSO_URL = readEnv('TURSO_URL')
const TURSO_TOKEN = readEnv('TURSO_TOKEN')

if (!TURSO_URL || !TURSO_TOKEN) {
  throw new Error('TURSO_URL and TURSO_TOKEN env vars are required')
}

const DB_TIMEOUT_MS = 20_000

export function fetchWithTimeout(input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), DB_TIMEOUT_MS)
  // Node's undici crashes when a Request object is passed alongside init options
  // because it does new URL([object Request]). Use duck-typing (not instanceof)
  // to decompose the Request since instanceof fails across module boundaries.
  if (typeof input === 'object' && !(input instanceof URL) && 'url' in input) {
    const req = input as Request
    return fetch(req.url, {
      method: req.method,
      headers: req.headers,
      body: req.body,
      ...init,
      signal: controller.signal,
    }).finally(() => clearTimeout(id))
  }
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(id))
}

const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN, fetch: fetchWithTimeout })
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
      pago_diario INTEGER NOT NULL DEFAULT 0,
      pago_semanal INTEGER NOT NULL DEFAULT 0,
      pago_quincenal INTEGER NOT NULL DEFAULT 0,
      pago_mensual INTEGER NOT NULL DEFAULT 0,
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
    `CREATE TABLE IF NOT EXISTS gastronomia_planificacion_turnos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empleado_id INTEGER NOT NULL,
      empleado_nombre TEXT NOT NULL,
      empleado_wa_id TEXT,
      sector TEXT NOT NULL,
      puesto TEXT,
      fecha TEXT NOT NULL,
      trabaja INTEGER NOT NULL DEFAULT 1,
      hora_entrada TEXT NOT NULL,
      hora_salida TEXT NOT NULL,
      nota TEXT,
      estado TEXT NOT NULL DEFAULT 'borrador',
      publicado_at INTEGER,
      respondido_at INTEGER,
      respuesta_nota TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS gastronomia_planificacion_auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      sector TEXT NOT NULL,
      desde TEXT NOT NULL,
      hasta TEXT NOT NULL,
      affected_count INTEGER NOT NULL DEFAULT 0,
      actor_user_id INTEGER,
      actor_nombre TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS marcaciones_empleados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empleado_id INTEGER NOT NULL,
      entrada_at INTEGER NOT NULL,
      salida_at INTEGER,
      duracion_segundos INTEGER,
      local_asignado TEXT,
      fuente TEXT NOT NULL DEFAULT 'whatsapp',
      nota_entrada TEXT,
      nota_salida TEXT,
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
      retry_count INTEGER NOT NULL DEFAULT 0,
      error_msg TEXT,
      last_attempt_at INTEGER,
      priority INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      scheduled_at INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS bot_heartbeat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      last_seen_at INTEGER NOT NULL DEFAULT (unixepoch()),
      bot_version TEXT,
      pending_count INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS bot_session (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wa_number TEXT NOT NULL UNIQUE,
      user_type TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      current_menu TEXT NOT NULL DEFAULT 'main',
      context_data TEXT,
      menu_history TEXT,
      last_activity_at INTEGER NOT NULL DEFAULT (unixepoch()),
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
      first_contacted_at INTEGER,
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
      inicio_real_at INTEGER,
      pausado_at INTEGER,
      fin_real_at INTEGER,
      tiempo_acumulado_segundos INTEGER NOT NULL DEFAULT 0,
      responsable_programado_id INTEGER,
      responsable_programado_nombre TEXT,
      responsable_programado_wa_id TEXT,
      responsable_actual_id INTEGER,
      responsable_actual_nombre TEXT,
      responsable_actual_wa_id TEXT,
      asignacion_estado TEXT NOT NULL DEFAULT 'asignada',
      asignado_at INTEGER,
      reasignado_at INTEGER,
      reasignado_por_user_id INTEGER,
      reasignado_por_nombre TEXT,
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
    `CREATE TABLE IF NOT EXISTS leads_evento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      metadata_json TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS locatarios_cobranza (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      local TEXT NOT NULL,
      telefono_wa TEXT,
      email TEXT,
      cuit TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      notas TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS cobranzas_importaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      source_type TEXT NOT NULL,
      imported_by_id INTEGER,
      imported_by_name TEXT NOT NULL,
      period_label TEXT NOT NULL,
      fecha_corte TEXT,
      status TEXT NOT NULL DEFAULT 'importada',
      total_rows INTEGER NOT NULL DEFAULT 0,
      parsed_rows INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS cobranzas_saldos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      importacion_id INTEGER NOT NULL,
      locatario_id INTEGER,
      locatario_nombre TEXT NOT NULL,
      local TEXT,
      periodo TEXT NOT NULL,
      ingreso INTEGER,
      saldo INTEGER NOT NULL,
      dias_atraso INTEGER,
      telefono_wa TEXT,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      raw_json TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS cobranzas_notificaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      saldo_id INTEGER NOT NULL,
      locatario_id INTEGER,
      wa_number TEXT,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      bot_queue_id INTEGER,
      sent_by_id INTEGER,
      sent_by_name TEXT NOT NULL,
      sent_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS app_config (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
  ]
  for (const sql of stmts) {
    await client.execute(sql)
  }
  const indexStmts = [
    `CREATE UNIQUE INDEX IF NOT EXISTS tareas_operativas_unica_activa_por_empleado
      ON tareas_operativas(empleado_id)
      WHERE estado = 'en_progreso'`,
    `CREATE INDEX IF NOT EXISTS cobranzas_saldos_importacion_idx ON cobranzas_saldos(importacion_id)`,
    `CREATE INDEX IF NOT EXISTS cobranzas_saldos_estado_idx ON cobranzas_saldos(estado)`,
    `CREATE INDEX IF NOT EXISTS cobranzas_notificaciones_saldo_idx ON cobranzas_notificaciones(saldo_id)`,
    `CREATE INDEX IF NOT EXISTS gastronomia_planificacion_semana_idx ON gastronomia_planificacion_turnos(fecha, sector)`,
    `CREATE INDEX IF NOT EXISTS gastronomia_planificacion_empleado_idx ON gastronomia_planificacion_turnos(empleado_id, fecha)`,
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
    `ALTER TABLE leads ADD COLUMN first_contacted_at INTEGER`,
    `ALTER TABLE bot_queue ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE bot_queue ADD COLUMN error_msg TEXT`,
    `ALTER TABLE bot_queue ADD COLUMN last_attempt_at INTEGER`,
    `ALTER TABLE bot_queue ADD COLUMN priority INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE empleado_asistencia ADD COLUMN timestamp INTEGER`,
    `ALTER TABLE empleados ADD COLUMN pago_diario INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE empleados ADD COLUMN pago_semanal INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE empleados ADD COLUMN pago_quincenal INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE empleados ADD COLUMN pago_mensual INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE empleados ADD COLUMN puede_vender INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE empleados ADD COLUMN sector TEXT NOT NULL DEFAULT 'operativo'`,
    `ALTER TABLE empleados ADD COLUMN tipo_empleado TEXT NOT NULL DEFAULT 'operativo'`,
    `ALTER TABLE empleados ADD COLUMN puesto TEXT`,
    `ALTER TABLE empleados ADD COLUMN sheets_row INTEGER`,
    `ALTER TABLE rondas_ocurrencia ADD COLUMN inicio_real_at INTEGER`,
    `ALTER TABLE rondas_ocurrencia ADD COLUMN pausado_at INTEGER`,
    `ALTER TABLE rondas_ocurrencia ADD COLUMN fin_real_at INTEGER`,
    `ALTER TABLE rondas_ocurrencia ADD COLUMN tiempo_acumulado_segundos INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE rondas_ocurrencia ADD COLUMN responsable_programado_id INTEGER`,
    `ALTER TABLE rondas_ocurrencia ADD COLUMN responsable_programado_nombre TEXT`,
    `ALTER TABLE rondas_ocurrencia ADD COLUMN responsable_programado_wa_id TEXT`,
    `ALTER TABLE rondas_ocurrencia ADD COLUMN responsable_actual_id INTEGER`,
    `ALTER TABLE rondas_ocurrencia ADD COLUMN responsable_actual_nombre TEXT`,
    `ALTER TABLE rondas_ocurrencia ADD COLUMN responsable_actual_wa_id TEXT`,
    `ALTER TABLE rondas_ocurrencia ADD COLUMN asignacion_estado TEXT NOT NULL DEFAULT 'asignada'`,
    `ALTER TABLE rondas_ocurrencia ADD COLUMN asignado_at INTEGER`,
    `ALTER TABLE rondas_ocurrencia ADD COLUMN reasignado_at INTEGER`,
    `ALTER TABLE rondas_ocurrencia ADD COLUMN reasignado_por_user_id INTEGER`,
    `ALTER TABLE rondas_ocurrencia ADD COLUMN reasignado_por_nombre TEXT`,
    `ALTER TABLE leads ADD COLUMN score INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE leads ADD COLUMN temperature TEXT`,
    `ALTER TABLE leads ADD COLUMN auto_followup_count INTEGER`,
    `ALTER TABLE leads ADD COLUMN last_bot_msg_at INTEGER`,
    `ALTER TABLE leads ADD COLUMN needs_attention_at INTEGER`,
    `ALTER TABLE empleados ADD COLUMN puede_gastronomia INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE marcaciones_empleados ADD COLUMN local_asignado TEXT`,
    `ALTER TABLE bot_queue ADD COLUMN scheduled_at INTEGER`,
  ]
  for (const sql of alterStmts) {
    try {
      await client.execute(sql)
    } catch (_error) {
      // Column already exists in upgraded databases.
    }
  }
  try {
    await client.execute(`
      UPDATE leads
      SET first_contacted_at = updated_at
      WHERE first_contacted_at IS NULL
        AND estado IN ('contactado', 'visito', 'cerrado')
    `)
  } catch (_error) {
    // Older databases are upgraded by the ALTER loop above; keep boot resilient.
  }
  // Seed default bot config keys (INSERT OR IGNORE = skip if already exists)
  const defaultConfigs: [string, string][] = [
    ['bot_autoresponder_activo', '1'],
    ['followup1_delay_min', '30'],
    ['followup2_delay_horas', '4'],
    ['followup1_mensaje',
      '📍 *Docks del Puerto* — seguimos por acá.\n\nHola *{{nombre}}*, ¿pudiste revisar tu consulta sobre los locales comerciales?\n\nSi tenés alguna pregunta o querés coordinar una visita al predio,\nrespondé este mensaje y te damos una mano.\n\n_Docks del Puerto · Puerto de Frutos, Tigre_ 🏢'],
    ['followup2_mensaje',
      '🏢 *Docks del Puerto* — último mensaje de nuestra parte.\n\nHola *{{nombre}}*, si seguís evaluando un espacio para tu marca,\npodemos mostrarte el predio y ver juntos qué tiene sentido.\n\nRespondé *"visita"* y te coordinamos un horario con\nel equipo comercial. Sin compromiso.\n\n_Docks del Puerto · Shopping & Lifestyle · Tigre_ ✨'],
  ]
  for (const [clave, valor] of defaultConfigs) {
    try {
      await client.execute({
        sql: `INSERT OR IGNORE INTO app_config (clave, valor) VALUES (?, ?)`,
        args: [clave, valor],
      })
    } catch (_error) {
      // Ignore — table may not exist on old DBs yet; ALTER loop below handles it.
    }
  }
  console.log('[DB] Tables ready')
}

// ─── App Config ───────────────────────────────────────────────────────────────

export async function getAppConfig(clave: string): Promise<string | null> {
  const rows = await db.select().from(schema.appConfig).where(eq(schema.appConfig.clave, clave))
  return rows[0]?.valor ?? null
}

export async function setAppConfig(clave: string, valor: string): Promise<void> {
  await db.insert(schema.appConfig)
    .values({ clave, valor, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.appConfig.clave, set: { valor, updatedAt: new Date() } })
    .run()
}

export async function getAllBotConfig(): Promise<Record<string, string>> {
  const rows = await db.select().from(schema.appConfig)
  return Object.fromEntries(rows.map(r => [r.clave, r.valor]))
}

function assertNotFutureAttendanceDate(fechaHora: Date) {
  if (toMs(fechaHora) > Date.now()) {
    throw new Error('No se permiten marcaciones futuras')
  }
}

export const ATTENDANCE_ACTIONS = ['entrada', 'inicio_almuerzo', 'fin_almuerzo', 'salida'] as const
export type AttendanceAction = typeof ATTENDANCE_ACTIONS[number]
const ATTENDANCE_DUPLICATE_WINDOW_MS = 15_000
const attendanceRegistrationTails = new Map<number, Promise<void>>()

function logAttendanceDebug(message: string, payload?: Record<string, unknown>) {
  if (payload) {
    console.log(`[attendance] ${message} ${JSON.stringify(payload)}`)
    return
  }
  console.log(`[attendance] ${message}`)
}

async function withAttendanceRegistrationLock<T>(empleadoId: number, task: () => Promise<T>) {
  const previousTail = attendanceRegistrationTails.get(empleadoId) ?? Promise.resolve()
  let releaseCurrent = () => {}
  const currentGate = new Promise<void>((resolve) => {
    releaseCurrent = resolve
  })
  const currentTail = previousTail.catch(() => undefined).then(() => currentGate)
  attendanceRegistrationTails.set(empleadoId, currentTail)
  await previousTail.catch(() => undefined)

  try {
    return await task()
  } finally {
    releaseCurrent()
    if (attendanceRegistrationTails.get(empleadoId) === currentTail) {
      attendanceRegistrationTails.delete(empleadoId)
    }
  }
}

function isRecentDuplicateAttendanceAction(status: Awaited<ReturnType<typeof getEmpleadoAttendanceStatus>>, tipo: AttendanceAction, canal: 'whatsapp' | 'panel' | 'manual_admin', nowMs: number) {
  if (status.lastAction !== tipo || !status.lastActionAt) return false
  if (status.lastChannel && status.lastChannel !== canal) return false
  const diffMs = Math.max(0, nowMs - status.lastActionAt.getTime())
  return diffMs <= ATTENDANCE_DUPLICATE_WINDOW_MS
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

export function buildAttendanceTurns(events: Array<any>, now = Date.now()) {
  const sortedEvents = [...events].sort((a, b) => getAttendanceEventTime(a) - getAttendanceEventTime(b))
  const turns: Array<any> = []
  let currentTurn: any = null

  for (const event of sortedEvents) {
    const eventMs = getAttendanceEventTime(event)

    if (event.tipo === 'entrada') {
      if (currentTurn) {
        continue
      }
      currentTurn = {
        fecha: toBuenosAiresDateKey(eventMs),
        entradaAt: new Date(eventMs),
        salidaAt: null,
        inicioAlmuerzoAt: null,
        finAlmuerzoAt: null,
        lunchStartedAt: null as Date | null,
        grossSeconds: 0,
        lunchSeconds: 0,
        workedSeconds: 0,
        entradaCanal: event.canal ?? null,
        salidaCanal: null,
        turnoAbierto: true,
      }
      turns.push(currentTurn)
      continue
    }

    if (!currentTurn) continue

    if (event.tipo === 'inicio_almuerzo' && !currentTurn.lunchStartedAt) {
      currentTurn.inicioAlmuerzoAt = new Date(eventMs)
      currentTurn.lunchStartedAt = new Date(eventMs)
      continue
    }

    if (event.tipo === 'fin_almuerzo' && currentTurn.lunchStartedAt) {
      currentTurn.finAlmuerzoAt = new Date(eventMs)
      currentTurn.lunchSeconds += Math.max(0, Math.floor((eventMs - currentTurn.lunchStartedAt.getTime()) / 1000))
      currentTurn.lunchStartedAt = null
      continue
    }

    if (event.tipo === 'salida') {
      currentTurn.salidaAt = new Date(eventMs)
      currentTurn.salidaCanal = event.canal ?? null
      currentTurn.grossSeconds = Math.max(0, Math.floor((eventMs - currentTurn.entradaAt.getTime()) / 1000))
      if (currentTurn.lunchStartedAt) {
        currentTurn.lunchSeconds += Math.max(0, Math.floor((eventMs - currentTurn.lunchStartedAt.getTime()) / 1000))
        currentTurn.lunchStartedAt = null
      }
      currentTurn.workedSeconds = Math.max(0, currentTurn.grossSeconds - currentTurn.lunchSeconds)
      currentTurn.turnoAbierto = false
      currentTurn = null
    }
  }

  if (currentTurn) {
    const grossSeconds = Math.max(0, Math.floor((now - currentTurn.entradaAt.getTime()) / 1000))
    const lunchSeconds = currentTurn.lunchStartedAt
      ? currentTurn.lunchSeconds + Math.max(0, Math.floor((now - currentTurn.lunchStartedAt.getTime()) / 1000))
      : currentTurn.lunchSeconds
    currentTurn.grossSeconds = grossSeconds
    currentTurn.lunchSeconds = lunchSeconds
    currentTurn.workedSeconds = Math.max(0, grossSeconds - lunchSeconds)
    currentTurn.turnoAbierto = true
  }

  return turns.map((turn, index) => ({
    ...turn,
    id: `${turn.fecha}-${index + 1}-${turn.entradaAt?.getTime?.() ?? index + 1}`,
  }))
}

export async function getEmpleadoAttendanceStatus(empleadoId: number) {
  const rows = await getEmpleadoAttendanceEvents(empleadoId)
  const latest = rows[rows.length - 1] ?? null
  const marcaciones = await db.select().from(schema.marcacionesEmpleados).where(eq(schema.marcacionesEmpleados.empleadoId, empleadoId))
  const { start, end } = getBuenosAiresDayRange()
  const now = Date.now()
  const turns = buildAttendanceTurns(rows, now)
  const todayRows = rows.filter(row => isWithinDay(getAttendanceEventTime(row), start, end))
  const todayTurns = turns.filter(turn => {
    const entryMs = turn.entradaAt instanceof Date ? turn.entradaAt.getTime() : 0
    return isWithinDay(entryMs, start, end)
  })
  const lastEntry = [...rows].reverse().find(row => row.tipo === 'entrada') ?? null
  const lastExit = [...rows].reverse().find(row => row.tipo === 'salida') ?? null
  const lastLunchStart = [...rows].reverse().find(row => row.tipo === 'inicio_almuerzo') ?? null
  const lastLunchEnd = [...rows].reverse().find(row => row.tipo === 'fin_almuerzo') ?? null
  const currentTurn = [...turns].reverse().find(turn => turn.turnoAbierto) ?? null
  const lastCompletedTurn = [...turns].reverse().find(turn => !turn.turnoAbierto) ?? null
  const currentMarcacion = [...marcaciones]
    .filter(row => !row.salidaAt)
    .sort((a, b) => new Date(b.entradaAt as any).getTime() - new Date(a.entradaAt as any).getTime())[0] ?? null
  const lastMarcacion = [...marcaciones]
    .sort((a, b) => new Date(b.entradaAt as any).getTime() - new Date(a.entradaAt as any).getTime())[0] ?? null
  const assignedSector = currentMarcacion?.localAsignado ?? lastMarcacion?.localAsignado ?? null
  const onShift = !!currentTurn
  const onLunch = !!currentTurn?.lunchStartedAt
  const currentShiftGrossSeconds = onShift ? Number(currentTurn?.grossSeconds ?? 0) : 0
  const currentShiftLunchSeconds = onShift ? Number(currentTurn?.lunchSeconds ?? 0) : 0
  const workedSecondsToday = onShift ? Math.max(0, currentShiftGrossSeconds - currentShiftLunchSeconds) : 0
  const grossWorkedSecondsToday = onShift ? currentShiftGrossSeconds : 0
  const todayLunchSeconds = todayTurns.reduce((total, turn) => total + Number(turn.lunchSeconds ?? 0), 0)
  const currentShiftSeconds = workedSecondsToday
  const currentLunchSeconds = onLunch && currentTurn?.lunchStartedAt
    ? Math.max(0, Math.floor((now - currentTurn.lunchStartedAt.getTime()) / 1000))
    : 0

  return {
    onShift,
    onLunch,
    lastAction: latest?.tipo ?? null,
    lastActionAt: latest ? new Date(getAttendanceEventTime(latest)) : null,
    lastChannel: latest?.canal ?? null,
    lastEntryAt: lastEntry ? new Date(getAttendanceEventTime(lastEntry)) : null,
    lastExitAt: lastExit ? new Date(getAttendanceEventTime(lastExit)) : null,
    lunchStartedAt: currentTurn?.lunchStartedAt ?? null,
    lastLunchStartAt: lastLunchStart ? new Date(getAttendanceEventTime(lastLunchStart)) : null,
    lastLunchEndAt: lastLunchEnd ? new Date(getAttendanceEventTime(lastLunchEnd)) : null,
    workedSecondsToday,
    grossWorkedSecondsToday,
    todayLunchSeconds,
    currentShiftGrossSeconds,
    currentShiftLunchSeconds,
    currentShiftSeconds,
    currentLunchSeconds,
    lastShiftGrossSeconds: Number(lastCompletedTurn?.grossSeconds ?? 0),
    lastShiftLunchSeconds: Number(lastCompletedTurn?.lunchSeconds ?? 0),
    lastShiftWorkedSeconds: Number(lastCompletedTurn?.workedSeconds ?? 0),
    lastShiftStartedAt: lastCompletedTurn?.entradaAt ?? null,
    lastShiftEndedAt: lastCompletedTurn?.salidaAt ?? null,
    assignedSector,
    assignedLocalLabel: assignedSector ? getGastronomiaSectorLabel(assignedSector) : null,
    todayEntries: todayRows.filter(row => row.tipo === 'entrada').length,
    todayLunchStarts: todayRows.filter(row => row.tipo === 'inicio_almuerzo').length,
    todayLunchEnds: todayRows.filter(row => row.tipo === 'fin_almuerzo').length,
    todayExits: todayRows.filter(row => row.tipo === 'salida').length,
    todayTurns: todayTurns.length,
  }
}

export async function registerEmpleadoAttendance(
  empleadoId: number,
  tipo: AttendanceAction,
  canal: 'whatsapp' | 'panel' | 'manual_admin' = 'panel',
  nota?: string
) {
  return withAttendanceRegistrationLock(empleadoId, async () => {
    logAttendanceDebug('register:start', {
      empleadoId,
      tipo,
      canal,
      nota: nota ?? null,
    })
    const current = await getEmpleadoAttendanceStatus(empleadoId)
    const nowMs = Date.now()

    if (isRecentDuplicateAttendanceAction(current, tipo, canal, nowMs)) {
      logAttendanceDebug('register:blocked', {
        empleadoId,
        tipo,
        canal,
        code: 'duplicate_ignored',
        current,
      })
      return { success: true, code: 'ok' as const, status: current }
    }

    if (tipo === 'entrada' && current.onShift) {
      logAttendanceDebug('register:blocked', {
        empleadoId,
        tipo,
        canal,
        code: 'already_on_shift',
        current,
      })
      return { success: false, code: 'already_on_shift' as const, status: current }
    }

    if (tipo === 'inicio_almuerzo') {
      if (!current.onShift) {
        logAttendanceDebug('register:blocked', {
          empleadoId,
          tipo,
          canal,
          code: 'not_on_shift',
          current,
        })
        return { success: false, code: 'not_on_shift' as const, status: current }
      }
      if (current.onLunch) {
        logAttendanceDebug('register:blocked', {
          empleadoId,
          tipo,
          canal,
          code: 'already_on_lunch',
          current,
        })
        return { success: false, code: 'already_on_lunch' as const, status: current }
      }
    }

    if (tipo === 'fin_almuerzo' && !current.onLunch) {
      logAttendanceDebug('register:blocked', {
        empleadoId,
        tipo,
        canal,
        code: 'not_on_lunch',
        current,
      })
      return { success: false, code: 'not_on_lunch' as const, status: current }
    }

    if (tipo === 'salida') {
      if (!current.onShift) {
        logAttendanceDebug('register:blocked', {
          empleadoId,
          tipo,
          canal,
          code: 'not_on_shift',
          current,
        })
        return { success: false, code: 'not_on_shift' as const, status: current }
      }
      if (current.onLunch) {
        logAttendanceDebug('register:blocked', {
          empleadoId,
          tipo,
          canal,
          code: 'on_lunch',
          current,
        })
        return { success: false, code: 'on_lunch' as const, status: current }
      }
    }

    await db.insert(schema.empleadoAsistencia).values({
      empleadoId,
      tipo,
      timestamp: new Date(),
      canal,
      nota,
    }).run()
    logAttendanceDebug('register:event_inserted', {
      empleadoId,
      tipo,
      canal,
    })

    const assignedLocal = tipo === 'entrada'
      ? await resolveAttendanceAssignedLocal(empleadoId, new Date())
      : null

  await syncLegacyAttendanceMirror({
    empleadoId,
    tipo,
    canal,
    nota,
    localAsignado: assignedLocal?.sector ?? null,
    statusBeforeChange: current,
  })

    const status = await getEmpleadoAttendanceStatus(empleadoId)
    logAttendanceDebug('register:success', {
      empleadoId,
      tipo,
      canal,
      status,
    })

    return {
      success: true,
      code: 'ok' as const,
      status,
    }
  })
}

export async function createManualAttendanceEvent({
  empleadoId,
  tipo,
  fechaHora,
  nota,
}: {
  empleadoId: number
  tipo: AttendanceAction
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
  tipo: AttendanceAction
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
  const active = rows.find(user => user.activo === true)
  return active ?? null
}
export async function getUsers() {
  const rows = await db.select().from(schema.users)
  return rows
    .filter(user => user.activo === true)
    .sort((a, b) => a.name.localeCompare(b.name))
}
export async function getSalesUsers() {
  const panelUsers = await getUsers()
  const salesPanelUsers = panelUsers.filter(u => u.role === 'sales' || u.role === 'admin')

  const allEmpleados = await db.select().from(schema.empleados).where(eq(schema.empleados.activo, true))
  const vendedorEmpleados = allEmpleados
    .filter(e => e.puedeVender && e.waId)
    .map(e => ({
      id: e.id,
      name: e.nombre,
      role: 'sales' as const,
      waId: e.waId,
      activo: true,
    }))

  const panelUserIds = new Set(salesPanelUsers.map(u => u.id))
  const uniqueVendedorEmpleados = vendedorEmpleados.filter(e => !panelUserIds.has(e.id))

  return [...salesPanelUsers, ...uniqueVendedorEmpleados]
}
export async function getUserById(id: number) {
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, id))
  return rows[0] ?? null
}
export async function createUser(data: { username: string; password: string; name: string; role?: 'admin' | 'employee' | 'sales' | 'collections'; waId?: string }) {
  await db.insert(schema.users).values(data).run()
}
export async function createPanelUser(data: { username: string; password: string; name: string; role: 'admin' | 'sales' | 'collections'; waId?: string }) {
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

export async function eliminarReporte(id: number) {
  await db.delete(schema.actualizaciones).where(eq(schema.actualizaciones.reporteId, id)).run()
  await db.delete(schema.reportes).where(eq(schema.reportes.id, id)).run()
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
  await db.insert(schema.empleados).values({
    ...data,
    waId: normalizeWaNumber(data.waId ?? undefined) || null,
  }).run()
}
export async function actualizarEmpleado(id: number, data: Partial<typeof schema.empleados.$inferInsert>) {
  const normalized = { ...data }
  if ('waId' in normalized) {
    normalized.waId = normalizeWaNumber(normalized.waId ?? undefined) || null
  }
  await db.update(schema.empleados).set(normalized as any).where(eq(schema.empleados.id, id)).run()
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
  const matches = rows.filter(e => {
    if (!e.waId) return false
    const stored = e.waId.replace(/\D/g, '')
    // Match exact OR if incoming number ends with stored (handles missing country code)
    return normalized === stored || normalized.endsWith(stored)
  })

  if (matches.length === 0) return null

  matches.sort((left, right) => {
    const score = (empleado: typeof matches[number]) => {
      let total = 0
      if ((empleado as any).puedeVender) total += 4
      if ((empleado as any).puedeGastronomia) total += 3
      if ((empleado as any).tipoEmpleado === 'gastronomia') total += 2
      if ((empleado as any).sector && (empleado as any).sector !== 'operativo') total += 1
      return total
    }

    return score(right) - score(left)
  })

  return matches[0] ?? null
}
export async function getJornadaActivaEmpleado(empleadoId: number) {
  const rows = await db.select().from(schema.marcacionesEmpleados).where(eq(schema.marcacionesEmpleados.empleadoId, empleadoId))
  const active = rows
    .filter(row => !row.salidaAt)
    .sort((a, b) => new Date(b.entradaAt as any).getTime() - new Date(a.entradaAt as any).getTime())[0] ?? null
  if (active) return active

  const attendance = await getEmpleadoAttendanceStatus(empleadoId)
  if (!attendance.onShift || !attendance.lastEntryAt) return null

  const inserted = await db.insert(schema.marcacionesEmpleados).values({
    empleadoId,
    entradaAt: attendance.lastEntryAt,
    fuente: mapAttendanceChannelToLegacyFuente(attendance.lastChannel),
    notaEntrada: null,
  } as any).returning()
  return inserted[0] ?? null
}
export async function registrarEntradaEmpleado(empleadoId: number, opts?: { fuente?: 'whatsapp' | 'panel' | 'otro'; nota?: string }) {
  const jornadaActiva = await getJornadaActivaEmpleado(empleadoId)
  if (jornadaActiva) return { marcacion: jornadaActiva, alreadyOpen: true as const }
  const result = await registerEmpleadoAttendance(
    empleadoId,
    'entrada',
    mapLegacyFuenteToAttendanceChannel(opts?.fuente),
    opts?.nota,
  )
  return {
    marcacion: await getJornadaActivaEmpleado(empleadoId),
    alreadyOpen: !result.success,
  }
}
export async function registrarSalidaEmpleado(empleadoId: number, opts?: { nota?: string }) {
  const jornadaActiva = await getJornadaActivaEmpleado(empleadoId)
  if (!jornadaActiva) return null
  const result = await registerEmpleadoAttendance(empleadoId, 'salida', 'whatsapp', opts?.nota)
  if (!result.success) return null
  const rows = await db.select().from(schema.marcacionesEmpleados).where(eq(schema.marcacionesEmpleados.id, jornadaActiva.id))
  return rows[0] ?? null
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

export async function deleteOperationalTasks(taskIds: number[]) {
  const ids = [...new Set(taskIds.filter((id) => Number.isFinite(id)))]
  if (ids.length === 0) return 0

  return db.transaction(async (tx) => {
    const rows = await tx.select({ id: schema.tareasOperativas.id })
      .from(schema.tareasOperativas)
      .where(inArray(schema.tareasOperativas.id, ids))

    if (rows.length === 0) return 0

    const existingIds = rows.map((row) => row.id)

    await tx.delete(schema.tareasOperativasEvento)
      .where(inArray(schema.tareasOperativasEvento.tareaId, existingIds))
      .run()

    await tx.delete(schema.tareasOperativas)
      .where(inArray(schema.tareasOperativas.id, existingIds))
      .run()

    return existingIds.length
  })
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
  const { start, end } = getBuenosAiresDayRange()
  const [rows, events] = await Promise.all([
    listOperationalTasks(),
    db.select().from(schema.tareasOperativasEvento).where(
      and(
        eq(schema.tareasOperativasEvento.tipo, 'rechazo'),
        gte(schema.tareasOperativasEvento.createdAt, new Date(start)),
        lt(schema.tareasOperativasEvento.createdAt, new Date(end)),
      )
    ),
  ])
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
    rechazadasHoy: events.length,
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

// --- TAREAS DE RONDAS DE BAÑOS ASIGNABLES ---
export async function createBathroomRoundTask(input: {
  empleadoId: number
  empleadoNombre: string
  empleadoWaId?: string
  titulo: string
  descripcion: string
  ubicacion: string
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  checklistObjetivo?: string
  intervaloHoras?: number
  programadoPara?: Date
}): Promise<number> {
  const now = new Date()
  const taskId = await createOperationalTask({
    origen: 'manual',
    tipoTrabajo: 'ronda_banos',
    titulo: input.titulo,
    descripcion: input.descripcion,
    ubicacion: input.ubicacion,
    prioridad: input.prioridad,
    estado: 'pendiente_asignacion',
    empleadoId: input.empleadoId,
    empleadoNombre: input.empleadoNombre,
    empleadoWaId: input.empleadoWaId,
    asignadoAt: now,
    ordenAsignacion: 0,
    createdAt: now,
    updatedAt: now,
  })

  // Agregar evento de asignación
  await addOperationalTaskEvent({
    tareaId: taskId,
    tipo: 'asignacion',
    actorTipo: 'admin',
    actorId: null,
    actorNombre: 'Sistema',
    descripcion: `Ronda de baños asignada: ${input.titulo}`,
    metadata: {
      tipoTrabajo: 'ronda_banos',
      checklistObjetivo: input.checklistObjetivo,
      intervaloHoras: input.intervaloHoras,
      programadoPara: input.programadoPara?.toISOString(),
    },
    createdAt: now,
  })

  return taskId
}

export async function getBathroomRoundTasksForEmployee(empleadoId: number) {
  const rows = await db.select().from(schema.tareasOperativas)
    .where(and(
      eq(schema.tareasOperativas.tipoTrabajo, 'ronda_banos'),
      eq(schema.tareasOperativas.empleadoId, empleadoId),
      not(inArray(schema.tareasOperativas.estado, ['terminada', 'cancelada', 'rechazada']))
    ))
    .orderBy(desc(schema.tareasOperativas.createdAt))

  return rows.map(toOperationalTaskRecord)
}

export async function iniciarTrabajoTareaOperativa(taskId: number) {
  const task = await getOperationalTaskById(taskId)
  if (!task) throw new Error('Tarea operativa no encontrada')
  if (task.estado !== 'pendiente_confirmacion') throw new Error('La tarea debe estar pendiente de confirmación para iniciarse')

  const now = new Date()
  await persistOperationalTaskChange(taskId, {
    estado: 'en_progreso',
    trabajoIniciadoAt: now,
    pausadoAt: null,
  }, [{
    tareaId: taskId,
    tipo: 'inicio',
    actorTipo: 'employee',
    actorId: task.empleadoId,
    actorNombre: task.empleadoNombre,
    descripcion: 'Trabajo iniciado',
  }])
}

export async function pausarTrabajoTareaOperativa(taskId: number) {
  const task = await getOperationalTaskById(taskId)
  if (!task) throw new Error('Tarea operativa no encontrada')
  if (task.estado !== 'en_progreso') throw new Error('La tarea debe estar en progreso para pausarse')

  const now = new Date()
  const trabajoAcumulado = getOperationalTaskTiempoTrabajadoSegundosAt(task, now)

  await persistOperationalTaskChange(taskId, {
    estado: 'pausada',
    pausadoAt: now,
    trabajoAcumuladoSegundos: trabajoAcumulado,
  }, [{
    tareaId: taskId,
    tipo: 'pausa',
    actorTipo: 'employee',
    actorId: task.empleadoId,
    actorNombre: task.empleadoNombre,
    descripcion: 'Trabajo pausado',
  }])
}

export async function reanudarTrabajoTareaOperativa(taskId: number) {
  const task = await getOperationalTaskById(taskId)
  if (!task) throw new Error('Tarea operativa no encontrada')
  if (task.estado !== 'pausada') throw new Error('La tarea debe estar pausada para reanudarse')

  await persistOperationalTaskChange(taskId, {
    estado: 'en_progreso',
    pausadoAt: null,
  }, [{
    tareaId: taskId,
    tipo: 'reanudar',
    actorTipo: 'employee',
    actorId: task.empleadoId,
    actorNombre: task.empleadoNombre,
    descripcion: 'Trabajo reanudado',
  }])
}

export async function completarTrabajoTareaOperativa(taskId: number) {
  const task = await getOperationalTaskById(taskId)
  if (!task) throw new Error('Tarea operativa no encontrada')
  if (task.estado !== 'en_progreso') throw new Error('La tarea debe estar en progreso para completarse')

  const now = new Date()
  const trabajoAcumulado = getOperationalTaskTiempoTrabajadoSegundosAt(task, now)

  await persistOperationalTaskChange(taskId, {
    estado: 'terminada',
    terminadoAt: now,
    trabajoAcumuladoSegundos: trabajoAcumulado,
  }, [{
    tareaId: taskId,
    tipo: 'terminacion',
    actorTipo: 'employee',
    actorId: task.empleadoId,
    actorNombre: task.empleadoNombre,
    descripcion: 'Trabajo completado',
  }])
}

export async function assignBathroomRoundTask(taskId: number, empleadoId: number, empleadoNombre: string, empleadoWaId?: string) {
  const now = new Date()
  await updateOperationalTask(taskId, {
    empleadoId,
    empleadoNombre,
    empleadoWaId,
    estado: 'pendiente_confirmacion',
    asignadoAt: now,
  })

  await addOperationalTaskEvent({
    tareaId: taskId,
    tipo: 'asignacion',
    actorTipo: 'admin',
    actorId: null,
    actorNombre: 'Sistema',
    descripcion: `Ronda asignada a ${empleadoNombre}`,
    createdAt: now,
  })
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

// --- COBRANZAS ---
type CobranzaSaldoInput = {
  locatarioNombre: string
  local?: string
  periodo: string
  ingreso?: number | null
  saldo: number
  diasAtraso?: number | null
  telefonoWa?: string | null
  raw?: unknown
}

function normalizeCobranzaKey(value?: string | null) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function findMatchingLocatario(
  row: CobranzaSaldoInput,
  locatarios: Array<typeof schema.locatariosCobranza.$inferSelect>,
) {
  const localKey = normalizeCobranzaKey(row.local)
  if (localKey) {
    const byLocal = locatarios.filter((locatario) => normalizeCobranzaKey(locatario.local) === localKey)
    if (byLocal.length === 1) return byLocal[0]
  }

  const nameKey = normalizeCobranzaKey(row.locatarioNombre)
  if (!nameKey) return null
  const byName = locatarios.filter((locatario) => normalizeCobranzaKey(locatario.nombre) === nameKey)
  if (byName.length === 1) return byName[0]
  return null
}

export async function listLocatariosCobranza() {
  const rows = await db.select().from(schema.locatariosCobranza)
  return rows
    .filter((row) => row.activo === true)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
}

export async function upsertLocatarioCobranza(data: {
  id?: number
  nombre: string
  local: string
  telefonoWa?: string | null
  email?: string | null
  cuit?: string | null
  notas?: string | null
}) {
  const payload = {
    nombre: data.nombre.trim(),
    local: data.local.trim(),
    telefonoWa: normalizeWaNumber(data.telefonoWa) || null,
    email: data.email?.trim() || null,
    cuit: data.cuit?.trim() || null,
    notas: data.notas?.trim() || null,
    updatedAt: new Date(),
  }

  if (data.id) {
    await db.update(schema.locatariosCobranza).set(payload as any).where(eq(schema.locatariosCobranza.id, data.id)).run()
    return data.id
  }

  const rows = await db.insert(schema.locatariosCobranza).values({
    ...payload,
    activo: true,
  } as any).returning({ id: schema.locatariosCobranza.id })
  return rows[0].id
}

export async function saveCobranzaImportacion(input: {
  filename: string
  sourceType: 'pdf' | 'xlsx' | 'csv' | 'manual'
  periodLabel: string
  fechaCorte?: string | null
  totalRows: number
  rows: CobranzaSaldoInput[]
  importedBy: { id: number; name: string }
}) {
  const locatarios = await listLocatariosCobranza()
  const importRows = await db.insert(schema.cobranzasImportaciones).values({
    filename: input.filename,
    sourceType: input.sourceType,
    importedById: input.importedBy.id,
    importedByName: input.importedBy.name,
    periodLabel: input.periodLabel,
    fechaCorte: input.fechaCorte || null,
    totalRows: input.totalRows,
    parsedRows: input.rows.length,
  }).returning({ id: schema.cobranzasImportaciones.id })
  const importacionId = importRows[0].id

  for (const row of input.rows) {
    const locatario = findMatchingLocatario(row, locatarios)
    const telefonoWa = normalizeWaNumber(row.telefonoWa) || locatario?.telefonoWa || null
    await db.insert(schema.cobranzasSaldos).values({
      importacionId,
      locatarioId: locatario?.id ?? null,
      locatarioNombre: row.locatarioNombre.trim(),
      local: row.local?.trim() || locatario?.local || null,
      periodo: row.periodo || input.periodLabel,
      ingreso: row.ingreso ?? null,
      saldo: Math.round(row.saldo),
      diasAtraso: row.diasAtraso ?? null,
      telefonoWa,
      estado: telefonoWa ? 'pendiente' : 'error_contacto',
      rawJson: JSON.stringify(row.raw ?? row),
    }).run()
  }

  return { id: importacionId, creados: input.rows.length }
}

export async function listCobranzaImportaciones() {
  return db.select().from(schema.cobranzasImportaciones).orderBy(desc(schema.cobranzasImportaciones.createdAt))
}

export async function listCobranzaSaldos(filters?: {
  estado?: string
  importacionId?: number
  busqueda?: string
}) {
  const conds: any[] = []
  if (filters?.estado) conds.push(eq(schema.cobranzasSaldos.estado, filters.estado as any))
  if (filters?.importacionId) conds.push(eq(schema.cobranzasSaldos.importacionId, filters.importacionId))
  if (filters?.busqueda) {
    conds.push(or(
      like(schema.cobranzasSaldos.locatarioNombre, `%${filters.busqueda}%`),
      like(schema.cobranzasSaldos.local, `%${filters.busqueda}%`),
    ))
  }
  return db.select().from(schema.cobranzasSaldos)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(schema.cobranzasSaldos.createdAt))
}

export async function getCobranzaSaldoById(id: number) {
  const rows = await db.select().from(schema.cobranzasSaldos).where(eq(schema.cobranzasSaldos.id, id))
  return rows[0] ?? null
}

export async function updateCobranzaSaldoEstado(id: number, estado: typeof schema.cobranzasSaldos.$inferInsert.estado) {
  await db.update(schema.cobranzasSaldos).set({ estado, updatedAt: new Date() } as any).where(eq(schema.cobranzasSaldos.id, id)).run()
}

export async function updateCobranzaSaldoContacto(id: number, telefonoWa?: string | null, locatarioId?: number | null) {
  await db.update(schema.cobranzasSaldos).set({
    telefonoWa: normalizeWaNumber(telefonoWa) || null,
    locatarioId: locatarioId ?? null,
    estado: normalizeWaNumber(telefonoWa) ? 'pendiente' : 'error_contacto',
    updatedAt: new Date(),
  } as any).where(eq(schema.cobranzasSaldos.id, id)).run()
}

export async function getCobranzaNotificationsBySaldoIds(saldoIds: number[]) {
  if (saldoIds.length === 0) return []
  return db.select().from(schema.cobranzasNotificaciones)
    .where(inArray(schema.cobranzasNotificaciones.saldoId, saldoIds))
}

export async function createCobranzaNotification(input: {
  saldo: typeof schema.cobranzasSaldos.$inferSelect
  waNumber?: string | null
  message: string
  status: 'queued' | 'skipped'
  botQueueId?: number | null
  sentBy: { id: number; name: string }
}) {
  const rows = await db.insert(schema.cobranzasNotificaciones).values({
    saldoId: input.saldo.id,
    locatarioId: input.saldo.locatarioId ?? null,
    waNumber: normalizeWaNumber(input.waNumber) || null,
    message: input.message,
    status: input.status,
    botQueueId: input.botQueueId ?? null,
    sentById: input.sentBy.id,
    sentByName: input.sentBy.name,
    sentAt: input.status === 'queued' ? new Date() : null,
  }).returning({ id: schema.cobranzasNotificaciones.id })
  return rows[0].id
}

export async function listCobranzaNotificaciones() {
  return db.select().from(schema.cobranzasNotificaciones).orderBy(desc(schema.cobranzasNotificaciones.createdAt))
}

export async function clearCobranzaLista() {
  const [notificaciones, saldos, importaciones] = await Promise.all([
    db.select().from(schema.cobranzasNotificaciones),
    db.select().from(schema.cobranzasSaldos),
    db.select().from(schema.cobranzasImportaciones),
  ])
  await db.delete(schema.cobranzasNotificaciones).run()
  await db.delete(schema.cobranzasSaldos).run()
  await db.delete(schema.cobranzasImportaciones).run()
  return {
    notificaciones: notificaciones.length,
    saldos: saldos.length,
    importaciones: importaciones.length,
    total: notificaciones.length + saldos.length + importaciones.length,
  }
}

// --- BOT QUEUE ---
export async function enqueueBotMessage(waNumber: string, message: string, scheduledAt?: Date) {
  const normalized = normalizeWaNumber(waNumber)
  if (!normalized) return null
  const rows = await db.insert(schema.botQueue).values({
    waNumber: normalized,
    message,
    ...(scheduledAt ? { scheduledAt } : {}),
  } as any).returning({ id: schema.botQueue.id })
  return rows[0]?.id ?? null
}
export async function getPendingBotMessages() {
  const now = new Date()
  return db.select().from(schema.botQueue).where(
    and(
      eq(schema.botQueue.status, 'pending'),
      or(
        isNull(schema.botQueue.scheduledAt),
        lte(schema.botQueue.scheduledAt, now),
      ),
    ),
  )
}
export async function markBotMessageSent(id: number) {
  await db.update(schema.botQueue).set({ status: 'sent' }).where(eq(schema.botQueue.id, id)).run()
}
export async function markBotMessageFailed(id: number, errorMsg?: string) {
  // Incrementa el contador de reintentos. Si supera MAX_RETRIES pasa a dead_letter.
  const MAX_RETRIES = 3
  const [current] = await db.select().from(schema.botQueue).where(eq(schema.botQueue.id, id))
  if (!current) return

  const newRetryCount = ((current as any).retryCount ?? 0) + 1
  const isDead = newRetryCount >= MAX_RETRIES

  await db.update(schema.botQueue).set({
    status: isDead ? 'dead_letter' : 'failed',
    retryCount: newRetryCount,
    errorMsg: errorMsg ?? (current as any).errorMsg ?? 'Error desconocido',
    lastAttemptAt: new Date(),
  } as any).where(eq(schema.botQueue.id, id)).run()
}

/** Reinicia mensajes fallidos a 'pending' para reintento. */
export async function retryFailedBotMessages() {
  await db.update(schema.botQueue).set({
    status: 'pending',
    lastAttemptAt: new Date(),
  } as any).where(eq(schema.botQueue.status, 'failed')).run()
}

/** Devuelve mensajes en dead_letter (fallaron definitivamente). */
export async function getDeadLetterBotMessages() {
  return db.select().from(schema.botQueue)
    .where(eq(schema.botQueue.status, 'dead_letter' as any))
    .orderBy(desc(schema.botQueue.createdAt))
}

/** Registra un heartbeat del bot local (upsert, siempre 1 registro). */
export async function registerBotHeartbeat(params?: { botVersion?: string; pendingCount?: number }) {
  const existing = await db.select().from(schema.botHeartbeat).limit(1)
  if (existing.length > 0) {
    await db.update(schema.botHeartbeat).set({
      lastSeenAt: new Date(),
      botVersion: params?.botVersion ?? (existing[0] as any).botVersion,
      pendingCount: params?.pendingCount ?? 0,
    } as any).run()
  } else {
    await db.insert(schema.botHeartbeat).values({
      lastSeenAt: new Date(),
      botVersion: params?.botVersion,
      pendingCount: params?.pendingCount ?? 0,
    } as any).run()
  }
}

/** Devuelve el estado de conexión del bot. */
export async function getBotConnectionStatus() {
  const [latest] = await db.select().from(schema.botHeartbeat).limit(1)
  const TIMEOUT_MS = 30 * 60 * 1000 // 30 minutos sin heartbeat = desconectado
  if (!latest) return { connected: false, lastSeenAt: null, minutesSince: null }

  const lastSeenAt = (latest as any).lastSeenAt as Date
  const minutesSince = Math.floor((Date.now() - lastSeenAt.getTime()) / 60000)
  return {
    connected: minutesSince < 30,
    lastSeenAt,
    minutesSince,
    botVersion: (latest as any).botVersion ?? null,
    pendingCount: (latest as any).pendingCount ?? 0,
  }
}

// ─── SLA Tracking ────────────────────────────────────────────────────────────

const SLA_MINUTES: Record<string, number> = {
  urgente: 120,    // 2 horas
  alta: 480,       // 8 horas
  media: 1440,     // 24 horas
  baja: 2880,      // 48 horas
}

/** Calcula el estado SLA de un reclamo dado su prioridad y fecha de creación. */
export function calcularSLA(prioridad: string, createdAt: Date | number) {
  const slaMins = SLA_MINUTES[prioridad] ?? 1440
  const createdMs = createdAt instanceof Date ? createdAt.getTime() : createdAt
  const elapsedMins = Math.floor((Date.now() - createdMs) / 60000)
  const pct = Math.round((elapsedMins / slaMins) * 100)
  return {
    slaMins,
    elapsedMins,
    minRestantes: Math.max(0, slaMins - elapsedMins),
    porcentajeTranscurrido: Math.min(100, pct),
    vencida: elapsedMins >= slaMins,
    enRiesgo: pct >= 80 && pct < 100,
    estado: elapsedMins >= slaMins ? 'vencida' : pct >= 80 ? 'en_riesgo' : 'ok',
  }
}

/** Devuelve reclamos vencidos (SLA superado) que no estén completados/cancelados. */
export async function getReportesVencidos() {
  const reportes = await db.select().from(schema.reportes).where(
    and(
      or(
        eq(schema.reportes.estado, 'pendiente'),
        eq(schema.reportes.estado, 'en_progreso'),
        eq(schema.reportes.estado, 'pausado'),
      )
    )
  )

  return reportes.filter((r) => {
    const sla = calcularSLA(r.prioridad, r.createdAt)
    return sla.vencida
  }).map((r) => ({
    ...r,
    sla: calcularSLA(r.prioridad, r.createdAt),
  }))
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
  const active = ordered.filter((occurrence) => occurrence.estado === 'en_progreso').length
  const paused = ordered.filter((occurrence) => occurrence.estado === 'pausada').length

  return {
    fechaOperativa: dateKey,
    total: ordered.length,
    pendientes: pending,
    activas: active,
    pausadas: paused,
    cumplidos: ordered.filter((occurrence) => occurrence.estado === 'cumplido').length,
    cumplidosConObservacion: ordered.filter((occurrence) => occurrence.estado === 'cumplido_con_observacion').length,
    vencidos: overdue,
    estadoGeneral: overdue > 0 ? 'atrasado' : active > 0 ? 'activo' : pending > 0 ? 'pendiente' : 'estable',
    ultimaConfirmacion: latestConfirmed?.confirmadoAt ? formatTimeLabel(latestConfirmed.confirmadoAt) : null,
    proximoControl: nextPending
      ? {
          id: nextPending.id,
          hora: nextPending.programadoAtLabel ?? formatTimeLabel(nextPending.programadoAt),
          responsable: nextPending.responsableActualNombre ?? nextPending.empleadoNombre,
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
  responsableProgramadoId?: number | null
  responsableProgramadoNombre?: string | null
  responsableProgramadoWaId?: string | null
  responsableActualId?: number | null
  responsableActualNombre?: string | null
  responsableActualWaId?: string | null
  asignacionEstado?: 'sin_asignar' | 'asignada' | 'en_progreso' | 'completada' | 'vencida'
  asignadoAt?: Date | null
  reasignadoAt?: Date | null
  reasignadoPorUserId?: number | null
  reasignadoPorNombre?: string | null
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
    responsableProgramadoId: row.responsableProgramadoId ?? row.empleadoId,
    responsableProgramadoNombre: row.responsableProgramadoNombre ?? row.empleadoNombre,
    responsableProgramadoWaId: normalizeOptionalWaNumber(row.responsableProgramadoWaId ?? row.empleadoWaId),
    responsableActualId: row.responsableActualId ?? row.empleadoId,
    responsableActualNombre: row.responsableActualNombre ?? row.empleadoNombre,
    responsableActualWaId: normalizeOptionalWaNumber(row.responsableActualWaId ?? row.empleadoWaId),
    asignacionEstado: row.asignacionEstado ?? 'asignada',
    asignadoAt: row.asignadoAt ?? row.programadoAt,
    reasignadoAt: row.reasignadoAt ?? null,
    reasignadoPorUserId: row.reasignadoPorUserId ?? null,
    reasignadoPorNombre: row.reasignadoPorNombre ?? null,
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

export async function listRoundOccurrencesForEmployee(
  empleadoId: number,
  dateKey = toBuenosAiresDateKey(new Date())
) {
  const rows = await db.select().from(schema.rondasOcurrencia).where(eq(schema.rondasOcurrencia.fechaOperativa, dateKey))
  return rows
    .filter((occurrence) =>
      Number(occurrence.responsableActualId ?? occurrence.empleadoId ?? 0) === empleadoId &&
      !['cumplido', 'cumplido_con_observacion', 'vencido', 'cancelado'].includes(occurrence.estado)
    )
    .sort((a, b) => toMs(a.programadoAt) - toMs(b.programadoAt))
    .map((occurrence) => ({
      ...toRoundOccurrenceRecord(occurrence),
      estado: occurrence.estado,
      canalConfirmacion: occurrence.canalConfirmacion,
      nota: occurrence.nota,
    }))
}

export async function updateRoundOccurrenceStatus(
  id: number,
  data: {
    estado?: 'pendiente' | 'en_progreso' | 'pausada' | 'cumplido' | 'cumplido_con_observacion' | 'vencido' | 'cancelado'
    confirmadoAt?: Date | null
    canalConfirmacion?: 'whatsapp' | 'panel' | 'system'
    nota?: string | null
    escaladoAt?: Date | null
    inicioRealAt?: Date | null
    pausadoAt?: Date | null
    finRealAt?: Date | null
    tiempoAcumuladoSegundos?: number
    responsableProgramadoId?: number | null
    responsableProgramadoNombre?: string | null
    responsableProgramadoWaId?: string | null
    responsableActualId?: number | null
    responsableActualNombre?: string | null
    responsableActualWaId?: string | null
    asignacionEstado?: 'sin_asignar' | 'asignada' | 'en_progreso' | 'completada' | 'vencida'
    asignadoAt?: Date | null
    reasignadoAt?: Date | null
    reasignadoPorUserId?: number | null
    reasignadoPorNombre?: string | null
    empleadoId?: number
    empleadoNombre?: string
    empleadoWaId?: string
  }
) {
  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  }
  if (data.estado !== undefined) updates.estado = data.estado
  if (data.confirmadoAt !== undefined) updates.confirmadoAt = data.confirmadoAt
  if (data.canalConfirmacion !== undefined) updates.canalConfirmacion = data.canalConfirmacion
  if (data.nota !== undefined) updates.nota = data.nota
  if (data.escaladoAt !== undefined) updates.escaladoAt = data.escaladoAt
  if (data.inicioRealAt !== undefined) updates.inicioRealAt = data.inicioRealAt
  if (data.pausadoAt !== undefined) updates.pausadoAt = data.pausadoAt
  if (data.finRealAt !== undefined) updates.finRealAt = data.finRealAt
  if (data.tiempoAcumuladoSegundos !== undefined) updates.tiempoAcumuladoSegundos = data.tiempoAcumuladoSegundos
  if (data.responsableProgramadoId !== undefined) updates.responsableProgramadoId = data.responsableProgramadoId
  if (data.responsableProgramadoNombre !== undefined) updates.responsableProgramadoNombre = data.responsableProgramadoNombre
  if (data.responsableProgramadoWaId !== undefined) updates.responsableProgramadoWaId = data.responsableProgramadoWaId
  if (data.responsableActualId !== undefined) updates.responsableActualId = data.responsableActualId
  if (data.responsableActualNombre !== undefined) updates.responsableActualNombre = data.responsableActualNombre
  if (data.responsableActualWaId !== undefined) updates.responsableActualWaId = data.responsableActualWaId
  if (data.asignacionEstado !== undefined) updates.asignacionEstado = data.asignacionEstado
  if (data.asignadoAt !== undefined) updates.asignadoAt = data.asignadoAt
  if (data.reasignadoAt !== undefined) updates.reasignadoAt = data.reasignadoAt
  if (data.reasignadoPorUserId !== undefined) updates.reasignadoPorUserId = data.reasignadoPorUserId
  if (data.reasignadoPorNombre !== undefined) updates.reasignadoPorNombre = data.reasignadoPorNombre
  if (data.empleadoId !== undefined) updates.empleadoId = data.empleadoId
  if (data.empleadoNombre !== undefined) updates.empleadoNombre = data.empleadoNombre
  if (data.empleadoWaId !== undefined) updates.empleadoWaId = data.empleadoWaId
  await db.update(schema.rondasOcurrencia).set(updates as any).where(eq(schema.rondasOcurrencia.id, id)).run()
}

export async function updateOccurrenceLifecycle(
  id: number,
  updates: Partial<{
    estado: 'pendiente' | 'en_progreso' | 'pausada' | 'cumplido' | 'cumplido_con_observacion' | 'vencido' | 'cancelado'
    confirmadoAt: Date | null
    canalConfirmacion: 'whatsapp' | 'panel' | 'system'
    nota: string | null
    escaladoAt: Date | null
    inicioRealAt: Date | null
    pausadoAt: Date | null
    finRealAt: Date | null
    tiempoAcumuladoSegundos: number
  }>
) {
  await updateRoundOccurrenceStatus(id, updates as any)
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

export async function deleteRoundOccurrence(id: number) {
  await db.delete(schema.rondasEvento).where(eq(schema.rondasEvento.ocurrenciaId, id)).run()
  await db.delete(schema.rondasOcurrencia).where(eq(schema.rondasOcurrencia.id, id)).run()
}

export async function reprogramarRoundOccurrence(
  id: number,
  newProgramadoAt: Date,
  newFechaOperativa: string,
  newLabel: string,
) {
  await db.update(schema.rondasOcurrencia).set({
    programadoAt: newProgramadoAt,
    programadoAtLabel: newLabel,
    fechaOperativa: newFechaOperativa,
    estado: 'pendiente',
    recordatorioEnviadoAt: null,
    escaladoAt: null,
    updatedAt: new Date(),
  } as any).where(eq(schema.rondasOcurrencia.id, id)).run()
}

export async function createRoundEvent(event: {
  occurrenceId: number
  type: 'recordatorio' | 'confirmacion' | 'observacion' | 'vencimiento' | 'escalacion' | 'admin_update' | 'asignacion' | 'reasignacion' | 'liberacion'
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
  type: 'recordatorio' | 'confirmacion' | 'observacion' | 'vencimiento' | 'escalacion' | 'admin_update' | 'asignacion' | 'reasignacion' | 'liberacion'
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
export async function crearLead(data: typeof schema.leads.$inferInsert): Promise<{ id: number; created: boolean }> {
  const normalized = normalizeLeadInsert(data)
  const existing = await findReusableLeadForContact(normalized)
  if (existing) {
    await actualizarLead(existing.id, buildLeadDuplicateUpdate(existing, normalized))
    return { id: existing.id, created: false }
  }

  const rows = await db.insert(schema.leads).values(normalized).returning({ id: schema.leads.id })
  return { id: rows[0].id, created: true }
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
export async function deleteLeadById(id: number) {
  await db.delete(schema.leads).where(eq(schema.leads.id, id)).run()
}
export async function listUnassignedLeads() {
  const all = await getLeads()
  return all.filter(
    (l) => !l.asignadoId && l.asignadoA !== 'Bot comercial' && !['cerrado', 'descartado'].includes(l.estado)
  )
}
export async function actualizarLead(id: number, data: Partial<typeof schema.leads.$inferInsert>) {
  const updateData: Partial<typeof schema.leads.$inferInsert> = { ...data, updatedAt: new Date() }
  if (
    data.estado &&
    ['contactado', 'visito', 'cerrado'].includes(data.estado) &&
    data.firstContactedAt === undefined
  ) {
    const current = await getLeadById(id)
    if (current && !current.firstContactedAt) {
      updateData.firstContactedAt = new Date()
    }
  }
  await db.update(schema.leads).set(updateData as any).where(eq(schema.leads.id, id)).run()
}

export async function getLeadsForFollowup() {
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000
  const cutoff = new Date(Date.now() - TWO_DAYS_MS)
  const rows = await db
    .select()
    .from(schema.leads)
    .where(
      and(
        eq(schema.leads.estado, 'nuevo'),
        isNotNull(schema.leads.waId),
        isNotNull(schema.leads.temperature),
        isNotNull(schema.leads.lastBotMsgAt),
        lt(schema.leads.autoFollowupCount ?? 0, 2),
      )
    )
  return rows.filter(
    l =>
      l.temperature !== 'not_fit' &&
      l.createdAt != null &&
      new Date(l.createdAt as any).getTime() >= cutoff.getTime()
  )
}

export async function updateLeadFollowup(id: number, newCount: number) {
  await db
    .update(schema.leads)
    .set({ autoFollowupCount: newCount, lastBotMsgAt: new Date(), updatedAt: new Date() } as any)
    .where(eq(schema.leads.id, id))
    .run()
}

export async function getLeadByWaId(waId: string) {
  const normalized = normalizeWaNumber(waId)
  if (!normalized) return null
  const rows = await db.select().from(schema.leads)
  return rows.find((lead) => {
    const stored = normalizeWaNumber(lead.waId)
    return stored === normalized
  }) ?? null
}

function normalizeLeadInsert(data: typeof schema.leads.$inferInsert): typeof schema.leads.$inferInsert {
  return {
    ...data,
    telefono: normalizeWaNumber(data.telefono ?? undefined) || data.telefono || null,
    waId: normalizeWaNumber(data.waId ?? undefined) || null,
  }
}

async function findReusableLeadForContact(data: typeof schema.leads.$inferInsert) {
  const waId = normalizeWaNumber(data.waId ?? undefined)
  const telefono = normalizeWaNumber(data.telefono ?? undefined)
  const candidates = new Set([waId, telefono].filter(Boolean))
  if (candidates.size === 0) return null

  const rows = await db.select().from(schema.leads)
  return rows
    .filter((lead) => !['cerrado', 'descartado'].includes(lead.estado))
    .filter((lead) => {
      const leadWa = normalizeWaNumber(lead.waId)
      const leadPhone = normalizeWaNumber(lead.telefono)
      return (!!leadWa && candidates.has(leadWa)) || (!!leadPhone && candidates.has(leadPhone))
    })
    .sort((left, right) => toMs(right.updatedAt ?? right.createdAt) - toMs(left.updatedAt ?? left.createdAt))[0] ?? null
}

function buildLeadDuplicateUpdate(
  existing: schema.Lead,
  incoming: typeof schema.leads.$inferInsert,
): Partial<typeof schema.leads.$inferInsert> {
  return {
    nombre: pickLeadValue(existing.nombre, incoming.nombre, { preferIncomingPlaceholderReplacement: true }),
    telefono: pickLeadValue(existing.telefono, incoming.telefono),
    email: pickLeadValue(existing.email, incoming.email),
    waId: pickLeadValue(existing.waId, incoming.waId),
    rubro: pickLeadValue(existing.rubro, incoming.rubro),
    tipoLocal: pickLeadValue(existing.tipoLocal, incoming.tipoLocal),
    mensaje: pickLeadValue(existing.mensaje, incoming.mensaje),
    turnoFecha: pickLeadValue(existing.turnoFecha, incoming.turnoFecha),
    turnoHora: pickLeadValue(existing.turnoHora, incoming.turnoHora),
    fuente: incoming.fuente ?? existing.fuente,
    score: incoming.score ?? existing.score,
    temperature: incoming.temperature ?? existing.temperature,
    lastBotMsgAt: incoming.lastBotMsgAt ?? existing.lastBotMsgAt,
  }
}

function pickLeadValue<T>(
  current: T | null | undefined,
  incoming: T | null | undefined,
  options?: { preferIncomingPlaceholderReplacement?: boolean },
) {
  if (incoming === undefined || incoming === null || incoming === '') return current ?? undefined
  if (options?.preferIncomingPlaceholderReplacement && isLeadPlaceholderName(current) && !isLeadPlaceholderName(incoming)) {
    return incoming
  }
  return incoming
}

function isLeadPlaceholderName(value: unknown) {
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  return normalized === '' || normalized === 'sin nombre'
}

export async function flagLeadNeedsAttention(leadId: number, intent: string) {
  await db.update(schema.leads).set({
    needsAttentionAt: new Date(),
    notas: sql`CASE WHEN notas IS NULL OR notas = '' THEN ${intent} ELSE notas || char(10) || ${intent} END`,
  } as any).where(eq(schema.leads.id, leadId)).run()
}

export async function clearLeadAttentionFlag(leadId: number) {
  await db.update(schema.leads).set({ needsAttentionAt: null } as any).where(eq(schema.leads.id, leadId)).run()
}

export async function createLeadEvento(data: {
  leadId: number
  tipo: 'followup1_sent' | 'followup2_sent'
  descripcion: string
  metadataJson?: string
}) {
  await db.insert(schema.leadsEvento).values({
    leadId: data.leadId,
    tipo: data.tipo,
    descripcion: data.descripcion,
    metadataJson: data.metadataJson ?? null,
  }).run()
}

export async function getLeadEventos(leadId: number) {
  return db
    .select()
    .from(schema.leadsEvento)
    .where(eq(schema.leadsEvento.leadId, leadId))
    .orderBy(schema.leadsEvento.createdAt)
}

export async function crearTareaOperativaManual(data: {
  titulo: string
  ubicacion: string
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  empleadoId: number
  empleadoNombre: string
  empleadoWaId?: string | null
}): Promise<number> {
  const rows = await db.insert(schema.tareasOperativas).values({
    origen: 'manual',
    tipoTrabajo: 'general',
    titulo: data.titulo,
    descripcion: data.titulo,
    ubicacion: data.ubicacion,
    prioridad: data.prioridad,
    estado: 'pendiente_confirmacion',
    empleadoId: data.empleadoId,
    empleadoNombre: data.empleadoNombre,
    empleadoWaId: data.empleadoWaId ?? null,
    asignadoAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any).returning({ id: schema.tareasOperativas.id })
  return rows[0].id
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

export async function reiniciarMetricasOperacion() {
  const [
    actualizaciones,
    reportes,
    leads,
    leadsEventos,
    botQueue,
    tareas,
    tareasEventos,
    asistencia,
    asistenciaAuditoria,
    liquidaciones,
    marcaciones,
    rondasOcurrencias,
    rondasEventos,
  ] = await Promise.all([
    db.select().from(schema.actualizaciones),
    db.select().from(schema.reportes),
    db.select().from(schema.leads),
    db.select().from(schema.leadsEvento),
    db.select().from(schema.botQueue),
    db.select().from(schema.tareasOperativas),
    db.select().from(schema.tareasOperativasEvento),
    db.select().from(schema.empleadoAsistencia),
    db.select().from(schema.empleadoAsistenciaAuditoria),
    db.select().from(schema.empleadoLiquidacionCierre),
    db.select().from(schema.marcacionesEmpleados),
    db.select().from(schema.rondasOcurrencia),
    db.select().from(schema.rondasEvento),
  ])

  await db.delete(schema.actualizaciones).run()
  await db.delete(schema.reportes).run()
  await db.delete(schema.leadsEvento).run()
  await db.delete(schema.leads).run()
  await db.delete(schema.botQueue).run()
  await db.delete(schema.tareasOperativasEvento).run()
  await db.delete(schema.tareasOperativas).run()
  await db.delete(schema.empleadoAsistenciaAuditoria).run()
  await db.delete(schema.empleadoAsistencia).run()
  await db.delete(schema.empleadoLiquidacionCierre).run()
  await db.delete(schema.marcacionesEmpleados).run()
  await db.delete(schema.rondasEvento).run()
  await db.delete(schema.rondasOcurrencia).run()

  try {
    await db.run(sql`DELETE FROM sqlite_sequence WHERE name IN (
      'actualizaciones',
      'reportes',
      'leads',
      'bot_queue',
      'tareas_operativas_evento',
      'tareas_operativas',
      'empleado_asistencia_auditoria',
      'empleado_asistencia',
      'empleado_liquidacion_cierre',
      'marcaciones_empleados',
      'rondas_evento',
      'rondas_ocurrencia',
      'leads_evento'
    )`)
  } catch {
    // sqlite_sequence is only present after AUTOINCREMENT tables have been used.
  }

  return {
    actualizaciones: actualizaciones.length,
    reportes: reportes.length,
    leads: leads.length,
    leadsEventos: leadsEventos.length,
    colaBot: botQueue.length,
    tareas: tareas.length,
    tareasEventos: tareasEventos.length,
    asistencia: asistencia.length,
    asistenciaAuditoria: asistenciaAuditoria.length,
    liquidaciones: liquidaciones.length,
    marcaciones: marcaciones.length,
    rondas: rondasOcurrencias.length,
    rondasEventos: rondasEventos.length,
    total:
      actualizaciones.length +
      reportes.length +
      leads.length +
      leadsEventos.length +
      botQueue.length +
      tareas.length +
      tareasEventos.length +
      asistencia.length +
      asistenciaAuditoria.length +
      liquidaciones.length +
      marcaciones.length +
      rondasOcurrencias.length +
      rondasEventos.length,
  }
}

function getOperationalTaskTiempoTrabajadoSegundos(task: any) {
  const acumulado = Number(task.trabajoAcumuladoSegundos ?? 0)
  if (!task.trabajoIniciadoAt) return acumulado
  const iniciadoAt = new Date(task.trabajoIniciadoAt).getTime()
  const adicional = Math.max(0, Math.floor((Date.now() - iniciadoAt) / 1000))
  return acumulado + adicional
}

function getOperationalTaskTiempoTrabajadoSegundosAt(task: any, now: Date) {
  const acumulado = Number(task.trabajoAcumuladoSegundos ?? 0)
  if (!task.trabajoIniciadoAt) return acumulado
  const iniciadoAt = new Date(task.trabajoIniciadoAt).getTime()
  const adicional = Math.max(0, Math.floor((now.getTime() - iniciadoAt) / 1000))
  return acumulado + adicional
}

function toOperationalTaskRecord(task: schema.TareaOperativa) {
  return {
    ...task,
    tiempoTrabajadoSegundos: getOperationalTaskTiempoTrabajadoSegundos(task),
  }
}

function compareOperationalTasks(left: any, right: any) {
  const stateDiff = operationalTaskStateRank(left.estado) - operationalTaskStateRank(right.estado)
  if (stateDiff !== 0) return stateDiff

  const leftOrder = Number(left.ordenAsignacion ?? 0)
  const rightOrder = Number(right.ordenAsignacion ?? 0)
  if (leftOrder > 0 || rightOrder > 0) {
    return leftOrder - rightOrder ||
      priorityRank(right.prioridad) - priorityRank(left.prioridad) ||
      toMs(left.createdAt) - toMs(right.createdAt)
  }

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
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('549')) return digits
  if (digits.startsWith('54')) return `549${digits.slice(2)}`
  if (digits.startsWith('9')) return `54${digits}`
  if (digits.length >= 8) return `549${digits.replace(/^0+/, '')}`
  return digits
}

function mapLegacyFuenteToAttendanceChannel(fuente?: 'whatsapp' | 'panel' | 'otro') {
  return fuente === 'whatsapp' ? 'whatsapp' : 'panel'
}

function mapAttendanceChannelToLegacyFuente(canal?: string | null) {
  if (canal === 'whatsapp') return 'whatsapp'
  if (canal === 'panel') return 'panel'
  return 'otro'
}

async function syncLegacyAttendanceMirror(params: {
  empleadoId: number
  tipo: AttendanceAction
  canal: 'whatsapp' | 'panel' | 'manual_admin'
  nota?: string
  localAsignado?: string | null
  statusBeforeChange?: Awaited<ReturnType<typeof getEmpleadoAttendanceStatus>>
}) {
  if (params.tipo === 'inicio_almuerzo' || params.tipo === 'fin_almuerzo') return

  const rows = await db.select().from(schema.marcacionesEmpleados).where(eq(schema.marcacionesEmpleados.empleadoId, params.empleadoId))
  const open = rows
    .filter((row) => !row.salidaAt)
    .sort((left, right) => new Date(right.entradaAt as any).getTime() - new Date(left.entradaAt as any).getTime())[0] ?? null

  if (params.tipo === 'entrada') {
    if (open) {
      if (params.statusBeforeChange && !params.statusBeforeChange.onShift) {
        const closeAt = params.statusBeforeChange.lastExitAt ?? new Date(open.entradaAt as any)
        const entradaMs = new Date(open.entradaAt as any).getTime()
        const closeMs = closeAt.getTime()
        const duracionSegundos = Math.max(0, Math.floor((closeMs - entradaMs) / 1000))
        await db.update(schema.marcacionesEmpleados).set({
          salidaAt: closeAt,
          duracionSegundos,
          notaSalida: open.notaSalida ?? 'Auto-cierre por reconciliacion de asistencia',
          updatedAt: new Date(),
        } as any).where(eq(schema.marcacionesEmpleados.id, open.id)).run()
        logAttendanceDebug('legacy_sync:auto_closed_stale_open', {
          empleadoId: params.empleadoId,
          tipo: params.tipo,
          canal: params.canal,
          openId: open.id,
          closeAt: closeAt.toISOString(),
          duracionSegundos,
        })
      } else {
        logAttendanceDebug('legacy_sync:skip_open_exists', {
          empleadoId: params.empleadoId,
          tipo: params.tipo,
          canal: params.canal,
          openId: open.id,
        })
        return
      }
    }
    await db.insert(schema.marcacionesEmpleados).values({
      empleadoId: params.empleadoId,
      entradaAt: new Date(),
      localAsignado: params.localAsignado ?? null,
      fuente: mapAttendanceChannelToLegacyFuente(params.canal),
      notaEntrada: params.nota?.trim() || null,
    } as any).run()
    logAttendanceDebug('legacy_sync:entry_inserted', {
      empleadoId: params.empleadoId,
      tipo: params.tipo,
      canal: params.canal,
    })
    return
  }

  if (!open) {
    logAttendanceDebug('legacy_sync:no_open_shift', {
      empleadoId: params.empleadoId,
      tipo: params.tipo,
      canal: params.canal,
    })
    return
  }

  const now = new Date()
  const entradaMs = new Date(open.entradaAt as any).getTime()
  const duracionSegundos = Math.max(0, Math.floor((now.getTime() - entradaMs) / 1000))
  await db.update(schema.marcacionesEmpleados).set({
    salidaAt: now,
    duracionSegundos,
    notaSalida: params.nota?.trim() || null,
    updatedAt: now,
  } as any).where(eq(schema.marcacionesEmpleados.id, open.id)).run()
  logAttendanceDebug('legacy_sync:exit_updated', {
    empleadoId: params.empleadoId,
    tipo: params.tipo,
    canal: params.canal,
    openId: open.id,
    duracionSegundos,
  })
}

function normalizeOptionalWaNumber(value?: string | null) {
  const normalized = normalizeWaNumber(value)
  return normalized || null
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
    estado: occurrence.estado,
    recordatorioEnviadoAt: toNullableDate(occurrence.recordatorioEnviadoAt),
    confirmadoAt: toNullableDate(occurrence.confirmadoAt),
    inicioRealAt: toNullableDate(occurrence.inicioRealAt),
    pausadoAt: toNullableDate(occurrence.pausadoAt),
    finRealAt: toNullableDate(occurrence.finRealAt),
    tiempoAcumuladoSegundos: Number(occurrence.tiempoAcumuladoSegundos ?? 0),
    escaladoAt: toNullableDate(occurrence.escaladoAt),
    nota: occurrence.nota ?? null,
    canalConfirmacion: occurrence.canalConfirmacion,
    responsableProgramadoId: occurrence.responsableProgramadoId ?? occurrence.empleadoId,
    responsableProgramadoNombre: occurrence.responsableProgramadoNombre ?? occurrence.empleadoNombre,
    responsableProgramadoWaId: occurrence.responsableProgramadoWaId ?? occurrence.empleadoWaId,
    responsableActualId: occurrence.responsableActualId ?? occurrence.empleadoId,
    responsableActualNombre: occurrence.responsableActualNombre ?? occurrence.empleadoNombre,
    responsableActualWaId: occurrence.responsableActualWaId ?? occurrence.empleadoWaId,
    asignacionEstado: occurrence.asignacionEstado ?? 'asignada',
    asignadoAt: toNullableDate(occurrence.asignadoAt),
    reasignadoAt: toNullableDate(occurrence.reasignadoAt),
    reasignadoPorUserId: occurrence.reasignadoPorUserId ?? null,
    reasignadoPorNombre: occurrence.reasignadoPorNombre ?? null,
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

function describeRoundEvent(type: 'recordatorio' | 'confirmacion' | 'observacion' | 'vencimiento' | 'escalacion' | 'admin_update' | 'asignacion' | 'reasignacion' | 'liberacion') {
  switch (type) {
    case 'recordatorio': return 'Recordatorio enviado'
    case 'confirmacion': return 'Control confirmado'
    case 'observacion': return 'Control confirmado con observacion'
    case 'vencimiento': return 'Control vencido por falta de respuesta'
    case 'escalacion': return 'Incidente escalado a supervisor'
    case 'admin_update': return 'Actualizacion administrativa'
    case 'asignacion': return 'Ronda asignada'
    case 'reasignacion': return 'Ronda reasignada'
    case 'liberacion': return 'Ronda liberada'
    default: return 'Evento de ronda'
  }
}

export async function getPoolTasks() {
  const rows = await db.select().from(schema.tareasOperativas).where(
    and(
      eq(schema.tareasOperativas.estado, 'pendiente_asignacion'),
      isNull(schema.tareasOperativas.empleadoId),
    )
  )
  return rows.map(toOperationalTaskRecord).sort((a, b) =>
    (a.ordenAsignacion ?? 0) - (b.ordenAsignacion ?? 0) || a.id - b.id
  )
}

// ─── Gastronomía ─────────────────────────────────────────────────────────────

export async function getEmpleadosGastronomia(sector?: string, activo?: boolean) {
  const conditions: any[] = [eq(schema.empleados.tipoEmpleado, 'gastronomia')]
  if (sector && sector !== 'todos') {
    conditions.push(eq(schema.empleados.sector, sector as any))
  }
  if (typeof activo === 'boolean') {
    conditions.push(eq(schema.empleados.activo, activo))
  }
  return db.select().from(schema.empleados).where(and(...conditions)).orderBy(schema.empleados.nombre)
}

export async function getEmpleadoGastroById(id: number) {
  const rows = await db.select().from(schema.empleados)
    .where(and(eq(schema.empleados.id, id), eq(schema.empleados.tipoEmpleado, 'gastronomia')))
  return rows[0] ?? null
}

export async function createEmpleadoGastro(data: {
  nombre: string
  telefono?: string | null
  waId?: string | null
  sector: string
  puesto?: string | null
  pagoDiario?: number
  sheetsRow?: number | null
}) {
  const result = await db.insert(schema.empleados).values({
    nombre: data.nombre,
    telefono: data.telefono ?? null,
    waId: data.waId ?? null,
    sector: data.sector as any,
    tipoEmpleado: 'gastronomia' as any,
    puesto: data.puesto ?? null,
    pagoDiario: data.pagoDiario ?? 0,
    sheetsRow: data.sheetsRow ?? null,
    activo: true,
  }).returning()
  return result[0]
}

export async function updateEmpleadoGastro(id: number, data: {
  nombre?: string
  telefono?: string | null
  waId?: string | null
  sector?: string
  puesto?: string | null
  pagoDiario?: number
  sheetsRow?: number | null
  activo?: boolean
  puedeGastronomia?: boolean
}) {
  const result = await db.update(schema.empleados)
    .set({ ...data as any, updatedAt: new Date() })
    .where(eq(schema.empleados.id, id))
    .returning()
  return result[0]
}

export async function getMarcacionesGastronomia(sector: string | undefined, year: number, month: number) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 1)

  const employees = await getEmpleadosGastronomia(sector)
  if (employees.length === 0) return { employees: [], events: [], statusesByEmployee: {} }

  const empleadoIds = employees.map(e => e.id)

  const events = await db.select()
    .from(schema.empleadoAsistencia)
    .where(
      and(
        inArray(schema.empleadoAsistencia.empleadoId, empleadoIds),
        gte(schema.empleadoAsistencia.timestamp, startDate),
        lt(schema.empleadoAsistencia.timestamp, endDate)
      )
    )
    .orderBy(schema.empleadoAsistencia.timestamp)

  const statuses = await Promise.all(
    employees.map(async (employee) => [employee.id, await getEmpleadoAttendanceStatus(employee.id)] as const)
  )

  return {
    employees,
    events,
    statusesByEmployee: Object.fromEntries(statuses),
  }
}

export async function getLiquidacionGastronomia(sector: string | undefined, year: number, month: number) {
  const { employees, events } = await getMarcacionesGastronomia(sector, year, month)

  return (employees as any[]).map((emp: any) => {
    const empEvents = (events as any[]).filter((e: any) => e.empleadoId === emp.id && e.tipo === 'entrada')
    const dias = new Set(
      empEvents.map((e: any) => {
        const d = new Date(e.timestamp)
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      })
    ).size
    return {
      empleado: emp,
      diasTrabajados: dias,
      valorDia: emp.pagoDiario,
      total: dias * emp.pagoDiario,
    }
  })
}

export type GastronomiaPlanificacionInput = {
  id?: number
  empleadoId: number
  fecha: string
  trabaja: boolean
  horaEntrada: string
  horaSalida: string
  sector?: string
  puesto?: string | null
  nota?: string | null
}

export async function listPlanificacionGastronomia(params: {
  desde: string
  hasta: string
  sector?: string
}) {
  const conditions: any[] = [
    gte(schema.gastronomiaPlanificacionTurnos.fecha, params.desde),
    lt(schema.gastronomiaPlanificacionTurnos.fecha, params.hasta),
  ]
  if (params.sector && params.sector !== 'todos') {
    conditions.push(eq(schema.gastronomiaPlanificacionTurnos.sector, params.sector))
  }
  return db.select()
    .from(schema.gastronomiaPlanificacionTurnos)
    .where(and(...conditions))
    .orderBy(schema.gastronomiaPlanificacionTurnos.fecha, schema.gastronomiaPlanificacionTurnos.empleadoNombre)
}

export async function savePlanificacionTurnoGastronomia(input: GastronomiaPlanificacionInput) {
  const empleado = await getEmpleadoGastroById(input.empleadoId)
  if (!empleado) throw new Error('Empleado gastronomico no encontrado')

  const values = {
    empleadoId: empleado.id,
    empleadoNombre: empleado.nombre,
    empleadoWaId: empleado.waId ?? null,
    sector: input.sector || (empleado as any).sector || 'brooklyn',
    puesto: input.puesto ?? (empleado as any).puesto ?? null,
    fecha: input.fecha,
    trabaja: input.trabaja,
    horaEntrada: input.horaEntrada,
    horaSalida: input.horaSalida,
    nota: input.nota ?? null,
    estado: 'borrador' as const,
    updatedAt: new Date(),
  }

  if (input.id) {
    const rows = await db.update(schema.gastronomiaPlanificacionTurnos)
      .set(values as any)
      .where(eq(schema.gastronomiaPlanificacionTurnos.id, input.id))
      .returning()
    return rows[0] ?? null
  }

  const rows = await db.insert(schema.gastronomiaPlanificacionTurnos)
    .values(values as any)
    .returning()
  return rows[0]
}

export async function deletePlanificacionTurnoGastronomia(id: number) {
  await db.delete(schema.gastronomiaPlanificacionTurnos)
    .where(eq(schema.gastronomiaPlanificacionTurnos.id, id))
    .run()
}

function getBuenosAiresDateKey(value: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

function getGastronomiaSectorLabel(sector?: string | null) {
  if (!sector) return ''
  return SECTOR_LABELS[sector as keyof typeof SECTOR_LABELS] ?? sector
}

async function resolveAttendanceAssignedLocal(empleadoId: number, referenceDate: Date) {
  const fecha = getBuenosAiresDateKey(referenceDate)
  const plannedRows = await db.select({
    sector: schema.gastronomiaPlanificacionTurnos.sector,
  })
    .from(schema.gastronomiaPlanificacionTurnos)
    .where(and(
      eq(schema.gastronomiaPlanificacionTurnos.empleadoId, empleadoId),
      eq(schema.gastronomiaPlanificacionTurnos.fecha, fecha),
      eq(schema.gastronomiaPlanificacionTurnos.trabaja, true),
    ))

  const planned = plannedRows[0]
  if (planned?.sector) {
    return {
      sector: planned.sector,
      label: getGastronomiaSectorLabel(planned.sector),
    }
  }

  const empleado = await getEmpleadoById(empleadoId)
  const fallbackSector = (empleado as any)?.sector
  if (fallbackSector && fallbackSector !== 'operativo') {
    return {
      sector: fallbackSector,
      label: getGastronomiaSectorLabel(fallbackSector),
    }
  }

  return null
}

function formatPlanificacionFecha(fecha: string) {
  const [year, month, day] = fecha.split('-').map(Number)
  const date = new Date(year, (month ?? 1) - 1, day ?? 1)
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

function formatPlanificacionFechaCorta(fecha: string) {
  const [year, month, day] = fecha.split('-').map(Number)
  const date = new Date(year, (month ?? 1) - 1, day ?? 1)
  const weekday = date.toLocaleDateString('es-AR', {
    weekday: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1)
  return `${capitalized} ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`
}

function buildPlanificacionBotMessage(turno: typeof schema.gastronomiaPlanificacionTurnos.$inferSelect) {
  const local = SECTOR_LABELS[(turno.sector as keyof typeof SECTOR_LABELS)] ?? turno.sector
  if (!turno.trabaja) {
    return [
      `🍽️ *Docks | Planificación*`,
      ``,
      `Hola *${turno.empleadoNombre}*, para el *${formatPlanificacionFecha(turno.fecha)}* figurás como *franco / no trabaja*.`,
      ``,
      `Si hubo algún cambio, escribile al encargado para revisarlo.`,
    ].join('\n')
  }
  return [
    `🍽️ *Docks | Confirmar turno*`,
    ``,
    `📅 ${formatPlanificacionFecha(turno.fecha)}`,
    `📍 ${local}`,
    `🕐 ${turno.horaEntrada} a ${turno.horaSalida}`,
    turno.puesto ? `👤 ${turno.puesto}` : null,
    turno.nota ? `📝 ${turno.nota}` : null,
    ``,
    `Respondé:`,
    `1 ✅ Confirmo asistencia`,
    `2 ❌ No puedo trabajar`,
    ``,
    `Turno #${turno.id}`,
  ].filter(Boolean).join('\n')
}

function buildPlanificacionSummaryMessage(turnos: Array<typeof schema.gastronomiaPlanificacionTurnos.$inferSelect>) {
  const sorted = [...turnos].sort((a, b) => {
    const dateCompare = String(a.fecha).localeCompare(String(b.fecha))
    if (dateCompare !== 0) return dateCompare
    return a.id - b.id
  })
  const first = sorted[0]
  const hasConfirmable = sorted.some(t => t.trabaja)

  return [
    `🍽️ *Docks | Planificación*`,
    ``,
    `Hola *${first?.empleadoNombre ?? 'equipo'}*, tenés turnos asignados:`,
    ``,
    ...sorted.map(turno => {
      const local = SECTOR_LABELS[(turno.sector as keyof typeof SECTOR_LABELS)] ?? turno.sector
      if (!turno.trabaja) {
        return `📅 ${formatPlanificacionFechaCorta(turno.fecha)} → *Franco*`
      }
      const parts = [`📅 ${formatPlanificacionFechaCorta(turno.fecha)} → ${local} | ${turno.horaEntrada} a ${turno.horaSalida}`]
      if (turno.nota) parts[0] += ` (${turno.nota})`
      return parts[0]
    }),
    ``,
    hasConfirmable
      ? `En unos segundos te llegan para confirmar. 👇`
      : `Esta planificación no requiere confirmación.`,
  ].join('\n')
}

function parsePlanificacionDateKey(fecha: string) {
  const [year, month, day] = fecha.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

function getPlanificacionWeekStart(fecha: string) {
  const date = parsePlanificacionDateKey(fecha)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function formatPlanificacionDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getPlanificacionWeekBounds(fecha: string) {
  const start = getPlanificacionWeekStart(fecha)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return {
    start: formatPlanificacionDateKey(start),
    end: formatPlanificacionDateKey(end),
  }
}

async function enqueuePlanificacionMessages(
  waNumber: string,
  turnos: Array<typeof schema.gastronomiaPlanificacionTurnos.$inferSelect>,
) {
  const normalized = normalizeWaNumber(waNumber)
  if (!normalized) return

  const pendingRows = await db.select()
    .from(schema.botQueue)
    .where(and(
      eq(schema.botQueue.waNumber, normalized),
      eq(schema.botQueue.status, 'pending'),
    ))
  const planificacionRows = pendingRows.filter(row => {
    const body = String(row.message ?? '')
    return body.includes('Docks | Planificación') || body.includes('Docks | Confirmar turno')
  })
  if (planificacionRows.length > 0) {
    await db.delete(schema.botQueue)
      .where(inArray(schema.botQueue.id, planificacionRows.map(r => r.id)))
      .run()
  }

  const sorted = [...turnos].sort((a, b) => {
    const dateCompare = String(a.fecha).localeCompare(String(b.fecha))
    if (dateCompare !== 0) return dateCompare
    return a.id - b.id
  })
  const workingTurnos = sorted.filter(t => t.trabaja)
  const now = new Date()

  if (workingTurnos.length === 0) {
    await enqueueBotMessage(waNumber, buildPlanificacionSummaryMessage(sorted))
    return
  }

  if (workingTurnos.length === 1 && sorted.length === 1) {
    await enqueueBotMessage(waNumber, buildPlanificacionBotMessage(workingTurnos[0]!))
    return
  }

  await enqueueBotMessage(waNumber, buildPlanificacionSummaryMessage(sorted))
  for (let i = 0; i < workingTurnos.length; i++) {
    const delay = new Date(now.getTime() + (i + 1) * 5000)
    await enqueueBotMessage(waNumber, buildPlanificacionBotMessage(workingTurnos[i]!), delay)
  }
}

const SECTOR_LABELS: Record<string, string> = {
  uno_grill: 'UMO Grill',
  brooklyn: 'Brooklyn',
  heladeria: 'Heladería',
  trento_cafe: 'Trento Café',
  inflables: 'Inflables',
  encargados: 'Encargados',
  promotoras: 'Promotoras',
}

export async function publishPlanificacionGastronomia(ids: number[]) {
  if (ids.length === 0) return { published: 0, skipped: 0 }
  const turnos = await db.select()
    .from(schema.gastronomiaPlanificacionTurnos)
    .where(inArray(schema.gastronomiaPlanificacionTurnos.id, ids))

  let published = 0
  let skipped = 0
  const grouped = new Map<string, Array<typeof schema.gastronomiaPlanificacionTurnos.$inferSelect>>()

  for (const turno of turnos) {
    if (!turno.empleadoWaId) {
      skipped++
      continue
    }
    const key = `${turno.empleadoId}:${turno.empleadoWaId}`
    const existing = grouped.get(key) ?? []
    existing.push(turno)
    grouped.set(key, existing)
  }

  const weekGrouped = new Map<string, Array<typeof schema.gastronomiaPlanificacionTurnos.$inferSelect>>()
  for (const employeeTurnos of grouped.values()) {
    for (const turno of employeeTurnos) {
      const weekStart = getPlanificacionWeekBounds(turno.fecha).start
      const key = `${turno.empleadoId}:${turno.empleadoWaId}:${weekStart}`
      const existing = weekGrouped.get(key) ?? []
      existing.push(turno)
      weekGrouped.set(key, existing)
    }
  }

  for (const employeeTurnos of weekGrouped.values()) {
    const waId = employeeTurnos[0]?.empleadoWaId
    if (!waId) continue
    const bounds = getPlanificacionWeekBounds(employeeTurnos[0]!.fecha)
    const weekRows = await db.select()
      .from(schema.gastronomiaPlanificacionTurnos)
      .where(and(
        eq(schema.gastronomiaPlanificacionTurnos.empleadoId, employeeTurnos[0]!.empleadoId),
        gte(schema.gastronomiaPlanificacionTurnos.fecha, bounds.start),
        lt(schema.gastronomiaPlanificacionTurnos.fecha, bounds.end),
      ))
    const selectedIds = new Set(employeeTurnos.map(turno => turno.id))
    const messageTurnos = weekRows.filter(turno => selectedIds.has(turno.id) || turno.publicadoAt)
    const dedupedMessageTurnos = [...messageTurnos].sort((a, b) => {
      const dateCompare = String(a.fecha).localeCompare(String(b.fecha))
      if (dateCompare !== 0) return dateCompare
      return a.id - b.id
    })

    await enqueuePlanificacionMessages(waId, dedupedMessageTurnos)

    for (const turno of employeeTurnos) {
      await db.update(schema.gastronomiaPlanificacionTurnos)
        .set({
          estado: turno.trabaja ? 'enviado' : 'confirmado',
          publicadoAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .where(eq(schema.gastronomiaPlanificacionTurnos.id, turno.id))
        .run()
    }
    published++
  }
  return { published, skipped }
}

export async function responderPlanificacionGastronomia(params: {
  turnoId: number
  empleadoId: number
  respuesta: 'confirmado' | 'no_trabaja'
  nota?: string | null
}) {
  const rows = await db.select()
    .from(schema.gastronomiaPlanificacionTurnos)
    .where(and(
      eq(schema.gastronomiaPlanificacionTurnos.id, params.turnoId),
      eq(schema.gastronomiaPlanificacionTurnos.empleadoId, params.empleadoId),
    ))
  const turno = rows[0]
  if (!turno) return null

  const updated = await db.update(schema.gastronomiaPlanificacionTurnos)
    .set({
      estado: params.respuesta,
      respondidoAt: new Date(),
      respuestaNota: params.nota ?? null,
      updatedAt: new Date(),
    } as any)
    .where(eq(schema.gastronomiaPlanificacionTurnos.id, turno.id))
    .returning()
  return updated[0] ?? null
}

export async function getPendingPlanificacionForEmpleado(empleadoId: number) {
  const today = new Date()
  const todayKey = today.toISOString().slice(0, 10)
  return db.select()
    .from(schema.gastronomiaPlanificacionTurnos)
    .where(and(
      eq(schema.gastronomiaPlanificacionTurnos.empleadoId, empleadoId),
      inArray(schema.gastronomiaPlanificacionTurnos.estado, ['enviado', 'sin_respuesta']),
      gte(schema.gastronomiaPlanificacionTurnos.fecha, todayKey),
    ))
    .orderBy(schema.gastronomiaPlanificacionTurnos.fecha)
}

export async function resetPlanificacionConfirmacionesGastronomia(params: {
  sector: string
  desde: string
  hasta: string
  actorUserId?: number | null
  actorNombre: string
}) {
  const conditions = and(
    eq(schema.gastronomiaPlanificacionTurnos.sector, params.sector),
    gte(schema.gastronomiaPlanificacionTurnos.fecha, params.desde),
    lt(schema.gastronomiaPlanificacionTurnos.fecha, params.hasta),
  )

  const rows = await db.select({ id: schema.gastronomiaPlanificacionTurnos.id })
    .from(schema.gastronomiaPlanificacionTurnos)
    .where(conditions)

  if (rows.length === 0) {
    return { reset: 0 }
  }

  await db.update(schema.gastronomiaPlanificacionTurnos)
    .set({
      estado: 'borrador',
      publicadoAt: null,
      respondidoAt: null,
      respuestaNota: null,
      updatedAt: new Date(),
    } as any)
    .where(conditions)
    .run()

  await db.insert(schema.gastronomiaPlanificacionAuditoria)
    .values({
      tipo: 'reset_confirmaciones',
      sector: params.sector,
      desde: params.desde,
      hasta: params.hasta,
      affectedCount: rows.length,
      actorUserId: params.actorUserId ?? null,
      actorNombre: params.actorNombre,
    } as any)
    .run()

  return { reset: rows.length }
}

export async function clearPlanificacionSemanaGastronomia(params: {
  sector: string
  desde: string
  hasta: string
  scope: 'rechazados' | 'semana_completa'
  actorUserId?: number | null
  actorNombre: string
}) {
  const conditions = [
    eq(schema.gastronomiaPlanificacionTurnos.sector, params.sector),
    gte(schema.gastronomiaPlanificacionTurnos.fecha, params.desde),
    lt(schema.gastronomiaPlanificacionTurnos.fecha, params.hasta),
  ]

  if (params.scope === 'rechazados') {
    conditions.push(eq(schema.gastronomiaPlanificacionTurnos.estado, 'no_trabaja'))
  }

  const where = and(...conditions)
  const rows = await db.select({
    id: schema.gastronomiaPlanificacionTurnos.id,
  })
    .from(schema.gastronomiaPlanificacionTurnos)
    .where(where)

  if (rows.length === 0) {
    return { cleared: 0, scope: params.scope }
  }

  await db.delete(schema.gastronomiaPlanificacionTurnos)
    .where(where)
    .run()

  await db.insert(schema.gastronomiaPlanificacionAuditoria)
    .values({
      tipo: params.scope === 'rechazados' ? 'clear_rechazados' : 'clear_semana_completa',
      sector: params.sector,
      desde: params.desde,
      hasta: params.hasta,
      affectedCount: rows.length,
      actorUserId: params.actorUserId ?? null,
      actorNombre: params.actorNombre,
    } as any)
    .run()

  return { cleared: rows.length, scope: params.scope }
}
