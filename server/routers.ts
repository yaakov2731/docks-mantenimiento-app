import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { and, eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { router, publicProcedure, protectedProcedure, JWT_COOKIE } from './_core/trpc'
import { notifyOwner, notifyCompleted } from './_core/notification'
import { readEnv } from './_core/env'
import * as database from './db'
import * as schema from '../drizzle/schema'
import { createRoundsService } from './rounds/service'
import { saveRoundScheduleAndSyncToday } from './rounds/schedule'
import { assignReporteToEmployee } from './reporte-assignment'
import {
  getUserByUsername,
  getUsers, getSalesUsers, getUserById, createPanelUser, updateUserPassword, deactivateUser, updateUserWhatsapp,
  crearReporte, getReportes, getReporteById, actualizarReporte, eliminarReporte, getEstadisticas,
  crearActualizacion, getActualizacionesByReporte,
  getEmpleados, crearEmpleado, actualizarEmpleado, getEmpleadoById, getEmpleadoActivoById,
  buildAttendanceTurns,
  ATTENDANCE_ACTIONS, getEmpleadoAttendanceStatus, getEmpleadoAttendanceEvents, registerEmpleadoAttendance,
  createManualAttendanceEvent, correctManualAttendanceEvent, getAttendanceAuditTrailForEmpleado,
  getNotificaciones, crearNotificacion, actualizarNotificacion, eliminarNotificacion,
  crearLead, getLeads, getLeadById, actualizarLead,
  createRoundTemplate, saveRoundSchedule, getRoundOverviewForDashboard, getRoundTimeline,
  createOperationalTask, createOperationalTaskFromReporte, getOperationalTaskById, listOperationalTasks, listOperationalTasksByEmployee, getOperationalTasksOverview,
  deleteOperationalTasks,
  enqueueBotMessage,
  iniciarTrabajoReporte,
  pausarTrabajoReporte,
  completarTrabajoReporte,
  limpiarDatosDemo,
  reiniciarMetricasOperacion,
} from './db'

const roundsService = createRoundsService(database as any)
const attendanceActionEnum = z.enum(ATTENDANCE_ACTIONS)
const attendancePeriodEnum = z.enum(['dia', 'semana', 'quincena', 'mes'])
const payrollAmountSchema = z.number().int().min(0).default(0)
const BA_OFFSET_MS = 3 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

function assertAdmin(user: { role: string }) {
  if (user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo un admin puede gestionar asistencia manual.' })
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

  let shiftStartedAt: number | null = null
  let lunchStartedAt: number | null = null

  for (const event of sortedEvents) {
    const eventMs = toAttendanceMs(event.timestamp ?? event.createdAt)
    const bucket = buckets.get(formatBaDateKey(eventMs))
    if (bucket && eventMs >= period.startMs && eventMs < period.endMs) {
      if (event.tipo === 'entrada') bucket.entradas += 1
      if (event.tipo === 'inicio_almuerzo') bucket.iniciosAlmuerzo += 1
      if (event.tipo === 'fin_almuerzo') bucket.finesAlmuerzo += 1
      if (event.tipo === 'salida') bucket.salidas += 1
    }

    if (event.tipo === 'entrada') {
      shiftStartedAt = eventMs
      lunchStartedAt = null
      continue
    }
    if (event.tipo === 'inicio_almuerzo' && shiftStartedAt !== null && lunchStartedAt === null) {
      lunchStartedAt = eventMs
      continue
    }
    if (event.tipo === 'fin_almuerzo' && shiftStartedAt !== null && lunchStartedAt !== null) {
      addSecondsToBuckets(buckets, period.startMs, period.endMs, lunchStartedAt, eventMs, 'lunchSeconds')
      lunchStartedAt = null
      continue
    }
    if (event.tipo === 'salida' && shiftStartedAt !== null) {
      addSecondsToBuckets(buckets, period.startMs, period.endMs, shiftStartedAt, eventMs, 'grossSeconds')
      if (lunchStartedAt !== null) {
        addSecondsToBuckets(buckets, period.startMs, period.endMs, lunchStartedAt, eventMs, 'lunchSeconds')
      }
      shiftStartedAt = null
      lunchStartedAt = null
    }
  }

  if (shiftStartedAt !== null) {
    const currentEnd = Math.min(Date.now(), period.endMs)
    addSecondsToBuckets(buckets, period.startMs, period.endMs, shiftStartedAt, currentEnd, 'grossSeconds')
    if (lunchStartedAt !== null) {
      addSecondsToBuckets(buckets, period.startMs, period.endMs, lunchStartedAt, currentEnd, 'lunchSeconds')
    }
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
  const tarifaMonto = Math.max(0, getExactRateForPeriod(params.empleado, params.periodo))
  const hasWorkedPeriod = params.diasTrabajados > 0 || params.segundosTrabajados > 0

  return {
    diasTrabajados: params.diasTrabajados,
    segundosTrabajados: params.segundosTrabajados,
    promedioSegundosPorDia: params.diasTrabajados > 0 ? Math.floor(params.segundosTrabajados / params.diasTrabajados) : 0,
    tarifaPeriodo: params.periodo,
    tarifaMonto,
    totalPagar: hasWorkedPeriod ? tarifaMonto : 0,
    tarifaOrigen: tarifaMonto > 0 ? 'configurado' : 'sin_configurar',
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
}) {
  const period = getAttendancePeriodRange(params.periodo)
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
          readEnv('SESSION_SECRET') ?? 'dev-secret-change-me',
          { expiresIn: '7d' }
        )
        ctx.res.cookie(JWT_COOKIE, token, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
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
        locatario: z.string().min(1),
        local: z.string().min(1),
        planta: z.enum(['baja', 'alta']),
        contacto: z.string().optional(),
        emailLocatario: z.string().optional(),
        categoria: z.enum(['electrico', 'plomeria', 'estructura', 'limpieza', 'seguridad', 'climatizacion', 'otro']),
        prioridad: z.enum(['baja', 'media', 'alta', 'urgente']),
        titulo: z.string().min(1).max(500),
        descripcion: z.string().min(10),
        fotos: z.string().optional(),
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
        nombre: z.string().min(1),
        telefono: z.string().optional(),
        email: z.string().optional(),
        waId: z.string().optional(),
        rubro: z.string().optional(),
        tipoLocal: z.string().optional(),
        mensaje: z.string().optional(),
        turnoFecha: z.string().optional(),
        turnoHora: z.string().optional(),
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
  }),

  tareasOperativas: router({
    crear: protectedProcedure
      .input(z.object({
        tipoTrabajo: z.string().min(2),
        titulo: z.string().min(3),
        descripcion: z.string().min(3),
        ubicacion: z.string().min(2),
        prioridad: z.enum(['baja', 'media', 'alta', 'urgente']),
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

  usuarios: router({
    listar: protectedProcedure.query(() => getUsers()),
    listarComerciales: protectedProcedure.query(() => getSalesUsers()),
    crear: protectedProcedure
      .input(z.object({
        username: z.string().min(3),
        password: z.string().min(6),
        name: z.string().min(1),
        role: z.enum(['admin', 'sales']),
        waId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
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
      .mutation(async ({ input }) => {
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
      .mutation(async ({ input }) => {
        const user = await getUserById(input.id)
        if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuario no encontrado' })
        await updateUserWhatsapp(input.id, input.waId)
        return { success: true }
      }),
    desactivar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
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
      }))
      .mutation(async ({ input }) => {
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
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input
        await actualizarEmpleado(id, data as any)
        return { success: true }
      }),
    desactivar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await actualizarEmpleado(input.id, { activo: false })
        return { success: true }
      }),
  }),

  asistencia: router({
    resumen: protectedProcedure
      .input(z.object({
        periodo: attendancePeriodEnum,
        empleadoId: z.number().optional(),
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
      .mutation(async ({ input }) => { await crearNotificacion(input as any); return { success: true } }),
    toggleNotificacion: protectedProcedure
      .input(z.object({ id: z.number(), activo: z.boolean() }))
      .mutation(async ({ input }) => { await actualizarNotificacion(input.id, { activo: input.activo }); return { success: true } }),
    eliminarNotificacion: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await eliminarNotificacion(input.id); return { success: true } }),
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

function buildLeadAssignmentMessage({
  lead,
  assignedUserName,
}: {
  lead: any
  assignedUserName: string
}) {
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
    lead.turnoFecha ? `Turno: ${lead.turnoFecha}${lead.turnoHora ? ` ${lead.turnoHora}` : ''}` : '',
    lead.notas ? `Notas internas: ${lead.notas}` : '',
    lead.mensaje ? `Consulta: ${lead.mensaje}` : '',
    '',
    'Abrí el panel y seguí el lead desde la sección Leads.',
  ]

  return lines.filter(Boolean).join('\n')
}
