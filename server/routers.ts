import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { router, publicProcedure, protectedProcedure, JWT_COOKIE, JWT_SECRET } from './_core/trpc'
import { notifyOwner, notifyCompleted } from './_core/notification'
import { readEnv } from './_core/env'
import * as database from './db'
import * as schema from '../drizzle/schema'
import { buildFollowup1, buildFollowup2 } from './leads/http'
import { createRoundsService } from './rounds/service'
import { saveRoundScheduleAndSyncToday } from './rounds/schedule'
import { assignReporteToEmployee } from './reporte-assignment'
import {
  getUserByUsername,
  getUsers, getSalesUsers, getUserById, createPanelUser, updateUserPassword, deactivateUser, updateUserWhatsapp,
  crearReporte, getReportes, getReporteById, actualizarReporte, eliminarReporte, getEstadisticas,
  crearActualizacion, getActualizacionesByReporte,
  getEmpleados, crearEmpleado, actualizarEmpleado, getEmpleadoById, getEmpleadosByIds, getEmpleadoActivoById,
  buildAttendanceTurns,
  ATTENDANCE_ACTIONS, getEmpleadoAttendanceStatus, getEmpleadoAttendanceEvents, registerEmpleadoAttendance,
  createManualAttendanceEvent, correctManualAttendanceEvent, getAttendanceAuditTrailForEmpleado,
  getNotificaciones, crearNotificacion, actualizarNotificacion, eliminarNotificacion,
  crearLead, getLeads, getLeadById, actualizarLead, deleteLeadById, getLeadEventos,
  getLeadsForFollowup, updateLeadFollowup, createLeadEvento, clearLeadAttentionFlag,
  listLocatariosCobranza, upsertLocatarioCobranza, saveCobranzaImportacion, listCobranzaImportaciones,
  listCobranzaSaldos, getCobranzaSaldoById, updateCobranzaSaldoEstado, updateCobranzaSaldoContacto,
  getCobranzaNotificationsBySaldoIds, createCobranzaNotification, listCobranzaNotificaciones, clearCobranzaLista,
  createRoundTemplate, saveRoundSchedule, getRoundOverviewForDashboard, getRoundTimeline,
  deleteRoundOccurrence, reprogramarRoundOccurrence,
  createOperationalTask, createOperationalTaskFromReporte, getOperationalTaskById, listOperationalTasks, listOperationalTasksByEmployee, getOperationalTasksOverview,
  deleteOperationalTasks,
  enqueueBotMessage,
  iniciarTrabajoReporte,
  pausarTrabajoReporte,
  completarTrabajoReporte,
  limpiarDatosDemo,
  reiniciarMetricasOperacion,
  getAppConfig, setAppConfig, getAllBotConfig,
  getEmpleadosGastronomia,
  getEmpleadoGastroById,
  createEmpleadoGastro,
  updateEmpleadoGastro,
  getMarcacionesGastronomia,
  getLiquidacionGastronomia,
  listPlanificacionGastronomia,
  savePlanificacionTurnoGastronomia,
  deletePlanificacionTurnoGastronomia,
  publishPlanificacionGastronomia,
} from './db'

const roundsService = createRoundsService(database as any)
const attendanceActionEnum = z.enum(ATTENDANCE_ACTIONS)
const attendancePeriodEnum = z.enum(['dia', 'semana', 'quincena', 'mes'])
const payrollAmountSchema = z.number().int().min(0).default(0)
const operationalTaskPriorityEnum = z.enum(['baja', 'media', 'alta', 'urgente'])
const cobranzaSaldoEstadoEnum = z.enum(['pendiente', 'notificado', 'pagado', 'ignorado', 'error_contacto'])
const cobranzaImportRowSchema = z.object({
  locatarioNombre: z.string().min(1),
  local: z.string().optional(),
  periodo: z.string().min(1),
  ingreso: z.number().nullable().optional(),
  saldo: z.number().positive(),
  diasAtraso: z.number().int().nullable().optional(),
  telefonoWa: z.string().nullable().optional(),
  raw: z.unknown().optional(),
})
const operationalTaskImportItemSchema = z.object({
  tipoTrabajo: z.string().min(2),
  titulo: z.string().min(3),
  descripcion: z.string().min(3),
  ubicacion: z.string().min(2),
  prioridad: operationalTaskPriorityEnum,
  empleadoId: z.number().int().positive().optional(),
  ordenAsignacion: z.number().int().min(0).optional(),
})
const BA_OFFSET_MS = 3 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

function assertAdmin(user: { role: string }) {
  if (user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo un admin puede realizar esta acción.' })
  }
}

function toAttendanceMs(value?: Date | string | number | null) {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  return new Date(value).getTime()
}

function formatBaDateKey(value: number) {
  const shifted = new Date(value - BA_OFFSET_MS)
  const year = shifted.getUTCFullYear()
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const day = String(shifted.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getBaDayStart(value: number) {
  const shifted = new Date(value - BA_OFFSET_MS)
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) + BA_OFFSET_MS
}

function getAttendancePeriodRange(periodo: z.infer<typeof attendancePeriodEnum>, reference = Date.now()) {
  const shifted = new Date(reference - BA_OFFSET_MS)
  const year = shifted.getUTCFullYear()
  const month = shifted.getUTCMonth()
  const day = shifted.getUTCDate()
  const weekday = shifted.getUTCDay()

  let startMs = Date.UTC(year, month, day) + BA_OFFSET_MS
  let endMs = startMs + DAY_MS

  if (periodo === 'semana') {
    const diffToMonday = (weekday + 6) % 7
    startMs = Date.UTC(year, month, day - diffToMonday) + BA_OFFSET_MS
    endMs = startMs + (7 * DAY_MS)
  } else if (periodo === 'quincena') {
    const startDay = day <= 15 ? 1 : 16
    startMs = Date.UTC(year, month, startDay) + BA_OFFSET_MS
    endMs = day <= 15
      ? Date.UTC(year, month, 16) + BA_OFFSET_MS
      : Date.UTC(year, month + 1, 1) + BA_OFFSET_MS
  } else if (periodo === 'mes') {
    startMs = Date.UTC(year, month, 1) + BA_OFFSET_MS
    endMs = Date.UTC(year, month + 1, 1) + BA_OFFSET_MS
  }

  const desde = formatBaDateKey(startMs)
  const hasta = formatBaDateKey(endMs - 1)

  return {
    tipo: periodo,
    label: periodo === 'dia' ? 'Hoy' : periodo === 'semana' ? 'Semana' : periodo === 'quincena' ? 'Quincena' : 'Mes',
    desde,
    hasta,
    startMs,
    endMs,
  }
}

function getPeriodDayBuckets(startMs: number, endMs: number) {
  const buckets = new Map<string, any>()

  for (let cursor = startMs; cursor < endMs; cursor += DAY_MS) {
    const key = formatBaDateKey(cursor)
    buckets.set(key, {
      fecha: key,
      etiqueta: new Date(cursor).toLocaleDateString('es-AR', {
        weekday: 'short',
        day: '2-digit',
      }),
      grossSeconds: 0,
      lunchSeconds: 0,
      workedSeconds: 0,
      entradas: 0,
      iniciosAlmuerzo: 0,
      finesAlmuerzo: 0,
      salidas: 0,
      turnoAbierto: false,
    })
  }

  return buckets
}

function addSecondsToBuckets(
  buckets: Map<string, any>,
  rangeStartMs: number,
  rangeEndMs: number,
  segmentStartMs: number | null,
  segmentEndMs: number,
  field: 'grossSeconds' | 'lunchSeconds',
) {
  if (segmentStartMs === null) return
  let cursor = Math.max(segmentStartMs, rangeStartMs)
  const limit = Math.min(segmentEndMs, rangeEndMs)
  while (cursor < limit) {
    const dayStart = getBaDayStart(cursor)
    const nextDay = dayStart + DAY_MS
    const pieceEnd = Math.min(limit, nextDay)
    const bucket = buckets.get(formatBaDateKey(cursor))
    if (bucket) {
      bucket[field] += Math.max(0, Math.floor((pieceEnd - cursor) / 1000))
    }
    cursor = pieceEnd
  }
}

function buildEmployeePeriodDays(
  events: any[],
  period: ReturnType<typeof getAttendancePeriodRange>,
  currentAttendance: any,
) {
  const buckets = getPeriodDayBuckets(period.startMs, period.endMs)
  const sortedEvents = [...events].sort((left, right) => toAttendanceMs(left.timestamp ?? left.createdAt) - toAttendanceMs(right.timestamp ?? right.createdAt))

  for (const event of sortedEvents) {
    const eventMs = toAttendanceMs(event.timestamp ?? event.createdAt)
    const bucket = buckets.get(formatBaDateKey(eventMs))
    if (bucket && eventMs >= period.startMs && eventMs < period.endMs) {
      if (event.tipo === 'entrada') bucket.entradas += 1
      if (event.tipo === 'inicio_almuerzo') bucket.iniciosAlmuerzo += 1
      if (event.tipo === 'fin_almuerzo') bucket.finesAlmuerzo += 1
      if (event.tipo === 'salida') bucket.salidas += 1
    }
  }

  const turns = buildAttendanceTurns(events, Date.now())
  for (const turn of turns) {
    const bucket = buckets.get(turn.fecha)
    if (!bucket) continue
    bucket.grossSeconds += Number(turn.grossSeconds ?? 0)
    bucket.lunchSeconds += Number(turn.lunchSeconds ?? 0)
  }

  const todayKey = formatBaDateKey(Date.now())
  return [...buckets.values()].map((bucket) => ({
    ...bucket,
    workedSeconds: Math.max(0, bucket.grossSeconds - bucket.lunchSeconds),
    turnoAbierto: currentAttendance?.onShift ? bucket.fecha === todayKey : false,
  }))
}

function getExactRateForPeriod(empleado: any, periodo: z.infer<typeof attendancePeriodEnum>) {
  if (periodo === 'semana') return Number(empleado.pagoSemanal ?? 0)
  if (periodo === 'quincena') return Number(empleado.pagoQuincenal ?? 0)
  if (periodo === 'mes') return Number(empleado.pagoMensual ?? 0)
  return Number(empleado.pagoDiario ?? 0)
}

function buildConfiguredLiquidacion(params: {
  empleado: any
  periodo: z.infer<typeof attendancePeriodEnum>
  diasTrabajados: number
  segundosTrabajados: number
  dailyBuckets: any[]
}) {
  const hasWorkedPeriod = params.diasTrabajados > 0 || params.segundosTrabajados > 0
  const tarifaExacta = Math.max(0, getExactRateForPeriod(params.empleado, params.periodo))
  const tarifaDiaria = Math.max(0, Number(params.empleado.pagoDiario ?? 0))

  if (tarifaExacta > 0) {
    return {
      diasTrabajados: params.diasTrabajados,
      segundosTrabajados: params.segundosTrabajados,
      promedioSegundosPorDia: params.diasTrabajados > 0 ? Math.floor(params.segundosTrabajados / params.diasTrabajados) : 0,
      tarifaPeriodo: params.periodo,
      tarifaMonto: tarifaExacta,
      totalPagar: hasWorkedPeriod ? tarifaExacta : 0,
      tarifaOrigen: 'configurado',
      dias: params.dailyBuckets,
    }
  }

  if (params.periodo !== 'dia' && tarifaDiaria > 0) {
    return {
      diasTrabajados: params.diasTrabajados,
      segundosTrabajados: params.segundosTrabajados,
      promedioSegundosPorDia: params.diasTrabajados > 0 ? Math.floor(params.segundosTrabajados / params.diasTrabajados) : 0,
      tarifaPeriodo: 'dia',
      tarifaMonto: tarifaDiaria,
      totalPagar: hasWorkedPeriod ? tarifaDiaria * params.diasTrabajados : 0,
      tarifaOrigen: 'derivado',
      dias: params.dailyBuckets,
    }
  }

  return {
    diasTrabajados: params.diasTrabajados,
    segundosTrabajados: params.segundosTrabajados,
    promedioSegundosPorDia: params.diasTrabajados > 0 ? Math.floor(params.segundosTrabajados / params.diasTrabajados) : 0,
    tarifaPeriodo: params.periodo,
    tarifaMonto: 0,
    totalPagar: 0,
    tarifaOrigen: 'sin_configurar',
    dias: params.dailyBuckets,
  }
}

function mapAggregateClosure(closures: any[]) {
  if (closures.length === 0) return null
  const latestClosed = [...closures].sort((left, right) => toAttendanceMs(right.closedAt) - toAttendanceMs(left.closedAt))[0]
  const latestPaid = [...closures]
    .filter((closure) => closure.pagadoAt)
    .sort((left, right) => toAttendanceMs(right.pagadoAt) - toAttendanceMs(left.pagadoAt))[0] ?? null
  const singleClosedBy = new Set(closures.map((closure) => closure.cerradoPorNombre)).size === 1
    ? latestClosed.cerradoPorNombre
    : 'Varios'
  const allPaid = closures.every((closure) => closure.pagadoAt)
  const paidBy = allPaid
    ? new Set(closures.map((closure) => closure.pagadoPorNombre ?? '')).size === 1
      ? latestPaid?.pagadoPorNombre ?? ''
      : 'Varios'
    : null

  return {
    cerrado: true,
    pagado: allPaid,
    closedAt: latestClosed.closedAt ?? null,
    closedBy: singleClosedBy,
    paidAt: latestPaid?.pagadoAt ?? null,
    paidBy,
    totalPagado: closures.reduce((total, closure) => total + Number(closure.totalPagar ?? 0), 0),
  }
}

async function buildAttendanceSummary(params: {
  periodo: z.infer<typeof attendancePeriodEnum>
  empleadoId?: number
  referenceDateMs?: number
}) {
  const period = getAttendancePeriodRange(params.periodo, params.referenceDateMs)
  const [empleadosRaw, eventosRaw, cierresRaw, reportesRaw, tareasOperativasRaw] = await Promise.all([
    getEmpleados(),
    database.db.select().from(schema.empleadoAsistencia),
    database.db.select().from(schema.empleadoLiquidacionCierre),
    database.db.select().from(schema.reportes),
    listOperationalTasks(),
  ])

  const empleados = params.empleadoId
    ? empleadosRaw.filter((empleado) => empleado.id === params.empleadoId)
    : empleadosRaw

  const cierresPeriodo = cierresRaw.filter((cierre) =>
    cierre.periodoTipo === params.periodo &&
    cierre.periodoDesde === period.desde &&
    cierre.periodoHasta === period.hasta,
  )
  const cierresByEmpleado = new Map<number, any>()
  for (const cierre of cierresPeriodo) {
    const current = cierresByEmpleado.get(cierre.empleadoId)
    if (!current || toAttendanceMs(cierre.closedAt) > toAttendanceMs(current.closedAt)) {
      cierresByEmpleado.set(cierre.empleadoId, cierre)
    }
  }

  const eventos = eventosRaw
    .filter((evento) => {
      const eventoMs = toAttendanceMs(evento.timestamp ?? evento.createdAt)
      return eventoMs >= period.startMs && eventoMs < period.endMs
    })
    .filter((evento) => !params.empleadoId || evento.empleadoId === params.empleadoId)
    .sort((left, right) => toAttendanceMs(right.timestamp ?? right.createdAt) - toAttendanceMs(left.timestamp ?? left.createdAt))
    .map((evento) => {
      const empleado = empleadosRaw.find((item) => item.id === evento.empleadoId)
      return {
        ...evento,
        empleadoId: evento.empleadoId,
        empleadoNombre: empleado?.nombre ?? `Empleado ${evento.empleadoId}`,
        especialidad: empleado?.especialidad ?? null,
      }
    })

  const todayKey = formatBaDateKey(Date.now())

  const empleadosSummary = await Promise.all(empleados.map(async (empleado) => {
    const employeeEvents = eventosRaw.filter((evento) => evento.empleadoId === empleado.id)
    const attendance = await getEmpleadoAttendanceStatus(empleado.id)
    const dailyBuckets = buildEmployeePeriodDays(employeeEvents, period, attendance)
    const periodTurns = buildAttendanceTurns(employeeEvents)
      .filter((turn) => {
        const entryMs = turn.entradaAt instanceof Date ? turn.entradaAt.getTime() : 0
        const exitMs = turn.salidaAt instanceof Date ? turn.salidaAt.getTime() : Date.now()
        return exitMs > period.startMs && entryMs < period.endMs
      })
      .map((turn) => ({
        ...turn,
        fecha: turn.fecha,
        etiqueta: turn.entradaAt instanceof Date
          ? turn.entradaAt.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
          : turn.fecha,
      }))
    const todayEvents = employeeEvents.filter((evento) => formatBaDateKey(toAttendanceMs(evento.timestamp ?? evento.createdAt)) === todayKey)
    const todayEntries = todayEvents
      .filter((evento) => evento.tipo === 'entrada')
      .sort((left, right) => toAttendanceMs(left.timestamp ?? left.createdAt) - toAttendanceMs(right.timestamp ?? right.createdAt))
    const todayExits = todayEvents
      .filter((evento) => evento.tipo === 'salida')
      .sort((left, right) => toAttendanceMs(right.timestamp ?? right.createdAt) - toAttendanceMs(left.timestamp ?? left.createdAt))

    const reportes = reportesRaw.filter((reporte) =>
      reporte.asignadoId === empleado.id &&
      !['completado', 'cancelado'].includes(reporte.estado),
    )
    const tareasOperativas = tareasOperativasRaw.filter((task) =>
      task.empleadoId === empleado.id &&
      !['terminada', 'cancelada', 'rechazada'].includes(task.estado),
    )

    const cierre = cierresByEmpleado.get(empleado.id) ?? null
    const segundosTrabajados = dailyBuckets.reduce((total, day) => total + Number(day.workedSeconds ?? 0), 0)
    const diasTrabajados = dailyBuckets.filter((day) =>
      day.workedSeconds > 0 ||
      day.entradas > 0 ||
      day.salidas > 0 ||
      day.iniciosAlmuerzo > 0 ||
      day.finesAlmuerzo > 0,
    ).length

    const liquidacion = cierre ? {
      diasTrabajados: cierre.diasTrabajados,
      segundosTrabajados: cierre.segundosTrabajados,
      promedioSegundosPorDia: cierre.promedioSegundosPorDia,
      tarifaPeriodo: cierre.tarifaPeriodo,
      tarifaMonto: cierre.tarifaMonto,
      totalPagar: cierre.totalPagar,
      tarifaOrigen: 'cierre',
      dias: dailyBuckets,
    } : buildConfiguredLiquidacion({
      empleado,
      periodo: params.periodo,
      diasTrabajados,
      segundosTrabajados,
      dailyBuckets,
    })

    return {
      empleadoId: empleado.id,
      nombre: empleado.nombre,
      especialidad: empleado.especialidad ?? null,
      attendance,
      turnos: periodTurns,
      hoy: {
        primerIngresoAt: todayEntries[0] ? (todayEntries[0].timestamp ?? todayEntries[0].createdAt) : null,
        ultimaSalidaAt: todayExits[0] ? (todayExits[0].timestamp ?? todayExits[0].createdAt) : null,
      },
      liquidacion,
      pagoDiario: Number(empleado.pagoDiario ?? 0),
      pagoSemanal: Number(empleado.pagoSemanal ?? 0),
      pagoQuincenal: Number(empleado.pagoQuincenal ?? 0),
      pagoMensual: Number(empleado.pagoMensual ?? 0),
      cierre,
      tareasEnCurso:
        reportes.filter((reporte) => reporte.estado === 'en_progreso').length +
        tareasOperativas.filter((task) => task.estado === 'en_progreso').length,
      tareasPausadas:
        reportes.filter((reporte) => reporte.estado === 'pausado').length +
        tareasOperativas.filter((task) => task.estado === 'pausada').length,
      tareasPendientes:
        reportes.filter((reporte) => reporte.estado === 'pendiente').length +
        tareasOperativas.filter((task) => ['pendiente_asignacion', 'pendiente_confirmacion'].includes(task.estado)).length,
      pendientesConfirmacion:
        reportes.filter((reporte) => reporte.asignacionEstado === 'pendiente_confirmacion').length +
        tareasOperativas.filter((task) => task.estado === 'pendiente_confirmacion').length,
    }
  }))

  const includedClosures = empleadosSummary
    .map((empleado) => empleado.cierre)
    .filter(Boolean)
  const topLevelClosure = includedClosures.length === empleadosSummary.length && empleadosSummary.length > 0
    ? mapAggregateClosure(includedClosures)
    : null

  return {
    periodo: period,
    empleados: empleadosSummary,
    eventos,
    resumenEquipo: {
      empleadosActivos: empleadosSummary.length,
      enTurno: empleadosSummary.filter((empleado) => empleado.attendance?.onShift).length,
      horasPeriodoSegundos: empleadosSummary.reduce((total, empleado) => total + Number(empleado.liquidacion?.segundosTrabajados ?? 0), 0),
      diasLiquidados: empleadosSummary.reduce((total, empleado) => total + Number(empleado.liquidacion?.diasTrabajados ?? 0), 0),
      totalPagar: empleadosSummary.reduce((total, empleado) => total + Number(empleado.liquidacion?.totalPagar ?? 0), 0),
      pendientesConfirmacion: empleadosSummary.reduce((total, empleado) => total + Number(empleado.pendientesConfirmacion ?? 0), 0),
    },
    cierre: topLevelClosure,
  }
}

async function replaceLiquidacionClosure(params: {
  periodo: z.infer<typeof attendancePeriodEnum>
  empleadoId?: number
  admin: { id: number; name: string }
}) {
  const summary = await buildAttendanceSummary(params)
  const period = summary.periodo

  for (const empleado of summary.empleados) {
    await database.db.delete(schema.empleadoLiquidacionCierre).where(and(
      eq(schema.empleadoLiquidacionCierre.empleadoId, empleado.empleadoId),
      eq(schema.empleadoLiquidacionCierre.periodoTipo, params.periodo),
      eq(schema.empleadoLiquidacionCierre.periodoDesde, period.desde),
      eq(schema.empleadoLiquidacionCierre.periodoHasta, period.hasta),
    )).run()

    await database.db.insert(schema.empleadoLiquidacionCierre).values({
      empleadoId: empleado.empleadoId,
      periodoTipo: params.periodo,
      periodoDesde: period.desde,
      periodoHasta: period.hasta,
      diasTrabajados: empleado.liquidacion?.diasTrabajados ?? 0,
      segundosTrabajados: empleado.liquidacion?.segundosTrabajados ?? 0,
      promedioSegundosPorDia: empleado.liquidacion?.promedioSegundosPorDia ?? 0,
      pagoDiario: empleado.pagoDiario ?? 0,
      pagoSemanal: empleado.pagoSemanal ?? 0,
      pagoQuincenal: empleado.pagoQuincenal ?? 0,
      pagoMensual: empleado.pagoMensual ?? 0,
      tarifaPeriodo: empleado.liquidacion?.tarifaPeriodo ?? params.periodo,
      tarifaMonto: empleado.liquidacion?.tarifaMonto ?? 0,
      totalPagar: empleado.liquidacion?.totalPagar ?? 0,
      cerradoPorId: params.admin.id,
      cerradoPorNombre: params.admin.name,
      closedAt: new Date(),
      pagadoAt: null,
      pagadoPorId: null,
      pagadoPorNombre: null,
    }).run()
  }

  return { success: true, closed: summary.empleados.length }
}

async function markLiquidacionAsPaid(params: {
  periodo: z.infer<typeof attendancePeriodEnum>
  empleadoId?: number
  admin: { id: number; name: string }
}) {
  const period = getAttendancePeriodRange(params.periodo)
  const empleados = params.empleadoId ? [params.empleadoId] : (await getEmpleados()).map((empleado) => empleado.id)
  let updated = 0

  for (const empleadoId of empleados) {
    const rows = await database.db.select().from(schema.empleadoLiquidacionCierre).where(and(
      eq(schema.empleadoLiquidacionCierre.empleadoId, empleadoId),
      eq(schema.empleadoLiquidacionCierre.periodoTipo, params.periodo),
      eq(schema.empleadoLiquidacionCierre.periodoDesde, period.desde),
      eq(schema.empleadoLiquidacionCierre.periodoHasta, period.hasta),
    ))

    const current = rows[0] ?? null
    if (!current) continue

    await database.db.update(schema.empleadoLiquidacionCierre).set({
      pagadoAt: new Date(),
      pagadoPorId: params.admin.id,
      pagadoPorNombre: params.admin.name,
    }).where(eq(schema.empleadoLiquidacionCierre.id, current.id)).run()
    updated += 1
  }

  return { success: true, updated }
}


const gastronomiaRouter = router({
  listEmpleados: protectedProcedure
    .input(z.object({ sector: z.string().optional(), activo: z.boolean().optional() }))
    .query(async ({ input, ctx }) => {
      assertAdmin(ctx.user)
      return getEmpleadosGastronomia(input.sector, input.activo)
    }),

  getEmpleado: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      assertAdmin(ctx.user)
      const emp = await getEmpleadoGastroById(input.id)
      if (!emp) throw new TRPCError({ code: 'NOT_FOUND' })
      return emp
    }),

  createEmpleado: protectedProcedure
    .input(z.object({
      nombre: z.string().min(1),
      telefono: z.string().optional(),
      waId: z.string().optional(),
      sector: z.string().min(1),
      puesto: z.string().optional(),
      pagoDiario: z.number().int().min(0).default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx.user)
      return createEmpleadoGastro(input)
    }),

  bulkImportEmpleados: protectedProcedure
    .input(z.array(z.object({
      nombre: z.string().min(1),
      sector: z.string().min(1),
      puesto: z.string().optional(),
      pagoDiario: z.number().int().min(0).default(0),
    })))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx.user)
      const results = await Promise.allSettled(input.map(emp => createEmpleadoGastro(emp)))
      const created = results.filter(r => r.status === 'fulfilled').length
      const errors = results.filter(r => r.status === 'rejected').length
      return { created, errors }
    }),

  updateEmpleado: protectedProcedure
    .input(z.object({
      id: z.number(),
      nombre: z.string().min(1).optional(),
      telefono: z.string().optional(),
      waId: z.string().optional(),
      sector: z.string().optional(),
      puesto: z.string().optional(),
      pagoDiario: z.number().int().min(0).optional(),
      sheetsRow: z.number().int().optional(),
      activo: z.boolean().optional(),
      puedeGastronomia: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx.user)
      const { id, ...data } = input
      return updateEmpleadoGastro(id, data)
    }),

  getMarcaciones: protectedProcedure
    .input(z.object({
      sector: z.string().optional(),
      year: z.number(),
      month: z.number().min(1).max(12),
    }))
    .query(async ({ input, ctx }) => {
      assertAdmin(ctx.user)
      return getMarcacionesGastronomia(input.sector, input.year, input.month)
    }),

  getLiquidacion: protectedProcedure
    .input(z.object({
      sector: z.string().optional(),
      year: z.number(),
      month: z.number().min(1).max(12),
    }))
    .query(async ({ input, ctx }) => {
      assertAdmin(ctx.user)
      return getLiquidacionGastronomia(input.sector, input.year, input.month)
    }),

  listPlanificacion: protectedProcedure
    .input(z.object({
      desde: z.string().min(10),
      hasta: z.string().min(10),
      sector: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      assertAdmin(ctx.user)
      return listPlanificacionGastronomia(input)
    }),

  savePlanificacionTurno: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      empleadoId: z.number(),
      fecha: z.string().min(10),
      trabaja: z.boolean(),
      horaEntrada: z.string().min(4),
      horaSalida: z.string().min(4),
      sector: z.string().optional(),
      puesto: z.string().optional().nullable(),
      nota: z.string().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx.user)
      return savePlanificacionTurnoGastronomia(input)
    }),

  deletePlanificacionTurno: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx.user)
      await deletePlanificacionTurnoGastronomia(input.id)
      return { success: true }
    }),

  publishPlanificacion: protectedProcedure
    .input(z.object({ ids: z.array(z.number()).min(1) }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx.user)
      return publishPlanificacionGastronomia(input.ids)
    }),

})

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user ?? null),
    login: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByUsername(input.username)
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Usuario o contraseña incorrectos' })
        const ok = await bcrypt.compare(input.password, user.password)
        if (!ok) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Usuario o contraseña incorrectos' })
        const token = jwt.sign(
          { id: user.id, username: user.username, name: user.name, role: user.role },
          JWT_SECRET,
          { expiresIn: '7d', algorithm: 'HS256' }
        )
        ctx.res.cookie(JWT_COOKIE, token, {
          httpOnly: true,
          sameSite: 'lax',
          secure: ctx.req.secure || ctx.req.headers['x-forwarded-proto'] === 'https',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        return { success: true, user: { id: user.id, name: user.name, role: user.role } }
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(JWT_COOKIE)
      return { success: true }
    }),
  }),

  reportes: router({
    crear: publicProcedure
      .input(z.object({
        locatario: z.string().min(1).max(120),
        local: z.string().min(1).max(120),
        planta: z.enum(['baja', 'alta']),
        contacto: z.string().max(120).optional(),
        emailLocatario: z.string().email().max(254).optional(),
        categoria: z.enum(['electrico', 'plomeria', 'estructura', 'limpieza', 'seguridad', 'climatizacion', 'otro']),
        prioridad: z.enum(['baja', 'media', 'alta', 'urgente']),
        titulo: z.string().min(1).max(500),
        descripcion: z.string().min(10).max(5000),
        fotos: z.string().max(2000).optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await crearReporte(input as any)
        notifyOwner({
          title: `[${input.prioridad.toUpperCase()}] Nuevo reclamo — ${input.local}`,
          content: `${input.locatario} reportó: ${input.titulo}`,
          urgent: input.prioridad === 'urgente',
        }).catch(console.error)
        return { success: true, id }
      }),

    listar: protectedProcedure
      .input(z.object({
        estado: z.string().optional(),
        prioridad: z.string().optional(),
        busqueda: z.string().optional(),
      }).optional())
      .query(({ input }) => getReportes(input)),

    obtener: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const reporte = await getReporteById(input.id)
        if (!reporte) throw new TRPCError({ code: 'NOT_FOUND' })
        const actualizaciones = await getActualizacionesByReporte(input.id)
        return { ...reporte, actualizaciones }
      }),

    actualizarEstado: protectedProcedure
      .input(z.object({
        id: z.number(),
        estado: z.enum(['pendiente', 'en_progreso', 'pausado', 'completado', 'cancelado']),
        nota: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const reporte = await getReporteById(input.id)
        if (!reporte) throw new TRPCError({ code: 'NOT_FOUND' })
        if (input.estado === 'en_progreso') {
          // Block: can't go to en_progreso until employee accepts via WhatsApp
          if (reporte.asignacionEstado === 'pendiente_confirmacion') {
            throw new TRPCError({
              code: 'PRECONDITION_FAILED',
              message: 'Esperando confirmación del empleado vía WhatsApp',
            })
          }
          await iniciarTrabajoReporte(input.id)
        } else if (input.estado === 'pausado') {
          await pausarTrabajoReporte(input.id)
        } else if (input.estado === 'completado') {
          await completarTrabajoReporte(input.id)
        } else {
          await actualizarReporte(input.id, { estado: input.estado })
        }
        await crearActualizacion({
          reporteId: input.id,
          usuarioId: ctx.user.id,
          usuarioNombre: ctx.user.name,
          tipo: input.estado === 'completado' ? 'completado' : 'estado',
          descripcion: input.nota ?? `Estado actualizado a: ${input.estado}`,
          estadoAnterior: reporte.estado,
          estadoNuevo: input.estado,
        })
        if (input.estado === 'completado') {
          notifyCompleted({ title: `Reclamo #${input.id} completado`, content: reporte.titulo }).catch(console.error)
        }
        return { success: true }
      }),

    asignar: protectedProcedure
      .input(z.object({ id: z.number(), empleadoNombre: z.string(), empleadoId: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        try {
          await assignReporteToEmployee({
            reporteId: input.id,
            empleadoId: input.empleadoId,
            empleadoNombre: input.empleadoNombre,
            actor: { id: ctx.user.id, name: ctx.user.name },
          })
        } catch (error: any) {
          if (error?.message === 'Reporte no encontrado') {
            throw new TRPCError({ code: 'NOT_FOUND', message: error.message })
          }
          if (error?.message === 'Empleado no encontrado') {
            throw new TRPCError({ code: 'NOT_FOUND', message: error.message })
          }
          throw error
        }
        return { success: true }
      }),

    agregarNota: protectedProcedure
      .input(z.object({ id: z.number(), nota: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        await crearActualizacion({
          reporteId: input.id,
          usuarioId: ctx.user.id,
          usuarioNombre: ctx.user.name,
          tipo: 'nota',
          descripcion: input.nota,
        })
        return { success: true }
      }),

    eliminar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        await eliminarReporte(input.id)
        return { success: true }
      }),

    estadisticas: protectedProcedure.query(() => getEstadisticas()),
  }),

  leads: router({
    crear: publicProcedure
      .input(z.object({
        nombre: z.string().min(1).max(120),
        telefono: z.string().max(30).optional(),
        email: z.string().email().max(254).optional(),
        waId: z.string().max(30).optional(),
        rubro: z.string().max(200).optional(),
        tipoLocal: z.string().max(200).optional(),
        mensaje: z.string().max(2000).optional(),
        turnoFecha: z.string().max(20).optional(),
        turnoHora: z.string().max(10).optional(),
        fuente: z.enum(['whatsapp', 'web', 'otro']).default('web'),
      }))
      .mutation(async ({ input }) => {
        const id = await crearLead(input as any)
        notifyOwner({
          title: `Nuevo lead de alquiler`,
          content: `${input.nombre} (${input.telefono ?? input.email ?? 'sin contacto'}) — ${input.rubro ?? 'sin rubro'}`,
        }).catch(console.error)
        return { success: true, id }
      }),

    listar: protectedProcedure
      .input(z.object({ estado: z.string().optional() }).optional())
      .query(({ input }) => getLeads(input)),

    obtener: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const lead = await getLeadById(input.id)
        if (!lead) throw new TRPCError({ code: 'NOT_FOUND' })
        return lead
      }),

    actualizar: protectedProcedure
      .input(z.object({
        id: z.number(),
        estado: z.enum(['nuevo', 'contactado', 'visito', 'cerrado', 'descartado']).optional(),
        turnoFecha: z.string().optional(),
        turnoHora: z.string().optional(),
        notas: z.string().optional(),
        asignadoA: z.string().optional(),
        asignadoId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input
        const leadBeforeUpdate = await getLeadById(id)
        if (!leadBeforeUpdate) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead no encontrado' })
        await actualizarLead(id, data as any)
        let notificationSent = false
        let notificationWarning: string | null = null

        if (typeof input.asignadoId === 'number') {
          const assignedUser = await getUserById(input.asignadoId)
          if (assignedUser?.waId) {
            const message = buildLeadAssignmentMessage({
              lead: { ...leadBeforeUpdate, ...data },
              assignedUserName: assignedUser.name,
            })
            await enqueueBotMessage(assignedUser.waId, message)
            notificationSent = true
          } else {
            notificationWarning = 'El usuario asignado no tiene WhatsApp cargado.'
          }
        }

        return { success: true, notificationSent, notificationWarning }
      }),

    asignarBot: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const lead = await getLeadById(input.id)
        if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead no encontrado' })

        const waNumber = lead.waId || lead.telefono
        if (!waNumber) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'El lead no tiene WhatsApp o teléfono cargado.',
          })
        }

        const message = await buildBotLeadReply(lead)
        const botQueueId = await enqueueBotMessage(waNumber, message)
        if (!botQueueId) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'No pude normalizar el WhatsApp del lead.',
          })
        }

        const now = new Date()
        await actualizarLead(input.id, {
          asignadoA: 'Bot comercial',
          asignadoId: null,
          firstContactedAt: lead.firstContactedAt ?? now,
          lastBotMsgAt: now,
          autoFollowupCount: Math.max(1, Number(lead.autoFollowupCount ?? 0)),
        } as any)

        return { success: true, queued: true, botQueueId }
      }),

    asignarBotBatch: protectedProcedure
      .input(z.object({ ids: z.array(z.number()).min(1).max(50) }))
      .mutation(async ({ input }) => {
        const results: { id: number; ok: boolean; error?: string }[] = []
        for (const id of input.ids) {
          try {
            const lead = await getLeadById(id)
            if (!lead) { results.push({ id, ok: false, error: 'No encontrado' }); continue }
            const waNumber = lead.waId || lead.telefono
            if (!waNumber) { results.push({ id, ok: false, error: 'Sin WhatsApp/teléfono' }); continue }
            const message = await buildBotLeadReply(lead)
            const botQueueId = await enqueueBotMessage(waNumber, message)
            if (!botQueueId) { results.push({ id, ok: false, error: 'No se pudo normalizar WhatsApp' }); continue }
            const now = new Date()
            await actualizarLead(id, {
              asignadoA: 'Bot comercial',
              asignadoId: null,
              firstContactedAt: lead.firstContactedAt ?? now,
              lastBotMsgAt: now,
              autoFollowupCount: Math.max(1, Number(lead.autoFollowupCount ?? 0)),
            } as any)
            results.push({ id, ok: true })
          } catch (e: any) {
            results.push({ id, ok: false, error: e.message ?? 'Error desconocido' })
          }
        }
        const sent = results.filter(r => r.ok).length
        return { success: true, sent, total: input.ids.length, results }
      }),

    eliminar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        await deleteLeadById(input.id)
        return { success: true }
      }),

    eventos: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getLeadEventos(input.id)),

    sendFollowup: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        tipo: z.enum(['followup1_sent', 'followup2_sent']),
      }))
      .mutation(async ({ input }) => {
        const lead = await getLeadById(input.leadId)
        if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead no encontrado' })
        if (!lead.waId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Lead sin WhatsApp' })

        const newCount = input.tipo === 'followup1_sent' ? 1 : 2
        const buildMsg = input.tipo === 'followup1_sent' ? buildFollowup1 : buildFollowup2
        const msg = await buildMsg(lead.nombre)

        await enqueueBotMessage(lead.waId, msg)
        await createLeadEvento({
          leadId: lead.id,
          tipo: input.tipo,
          descripcion: `${input.tipo === 'followup1_sent' ? 'Follow-up 1' : 'Follow-up 2'} enviado manualmente a ${lead.nombre}`,
          metadataJson: JSON.stringify({ message: msg, manual: true }),
        })
        await updateLeadFollowup(lead.id, newCount)
        return { ok: true }
      }),

    processFollowupBatch: protectedProcedure
      .mutation(async () => {
        const leads = await getLeadsForFollowup()
        const now = Date.now()
        const delay1Min = Number((await getAppConfig('followup1_delay_min')) ?? 30)
        const delay2Hs  = Number((await getAppConfig('followup2_delay_horas')) ?? 4)
        const DELAY1_MS = delay1Min * 60 * 1000
        const DELAY2_MS = delay2Hs  * 60 * 60 * 1000
        let sent = 0

        for (const lead of leads) {
          if (!lead.waId) continue
          const lastMs  = lead.lastBotMsgAt ? new Date(lead.lastBotMsgAt as any).getTime() : 0
          const elapsed = now - lastMs
          const count   = lead.autoFollowupCount ?? 0
          try {
            if (count === 0 && elapsed >= DELAY1_MS) {
              const msg = await buildFollowup1(lead.nombre)
              await enqueueBotMessage(lead.waId, msg)
              await createLeadEvento({ leadId: lead.id, tipo: 'followup1_sent', descripcion: `Follow-up 1 enviado automáticamente a ${lead.nombre}`, metadataJson: JSON.stringify({ message: msg }) })
              await updateLeadFollowup(lead.id, 1)
              sent++
            } else if (count === 1 && elapsed >= DELAY2_MS) {
              const msg = await buildFollowup2(lead.nombre)
              await enqueueBotMessage(lead.waId, msg)
              await createLeadEvento({ leadId: lead.id, tipo: 'followup2_sent', descripcion: `Follow-up 2 enviado automáticamente a ${lead.nombre}`, metadataJson: JSON.stringify({ message: msg }) })
              await updateLeadFollowup(lead.id, 2)
              sent++
            }
          } catch (e) {
            console.error(`[processFollowupBatch] lead ${lead.id}:`, e)
          }
        }
        return { sent, checked: leads.length }
      }),

    clearAttentionFlag: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => clearLeadAttentionFlag(input.id)),
  }),

  rondas: router({
    crearPlantilla: protectedProcedure
      .input(z.object({
        nombre: z.string().min(3),
        descripcion: z.string().optional(),
        intervaloHoras: z.number().min(1).max(12),
        checklistObjetivo: z.string().optional(),
      }))
      .mutation(({ input }) => createRoundTemplate(input)),

    guardarProgramacion: protectedProcedure
      .input(z.object({
        plantillaId: z.number(),
        modoProgramacion: z.enum(['semanal', 'fecha_especial']),
        diaSemana: z.number().min(0).max(6).optional(),
        fechaEspecial: z.string().optional(),
        horaInicio: z.string(),
        horaFin: z.string(),
        empleadoId: z.number(),
        supervisorUserId: z.number().optional(),
        escalacionHabilitada: z.boolean().default(true),
      }))
      .mutation(({ input }) =>
        saveRoundScheduleAndSyncToday(
          {
            saveRoundSchedule,
            createDailyOccurrences: (dateKey) => roundsService.createDailyOccurrences(dateKey),
          },
          input
        )
      ),

    resumenHoy: protectedProcedure.query(() => getRoundOverviewForDashboard()),

    timeline: protectedProcedure
      .input(z.object({ fechaOperativa: z.string() }))
      .query(({ input }) => getRoundTimeline(input.fechaOperativa)),

    asignarOcurrencia: protectedProcedure
      .input(z.object({
        occurrenceId: z.number(),
        empleadoId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        return roundsService.assignOccurrence({
          occurrenceId: input.occurrenceId,
          empleadoId: input.empleadoId,
          actor: {
            id: ctx.user.id,
            name: ctx.user.name,
          },
        })
      }),

    liberarOcurrencia: protectedProcedure
      .input(z.object({
        occurrenceId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        return roundsService.releaseOccurrence({
          occurrenceId: input.occurrenceId,
          actor: {
            id: ctx.user.id,
            name: ctx.user.name,
          },
        })
      }),

    eliminarOcurrencia: protectedProcedure
      .input(z.object({ occurrenceId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        await deleteRoundOccurrence(input.occurrenceId)
      }),

    reprogramarOcurrencia: protectedProcedure
      .input(z.object({
        occurrenceId: z.number(),
        programadoAt: z.string(), // ISO datetime string
        fechaOperativa: z.string(), // YYYY-MM-DD
      }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        const date = new Date(input.programadoAt)
        const label = date.toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'America/Argentina/Buenos_Aires',
        })
        await reprogramarRoundOccurrence(input.occurrenceId, date, input.fechaOperativa, label)
      }),
  }),

  tareasOperativas: router({
    crear: protectedProcedure
      .input(z.object({
        tipoTrabajo: z.string().min(2),
        titulo: z.string().min(3),
        descripcion: z.string().min(3),
        ubicacion: z.string().min(2),
        prioridad: operationalTaskPriorityEnum,
        empleadoId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        let empleado = null
        if (typeof input.empleadoId === 'number') {
          empleado = await getEmpleadoById(input.empleadoId)
          if (!empleado) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empleado no encontrado' })
        }

        const id = await createOperationalTask({
          origen: 'manual',
          tipoTrabajo: input.tipoTrabajo,
          titulo: input.titulo,
          descripcion: input.descripcion,
          ubicacion: input.ubicacion,
          prioridad: input.prioridad,
          empleadoId: input.empleadoId,
          empleadoNombre: empleado?.nombre ?? undefined,
          empleadoWaId: empleado?.waId ?? undefined,
        } as any)

        if (empleado) {
          await notifyOperationalTaskAssignment(id, empleado)
        }

        return { success: true, id }
      }),

    importarExcel: protectedProcedure
      .input(z.object({
        nombreArchivo: z.string().max(180).optional(),
        tareas: z.array(operationalTaskImportItemSchema).min(1).max(300),
      }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)

        const employeeIds = [...new Set(
          input.tareas
            .map((task) => task.empleadoId)
            .filter((id): id is number => typeof id === 'number')
        )]

        const fetchedEmployees = await getEmpleadosByIds(employeeIds)
        const empleadosById = new Map<number, Awaited<ReturnType<typeof getEmpleadoById>>>()
        for (const emp of fetchedEmployees) {
          empleadosById.set(emp.id, emp)
        }

        for (const id of employeeIds) {
          if (!empleadosById.has(id)) {
            throw new TRPCError({ code: 'NOT_FOUND', message: `Empleado ${id} no encontrado` })
          }
        }

        const orderByEmployee = new Map<string, number>()
        const created: Array<{
          id: number
          titulo: string
          ubicacion: string
          prioridad: z.infer<typeof operationalTaskPriorityEnum>
          empleadoId?: number
        }> = []

        for (const [index, task] of input.tareas.entries()) {
          const empleado = task.empleadoId ? empleadosById.get(task.empleadoId) ?? null : null
          const employeeKey = empleado?.id ? String(empleado.id) : 'sin-asignar'
          const nextOrder = (orderByEmployee.get(employeeKey) ?? 0) + 1
          orderByEmployee.set(employeeKey, nextOrder)

          const id = await createOperationalTask({
            origen: 'manual',
            tipoTrabajo: task.tipoTrabajo.trim(),
            titulo: task.titulo.trim(),
            descripcion: task.descripcion.trim(),
            ubicacion: task.ubicacion.trim(),
            prioridad: task.prioridad,
            empleadoId: empleado?.id,
            empleadoNombre: empleado?.nombre ?? undefined,
            empleadoWaId: empleado?.waId ?? undefined,
            ordenAsignacion: task.ordenAsignacion ?? nextOrder ?? index + 1,
          } as any)

          created.push({
            id,
            titulo: task.titulo.trim(),
            ubicacion: task.ubicacion.trim(),
            prioridad: task.prioridad,
            empleadoId: empleado?.id,
          })
        }

        let notificaciones = 0
        for (const empleadoId of employeeIds) {
          const empleado = empleadosById.get(empleadoId)
          if (!empleado) continue
          const tareas = created.filter((task) => task.empleadoId === empleadoId)
          if (tareas.length === 0) continue
          const notified = await notifyOperationalTaskBatchAssignment({
            employee: empleado,
            tasks: tareas,
            sourceName: input.nombreArchivo,
          })
          if (notified) notificaciones += 1
        }

        return {
          success: true,
          creadas: created.length,
          asignadas: created.filter((task) => task.empleadoId).length,
          sinAsignar: created.filter((task) => !task.empleadoId).length,
          notificaciones,
          ids: created.map((task) => task.id),
        }
      }),

    crearDesdeReclamo: protectedProcedure
      .input(z.object({
        reporteId: z.number(),
        tipoTrabajo: z.string().min(2),
        empleadoId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const empleado = typeof input.empleadoId === 'number'
            ? await getEmpleadoById(input.empleadoId)
            : null
          const result = await createOperationalTaskFromReporte(input)
          if (empleado) {
            await notifyOperationalTaskAssignment(result.id, empleado)
          }
          return {
            success: true,
            ...result,
          }
        } catch (error: any) {
          if (error?.message === 'Reporte no encontrado') {
            throw new TRPCError({ code: 'NOT_FOUND', message: error.message })
          }
          if (error?.message === 'Empleado no encontrado') {
            throw new TRPCError({ code: 'NOT_FOUND', message: error.message })
          }
          throw error
        }
      }),

    listar: protectedProcedure.query(() => listOperationalTasks()),

    listarPorEmpleado: protectedProcedure
      .input(z.object({ empleadoId: z.number() }))
      .query(({ input }) => listOperationalTasksByEmployee(input.empleadoId)),

    eliminarLote: protectedProcedure
      .input(z.object({ ids: z.array(z.number()).min(1) }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        const deleted = await deleteOperationalTasks(input.ids)
        return { success: true, deleted }
      }),

    resumenHoy: protectedProcedure.query(() => getOperationalTasksOverview()),
  }),

  cobranzas: router({
    resumen: protectedProcedure.query(async ({ ctx }) => {
      assertCollectionsAccess(ctx.user)
      const [saldos, importaciones, notificaciones] = await Promise.all([
        listCobranzaSaldos(),
        listCobranzaImportaciones(),
        listCobranzaNotificaciones(),
      ])
      const accionables = saldos.filter((saldo: any) => Number(saldo.saldo ?? 0) > 0 && !['pagado', 'ignorado'].includes(saldo.estado))
      return {
        totalSaldo: accionables.reduce((total: number, saldo: any) => total + Number(saldo.saldo ?? 0), 0),
        pendientes: saldos.filter((saldo: any) => saldo.estado === 'pendiente').length,
        sinWhatsapp: saldos.filter((saldo: any) => saldo.estado === 'error_contacto' || !saldo.telefonoWa).length,
        notificados: saldos.filter((saldo: any) => saldo.estado === 'notificado').length,
        importaciones: importaciones.length,
        envios: notificaciones.filter((item: any) => item.status === 'queued').length,
      }
    }),

    listarLocatarios: protectedProcedure.query(({ ctx }) => {
      assertCollectionsAccess(ctx.user)
      return listLocatariosCobranza()
    }),

    guardarLocatario: protectedProcedure
      .input(z.object({
        id: z.number().optional(),
        nombre: z.string().min(1),
        local: z.string().min(1),
        telefonoWa: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        cuit: z.string().optional().nullable(),
        notas: z.string().optional().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        assertCollectionsAccess(ctx.user)
        const id = await upsertLocatarioCobranza(input)
        return { success: true, id }
      }),

    guardarImportacion: protectedProcedure
      .input(z.object({
        filename: z.string().min(1).max(220),
        sourceType: z.enum(['pdf', 'xlsx', 'csv', 'manual']),
        periodLabel: z.string().min(1).max(80),
        fechaCorte: z.string().optional().nullable(),
        totalRows: z.number().int().min(0),
        rows: z.array(cobranzaImportRowSchema).min(1).max(500),
      }))
      .mutation(async ({ input, ctx }) => {
        assertCollectionsAccess(ctx.user)
        const result = await saveCobranzaImportacion({
          ...input,
          importedBy: { id: ctx.user.id, name: ctx.user.name },
        })
        return { success: true, ...result }
      }),

    listarImportaciones: protectedProcedure.query(({ ctx }) => {
      assertCollectionsAccess(ctx.user)
      return listCobranzaImportaciones()
    }),

    listarSaldos: protectedProcedure
      .input(z.object({
        estado: cobranzaSaldoEstadoEnum.optional(),
        importacionId: z.number().optional(),
        busqueda: z.string().optional(),
      }).optional())
      .query(({ input, ctx }) => {
        assertCollectionsAccess(ctx.user)
        return listCobranzaSaldos(input)
      }),

    actualizarContactoSaldo: protectedProcedure
      .input(z.object({
        id: z.number(),
        telefonoWa: z.string().optional().nullable(),
        locatarioId: z.number().optional().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        assertCollectionsAccess(ctx.user)
        await updateCobranzaSaldoContacto(input.id, input.telefonoWa, input.locatarioId)
        return { success: true }
      }),

    marcarEstado: protectedProcedure
      .input(z.object({
        id: z.number(),
        estado: cobranzaSaldoEstadoEnum,
      }))
      .mutation(async ({ input, ctx }) => {
        assertCollectionsAccess(ctx.user)
        await updateCobranzaSaldoEstado(input.id, input.estado)
        return { success: true }
      }),

    prepararMensajes: protectedProcedure
      .input(z.object({ saldoIds: z.array(z.number()).min(1).max(100) }))
      .query(async ({ input, ctx }) => {
        assertCollectionsAccess(ctx.user)
        const saldos = await Promise.all(input.saldoIds.map((id) => getCobranzaSaldoById(id)))
        return saldos
          .filter(Boolean)
          .map((saldo: any) => ({
            saldoId: saldo.id,
            locatarioNombre: saldo.locatarioNombre,
            local: saldo.local,
            saldo: saldo.saldo,
            telefonoWa: saldo.telefonoWa,
            puedeEnviar: Boolean(saldo.telefonoWa) && Number(saldo.saldo ?? 0) > 0,
            message: buildCobranzaMessage(saldo),
          }))
      }),

    encolarNotificaciones: protectedProcedure
      .input(z.object({
        mensajes: z.array(z.object({
          saldoId: z.number(),
          waNumber: z.string().optional().nullable(),
          message: z.string().min(10).max(1200),
        })).min(1).max(100),
        reenviar: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        assertCollectionsAccess(ctx.user)
        const saldoIds = input.mensajes.map((item) => item.saldoId)
        const existing = await getCobranzaNotificationsBySaldoIds(saldoIds)
        const alreadyQueued = new Set(existing.filter((item: any) => item.status === 'queued').map((item: any) => item.saldoId))

        let queued = 0
        let skipped = 0
        for (const item of input.mensajes) {
          const saldo = await getCobranzaSaldoById(item.saldoId)
          if (!saldo) {
            skipped += 1
            continue
          }

          const waNumber = item.waNumber || saldo.telefonoWa
          if (!waNumber || (!input.reenviar && alreadyQueued.has(item.saldoId))) {
            await createCobranzaNotification({
              saldo,
              waNumber,
              message: item.message,
              status: 'skipped',
              sentBy: { id: ctx.user.id, name: ctx.user.name },
            })
            skipped += 1
            continue
          }

          const botQueueId = await enqueueBotMessage(waNumber, item.message)
          if (!botQueueId) {
            await createCobranzaNotification({
              saldo,
              waNumber,
              message: item.message,
              status: 'skipped',
              sentBy: { id: ctx.user.id, name: ctx.user.name },
            })
            await updateCobranzaSaldoEstado(saldo.id, 'error_contacto')
            skipped += 1
            continue
          }

          await createCobranzaNotification({
            saldo,
            waNumber,
            message: item.message,
            status: 'queued',
            botQueueId,
            sentBy: { id: ctx.user.id, name: ctx.user.name },
          })
          await updateCobranzaSaldoEstado(saldo.id, 'notificado')
          queued += 1
        }

        return { success: true, queued, skipped }
      }),

    historialEnvios: protectedProcedure.query(({ ctx }) => {
      assertCollectionsAccess(ctx.user)
      return listCobranzaNotificaciones()
    }),

    borrarLista: protectedProcedure.mutation(async ({ ctx }) => {
      assertCollectionsAccess(ctx.user)
      const result = await clearCobranzaLista()
      return { success: true, ...result }
    }),
  }),

  usuarios: router({
    listar: protectedProcedure.query(({ ctx }) => {
      assertAdmin(ctx.user)
      return getUsers()
    }),
    listarComerciales: protectedProcedure.query(() => getSalesUsers()),
    crear: protectedProcedure
      .input(z.object({
        username: z.string().min(3),
        password: z.string().min(6),
        name: z.string().min(1),
        role: z.enum(['admin', 'sales', 'collections']),
        waId: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        const existing = await getUserByUsername(input.username)
        if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Ese usuario ya existe' })
        await createPanelUser(input)
        return { success: true }
      }),
    cambiarClave: protectedProcedure
      .input(z.object({
        id: z.number(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        const user = await getUserById(input.id)
        if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuario no encontrado' })
        await updateUserPassword(input.id, input.password)
        return { success: true }
      }),
    actualizarWhatsapp: protectedProcedure
      .input(z.object({
        id: z.number(),
        waId: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        const user = await getUserById(input.id)
        if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuario no encontrado' })
        await updateUserWhatsapp(input.id, input.waId)
        return { success: true }
      }),
    desactivar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        if (ctx.user.id === input.id) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'No podés desactivar tu propio usuario' })
        }
        await deactivateUser(input.id)
        return { success: true }
      }),
  }),

  empleados: router({
    listar: protectedProcedure.query(() => getEmpleados()),
    crear: protectedProcedure
      .input(z.object({
        nombre: z.string().min(1),
        email: z.string().email().optional().or(z.literal('')),
        telefono: z.string().optional(),
        especialidad: z.string().optional(),
        waId: z.string().optional(),
        pagoDiario: payrollAmountSchema,
        pagoSemanal: payrollAmountSchema,
        pagoQuincenal: payrollAmountSchema,
        pagoMensual: payrollAmountSchema,
        puedeVender: z.boolean().optional(),
        puedeGastronomia: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        await crearEmpleado(input as any)
        return { success: true }
      }),
    actualizar: protectedProcedure
      .input(z.object({
        id: z.number(),
        nombre: z.string().min(1),
        email: z.string().email().optional().or(z.literal('')),
        telefono: z.string().optional(),
        especialidad: z.string().optional(),
        waId: z.string().optional(),
        pagoDiario: payrollAmountSchema,
        pagoSemanal: payrollAmountSchema,
        pagoQuincenal: payrollAmountSchema,
        pagoMensual: payrollAmountSchema,
        puedeVender: z.boolean().optional(),
        puedeGastronomia: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        const { id, ...data } = input
        await actualizarEmpleado(id, data as any)
        return { success: true }
      }),
    desactivar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        await actualizarEmpleado(input.id, { activo: false })
        return { success: true }
      }),
  }),

  asistencia: router({
    resumen: protectedProcedure
      .input(z.object({
        periodo: attendancePeriodEnum,
        empleadoId: z.number().optional(),
        referenceDateMs: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        return buildAttendanceSummary(input)
      }),
    estadoEmpleado: protectedProcedure
      .input(z.object({ empleadoId: z.number() }))
      .query(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        const empleado = await getEmpleadoActivoById(input.empleadoId)
        if (!empleado) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empleado no encontrado' })
        return getEmpleadoAttendanceStatus(input.empleadoId)
      }),
    eventosEmpleado: protectedProcedure
      .input(z.object({ empleadoId: z.number() }))
      .query(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        const empleado = await getEmpleadoActivoById(input.empleadoId)
        if (!empleado) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empleado no encontrado' })
        return getEmpleadoAttendanceEvents(input.empleadoId)
      }),
    auditoriaEmpleado: protectedProcedure
      .input(z.object({ empleadoId: z.number() }))
      .query(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        const empleado = await getEmpleadoActivoById(input.empleadoId)
        if (!empleado) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empleado no encontrado' })
        return getAttendanceAuditTrailForEmpleado(input.empleadoId)
      }),
    registrar: protectedProcedure
      .input(z.object({
        empleadoId: z.number(),
        accion: attendanceActionEnum,
        nota: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        const empleado = await getEmpleadoActivoById(input.empleadoId)
        if (!empleado) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empleado no encontrado' })

        const result = await registerEmpleadoAttendance(input.empleadoId, input.accion, 'panel', input.nota)
        if (!result.success) {
          const messageByCode = {
            already_on_shift: 'El empleado ya tiene una jornada abierta.',
            not_on_shift: 'El empleado no tiene una entrada abierta.',
            already_on_lunch: 'El empleado ya está en almuerzo.',
            not_on_lunch: 'El empleado no tiene un almuerzo abierto.',
            on_lunch: 'Primero cerrá el almuerzo para registrar la salida.',
          } as const
          if (result.code === 'ok') {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Estado de asistencia inconsistente.',
            })
          }
          throw new TRPCError({
            code: 'CONFLICT',
            message: messageByCode[result.code],
          })
        }

        return { success: true, status: result.status }
      }),
    crearManual: protectedProcedure
      .input(z.object({
        empleadoId: z.number(),
        tipo: attendanceActionEnum,
        fechaHora: z.coerce.date(),
        nota: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        const empleado = await getEmpleadoActivoById(input.empleadoId)
        if (!empleado) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empleado no encontrado' })

        return createManualAttendanceEvent(input)
      }),
    corregirManual: protectedProcedure
      .input(z.object({
        attendanceEventId: z.number(),
        tipo: attendanceActionEnum,
        fechaHora: z.coerce.date(),
        nota: z.string().optional(),
        motivo: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        return correctManualAttendanceEvent({
          ...input,
          admin: {
            id: ctx.user.id,
            name: ctx.user.name,
          },
        })
      }),
    cerrarLiquidacion: protectedProcedure
      .input(z.object({
        periodo: attendancePeriodEnum,
        empleadoId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        return replaceLiquidacionClosure({
          ...input,
          admin: {
            id: ctx.user.id,
            name: ctx.user.name,
          },
        })
      }),
    marcarPagado: protectedProcedure
      .input(z.object({
        periodo: attendancePeriodEnum,
        empleadoId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        assertAdmin(ctx.user)
        return markLiquidacionAsPaid({
          ...input,
          admin: {
            id: ctx.user.id,
            name: ctx.user.name,
          },
        })
      }),
  }),

  gastronomia: gastronomiaRouter,

  configuracion: router({
    listarNotificaciones: protectedProcedure.query(() => getNotificaciones()),
    agregarNotificacion: protectedProcedure
      .input(z.object({
        tipo: z.enum(['email', 'telegram']),
        nombre: z.string().min(1),
        destino: z.string().min(1),
        recibeNuevos: z.boolean().default(true),
        recibeUrgentes: z.boolean().default(true),
        recibeCompletados: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => { assertAdmin(ctx.user); await crearNotificacion(input as any); return { success: true } }),
    toggleNotificacion: protectedProcedure
      .input(z.object({ id: z.number(), activo: z.boolean() }))
      .mutation(async ({ input, ctx }) => { assertAdmin(ctx.user); await actualizarNotificacion(input.id, { activo: input.activo }); return { success: true } }),
    eliminarNotificacion: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => { assertAdmin(ctx.user); await eliminarNotificacion(input.id); return { success: true } }),
    limpiarDatosDemo: protectedProcedure
      .mutation(async ({ ctx }) => {
        assertAdmin(ctx.user)
        const result = await limpiarDatosDemo()
        return { success: true, ...result }
      }),
    reiniciarMetricas: protectedProcedure
      .mutation(async ({ ctx }) => {
        assertAdmin(ctx.user)
        const result = await reiniciarMetricasOperacion()
        return { success: true, ...result }
      }),
    getBotComercialConfig: protectedProcedure
      .query(async ({ ctx }) => {
        assertAdmin(ctx.user)
        const cfg = await getAllBotConfig()
        const leads = await getLeads()
        const stats = { hot: 0, warm: 0, cold: 0, not_fit: 0, sin_score: 0 }
        for (const l of leads) {
          if (l.estado === 'descartado') continue
          if (!l.temperature) stats.sin_score++
          else stats[l.temperature as keyof typeof stats] = (stats[l.temperature as keyof typeof stats] ?? 0) + 1
        }
        return {
          activo: cfg['bot_autoresponder_activo'] !== '0',
          followup1Mensaje: cfg['followup1_mensaje'] ?? '',
          followup2Mensaje: cfg['followup2_mensaje'] ?? '',
          followup1DelayMin: Number(cfg['followup1_delay_min'] ?? 30),
          followup2DelayHoras: Number(cfg['followup2_delay_horas'] ?? 4),
          stats,
        }
      }),
    setBotComercialConfig: protectedProcedure
      .input(z.object({
        activo: z.boolean().optional(),
        followup1Mensaje: z.string().min(10).optional(),
        followup2Mensaje: z.string().min(10).optional(),
        followup1DelayMin: z.number().int().min(5).max(1440).optional(),
        followup2DelayHoras: z.number().int().min(1).max(72).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        assertAdmin(ctx.user)
        if (input.activo !== undefined) await setAppConfig('bot_autoresponder_activo', input.activo ? '1' : '0')
        if (input.followup1Mensaje !== undefined) await setAppConfig('followup1_mensaje', input.followup1Mensaje)
        if (input.followup2Mensaje !== undefined) await setAppConfig('followup2_mensaje', input.followup2Mensaje)
        if (input.followup1DelayMin !== undefined) await setAppConfig('followup1_delay_min', String(input.followup1DelayMin))
        if (input.followup2DelayHoras !== undefined) await setAppConfig('followup2_delay_horas', String(input.followup2DelayHoras))
        return { success: true }
      }),
  }),
})

export type AppRouter = typeof appRouter

async function notifyOperationalTaskAssignment(taskId: number, employee: { nombre: string; waId?: string | null }) {
  if (!employee.waId) return

  const task = await getOperationalTaskById(taskId)
  if (!task) return

  const lines = [
    '*Nueva tarea operativa — Docks del Puerto*',
    '',
    `Asignado a: ${employee.nombre}`,
    `Tarea #${task.id}`,
    task.titulo ? `Trabajo: ${task.titulo}` : '',
    task.tipoTrabajo ? `Tipo: ${task.tipoTrabajo}` : '',
    task.ubicacion ? `Ubicación: ${task.ubicacion}` : '',
    task.prioridad ? `Prioridad: ${String(task.prioridad).toUpperCase()}` : '',
    '',
    task.descripcion ?? '',
    '',
    'Respondé con una opción:',
    '1. Aceptar tarea',
    '2. No puedo realizarla',
    '3. Ver cola del día',
    '',
    'Cuando la aceptes, el reloj de trabajo queda en marcha y después vas a poder pausar o finalizar desde el bot.',
  ]

  await enqueueBotMessage(employee.waId, lines.filter(Boolean).join('\n'))
}

function formatMoneyArs(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

function buildCobranzaMessage(saldo: {
  locatarioNombre: string
  local?: string | null
  periodo: string
  saldo: number
  createdAt?: Date | number | string | null
}) {
  const fechaCorte = new Date().toLocaleDateString('es-AR')
  const referencia = [saldo.periodo, saldo.local ? `local ${saldo.local}` : ''].filter(Boolean).join(' / ')
  return [
    '🏢 *Docks del Puerto - Administración*',
    '📌 *Aviso de saldo pendiente*',
    '',
    `Hola ${saldo.locatarioNombre}, te contactamos desde el área de Administración de Docks del Puerto.`,
    '',
    `💳 Según nuestro registro al ${fechaCorte}, figura un saldo pendiente de *${formatMoneyArs(Number(saldo.saldo ?? 0))}*${referencia ? ` correspondiente a ${referencia}` : ''}.`,
    '',
    '📲 ¿Nos confirmás por este medio la fecha estimada de regularización?',
    '',
    'Muchas gracias.',
  ].join('\n')
}

function assertCollectionsAccess(user: { role: string }) {
  if (user.role !== 'admin' && user.role !== 'collections') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'No tenés acceso al módulo de cobranzas.' })
  }
}

async function notifyOperationalTaskBatchAssignment({
  employee,
  tasks,
  sourceName,
}: {
  employee: { nombre: string; waId?: string | null }
  tasks: Array<{ id: number; titulo: string; ubicacion: string; prioridad: string }>
  sourceName?: string
}) {
  if (!employee.waId || tasks.length === 0) return false

  const visibleTasks = tasks.slice(0, 10)
  const lines = [
    '*Lista de tareas diarias — Docks del Puerto*',
    '',
    `${employee.nombre}, tenés ${tasks.length} tarea${tasks.length === 1 ? '' : 's'} nueva${tasks.length === 1 ? '' : 's'} asignada${tasks.length === 1 ? '' : 's'}.`,
    sourceName ? `Origen: ${sourceName}` : '',
    '',
    ...visibleTasks.flatMap((task, index) => [
      `${index + 1}. #${task.id} — ${task.titulo}`,
      `   ${task.ubicacion} · Prioridad ${task.prioridad.toUpperCase()}`,
    ]),
    tasks.length > visibleTasks.length ? `...y ${tasks.length - visibleTasks.length} más.` : '',
    '',
    'Abrí *Mis tareas* en el bot para aceptar cada trabajo y seguir el flujo normal.',
  ]

  await enqueueBotMessage(employee.waId, lines.filter(Boolean).join('\n'))
  return true
}

function buildLeadAssignmentMessage({
  lead,
  assignedUserName,
}: {
  lead: any
  assignedUserName: string
}) {
  const receivedAt = lead.createdAt
    ? new Date(lead.createdAt).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    : null
  const lines = [
    '*Nuevo lead asignado — Docks del Puerto*',
    '',
    `Asignado a: ${assignedUserName}`,
    `Lead #${lead.id}`,
    `Nombre: ${lead.nombre}`,
    lead.telefono ? `Teléfono: ${lead.telefono}` : '',
    lead.email ? `Email: ${lead.email}` : '',
    lead.waId ? `WhatsApp del interesado: ${lead.waId}` : '',
    lead.rubro ? `Rubro: ${lead.rubro}` : '',
    lead.tipoLocal ? `Tipo de local: ${lead.tipoLocal}` : '',
    `Estado: ${lead.estado ?? 'nuevo'}`,
    `Origen: ${lead.fuente ?? 'web'}`,
    receivedAt ? `Recibido: ${receivedAt}` : '',
    lead.turnoFecha ? `Turno: ${lead.turnoFecha}${lead.turnoHora ? ` ${lead.turnoHora}` : ''}` : '',
    lead.notas ? `Notas internas: ${lead.notas}` : '',
    lead.mensaje ? `Consulta: ${lead.mensaje}` : '',
    '',
    'Abrí el panel y seguí el lead desde la sección Leads.',
  ]

  return lines.filter(Boolean).join('\n')
}

async function buildBotLeadReply(lead: any) {
  const fallback = 'Hola {{nombre}}, gracias por consultar por Docks del Puerto. Te respondemos por acá para ayudarte con la información de los locales comerciales.'
  const template = (await getAppConfig('followup1_mensaje')) ?? fallback
  const nombre = lead.nombre && lead.nombre !== 'Sin nombre' ? lead.nombre : 'ahí'
  return template.replace(/\{\{nombre\}\}/g, nombre)
}
