/**
 * REST API para el bot de WhatsApp.
 * Autenticación: header X-Bot-Api-Key
 */
import { Router } from 'express'
import * as roundDb from './db'
import {
  ATTENDANCE_ACTIONS,
  crearReporte,
  crearLead,
  getEmpleadoByWaId,
  getEmpleadoById,
  getJornadaActivaEmpleado,
  registrarEntradaEmpleado,
  registrarSalidaEmpleado,
  getTareasEmpleado,
  crearActualizacion,
  getPendingBotMessages,
  markBotMessageSent,
  markBotMessageFailed,
  getEmpleadoActivoById,
  getEmpleadoAttendanceStatus,
  getNextAssignableReporteForEmpleado,
  getReporteById,
  getReporteTiempoTrabajadoSegundos,
  registerEmpleadoAttendance,
  iniciarTrabajoReporte,
  pausarTrabajoReporte,
  completarTrabajoReporte,
  actualizarReporte,
  listOperationalTasksByEmployee,
  getOperationalTaskById,
  persistOperationalTaskChange,
  addOperationalTaskEvent,
} from './db'
import { notifyOwner } from './_core/notification'
import { readEnv } from './_core/env'
import { createRoundsService } from './rounds/service'
import { createOperationalTasksService } from './tasks/service'

const botRouter = Router()
const roundsService = createRoundsService(roundDb as any)
const tasksService = createOperationalTasksService(roundDb as any)

const RESPUESTAS_EMPLEADO = ['recibida', 'no_puede', 'ocupado', 'franco'] as const
type RespuestaEmpleado = typeof RESPUESTAS_EMPLEADO[number]
const PRIORIDADES = ['baja', 'media', 'alta', 'urgente'] as const
const CATEGORIAS = ['electrico', 'plomeria', 'estructura', 'limpieza', 'seguridad', 'climatizacion', 'otro'] as const
const PLANTAS = ['baja', 'alta'] as const

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return `${safe}s`
}

function formatDateTime(value?: Date | string | number | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function buildTaskPayload(reporte: any, tiempoTrabajadoSegundos?: number) {
  if (isOperationalTaskRecord(reporte)) {
    return buildOperationalTaskPayload(reporte, tiempoTrabajadoSegundos)
  }

  const total = tiempoTrabajadoSegundos ?? getReporteTiempoTrabajadoSegundos(reporte)
  return {
    id: reporte.id,
    origen: 'reclamo',
    titulo: reporte.titulo,
    local: reporte.local,
    planta: reporte.planta,
    prioridad: reporte.prioridad,
    estado: reporte.estado,
    asignacionEstado: reporte.asignacionEstado,
    descripcion: reporte.descripcion,
    tiempoTrabajadoSegundos: total,
    tiempoTrabajado: formatDuration(total),
  }
}

function isOperationalTaskRecord(task: any) {
  return Boolean(
    task &&
    (
      typeof task?.ubicacion === 'string' ||
      typeof task?.tipoTrabajo === 'string' ||
      ['pendiente_asignacion', 'pendiente_confirmacion', 'pausada', 'terminada', 'rechazada'].includes(task?.estado)
    )
  )
}

function normalizeOperationalTaskState(estado?: string) {
  switch (estado) {
    case 'pendiente_asignacion':
    case 'pendiente_confirmacion':
      return 'pendiente'
    case 'pausada':
      return 'pausado'
    case 'terminada':
      return 'completado'
    case 'rechazada':
    case 'cancelada':
      return 'cancelado'
    default:
      return estado ?? 'pendiente'
  }
}

function deriveOperationalAssignmentState(task: any) {
  if (task?.estado === 'pendiente_confirmacion') return 'pendiente_confirmacion'
  if (task?.estado === 'rechazada') return 'rechazada'
  if (task?.estado === 'cancelada') return 'cancelada'
  if (task?.estado === 'pendiente_asignacion') return 'pendiente'
  return 'aceptada'
}

function buildOperationalTaskPayload(task: any, tiempoTrabajadoSegundos?: number) {
  const total = Number(tiempoTrabajadoSegundos ?? task?.tiempoTrabajadoSegundos ?? task?.trabajoAcumuladoSegundos ?? 0)
  const nextReview = formatDateTime(task?.proximaRevisionAt)
  return {
    id: task.id,
    origen: 'operacion',
    titulo: task.titulo,
    local: task.ubicacion ?? task.local ?? 'Tarea operativa',
    planta: task.planta ?? '',
    prioridad: task.prioridad,
    estado: normalizeOperationalTaskState(task.estado),
    asignacionEstado: deriveOperationalAssignmentState(task),
    descripcion: task.descripcion,
    orden: Number(task?.ordenAsignacion ?? task?.orden ?? 0),
    checklistObjetivo: task?.checklistObjetivo ?? null,
    recurrenteCadaHoras: task?.recurrenteCadaHoras ?? null,
    proximaRevisionAt: nextReview,
    ultimaRevisionAt: formatDateTime(task?.ultimaRevisionAt),
    dueNow: nextReview ? new Date(nextReview).getTime() <= Date.now() : true,
    tiempoTrabajadoSegundos: total,
    tiempoTrabajado: formatDuration(total),
  }
}

function buildAttendancePayload(status: any) {
  return {
    onShift: !!status?.onShift,
    onLunch: !!status?.onLunch,
    lastAction: status?.lastAction ?? null,
    lastActionAt: status?.lastActionAt ?? null,
    lastChannel: status?.lastChannel ?? null,
    lastEntryAt: status?.lastEntryAt ?? null,
    lastExitAt: status?.lastExitAt ?? null,
    lunchStartedAt: status?.lunchStartedAt ?? null,
    lastLunchStartAt: status?.lastLunchStartAt ?? null,
    lastLunchEndAt: status?.lastLunchEndAt ?? null,
    workedSecondsToday: status?.workedSecondsToday ?? 0,
    workedTimeToday: formatDuration(status?.workedSecondsToday ?? 0),
    grossWorkedSecondsToday: status?.grossWorkedSecondsToday ?? 0,
    grossWorkedTimeToday: formatDuration(status?.grossWorkedSecondsToday ?? 0),
    todayLunchSeconds: status?.todayLunchSeconds ?? 0,
    todayLunchTime: formatDuration(status?.todayLunchSeconds ?? 0),
    currentShiftSeconds: status?.currentShiftSeconds ?? 0,
    currentShiftTime: formatDuration(status?.currentShiftSeconds ?? 0),
    currentLunchSeconds: status?.currentLunchSeconds ?? 0,
    currentLunchTime: formatDuration(status?.currentLunchSeconds ?? 0),
    todayEntries: status?.todayEntries ?? 0,
    todayLunchStarts: status?.todayLunchStarts ?? 0,
    todayLunchEnds: status?.todayLunchEnds ?? 0,
    todayExits: status?.todayExits ?? 0,
  }
}

function authBot(req: any, res: any, next: any) {
  const key = req.headers['x-bot-api-key']
  if (!key || key !== readEnv('BOT_API_KEY')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

function parseId(value: string) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

function normalizeText(value?: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeOptionalText(value?: unknown) {
  const normalized = normalizeText(value)
  return normalized.length > 0 ? normalized : undefined
}

function isValidPrioridad(value: string): value is typeof PRIORIDADES[number] {
  return (PRIORIDADES as readonly string[]).includes(value)
}

function isValidCategoria(value: string): value is typeof CATEGORIAS[number] {
  return (CATEGORIAS as readonly string[]).includes(value)
}

function isValidPlanta(value: string): value is typeof PLANTAS[number] {
  return (PLANTAS as readonly string[]).includes(value)
}

function parseOptionalBodyId(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

function buildRechazoDescription(respuesta: Exclude<RespuestaEmpleado, 'recibida'>) {
  if (respuesta === 'franco') return 'Empleado indicó que está de franco. Tarea liberada para reasignación.'
  if (respuesta === 'ocupado') return 'Empleado indicó que está ocupado. Tarea liberada para reasignación.'
  return 'Empleado indicó que no puede tomar la tarea. Tarea liberada para reasignación.'
}

function mapOperationalTaskError(res: any, error: any) {
  const message = error?.message ?? 'No se pudo actualizar la tarea operativa'
  if (message.includes('already has active') || message.includes('already has an active')) {
    return res.status(409).json({ error: message })
  }
  if (message.includes('not found')) return res.status(404).json({ error: message })
  if (message.includes('does not belong') || message.includes('awaiting confirmation') || message.includes('cannot be finished')) {
    return res.status(400).json({ error: message })
  }
  return res.status(400).json({ error: message })
}

function botPriorityRank(prioridad?: string) {
  switch (prioridad) {
    case 'urgente': return 4
    case 'alta': return 3
    case 'media': return 2
    case 'baja': return 1
    default: return 0
  }
}

function botTaskRank(task: any) {
  if (task.asignacionEstado === 'pendiente_confirmacion') return 0
  switch (task.estado) {
    case 'en_progreso': return 1
    case 'pausado': return 2
    case 'pendiente': return 3
    default: return 4
  }
}

function sortBotTasks(left: any, right: any) {
  return (
    botTaskRank(left) - botTaskRank(right) ||
    botPriorityRank(right.prioridad) - botPriorityRank(left.prioridad) ||
    Number(left.orden ?? 0) - Number(right.orden ?? 0) ||
    Number(left.id ?? 0) - Number(right.id ?? 0)
  )
}

function buildEmpleadoCounters(tareas: any[]) {
  const activas = tareas.filter(task => !['completado', 'cancelado'].includes(task.estado))
  const reclamos = activas.filter(task => task.origen !== 'operacion')
  const operaciones = activas.filter(task => task.origen === 'operacion')
  return {
    pendientesConfirmacion: activas.filter(task => task.asignacionEstado === 'pendiente_confirmacion').length,
    enCurso: activas.filter(task => task.estado === 'en_progreso').length,
    pausadas: activas.filter(task => task.estado === 'pausado').length,
    pendientes: activas.filter(task => task.estado === 'pendiente').length,
    activas: activas.length,
    reclamosActivos: reclamos.length,
    operacionesActivas: operaciones.length,
    reclamosPendientesConfirmacion: reclamos.filter(task => task.asignacionEstado === 'pendiente_confirmacion').length,
    operacionesPendientesConfirmacion: operaciones.filter(task => task.asignacionEstado === 'pendiente_confirmacion').length,
  }
}

async function resolveOperationalTaskAssignment(taskId: number, empleadoId?: number | null) {
  const task = await getOperationalTaskById(taskId)
  if (!task) throw new Error('Operational task not found')
  const effectiveEmployeeId = Number.isFinite(Number(empleadoId)) && Number(empleadoId) > 0
    ? Number(empleadoId)
    : Number(task.empleadoId)
  if (!Number.isFinite(effectiveEmployeeId) || effectiveEmployeeId <= 0) {
    throw new Error('Operational task has no assigned employee')
  }
  return { task, empleadoId: effectiveEmployeeId }
}

async function startOperationalTaskCompatibility(params: {
  taskId: number
  empleadoId?: number | null
  empleadoNombre?: string
}) {
  const { task, empleadoId } = await resolveOperationalTaskAssignment(params.taskId, params.empleadoId)
  if (task.empleadoId !== empleadoId) {
    throw new Error('Operational task does not belong to employee')
  }

  if (task.estado === 'pendiente_confirmacion') {
    return tasksService.acceptTask({ taskId: params.taskId, empleadoId })
  }

  if (task.estado === 'pausada') {
    const now = new Date()
    await persistOperationalTaskChange(params.taskId, {
      estado: 'en_progreso',
      trabajoIniciadoAt: now,
      pausadoAt: null,
    } as any, [{
      tareaId: params.taskId,
      tipo: 'reanudar',
      actorTipo: 'employee',
      actorId: empleadoId,
      actorNombre: params.empleadoNombre ?? task.empleadoNombre ?? 'Empleado',
      descripcion: 'Trabajo reanudado vía WhatsApp',
      metadata: { source: 'whatsapp_start' },
      createdAt: now,
    }])
  }

  return getOperationalTaskById(params.taskId)
}

botRouter.post('/rondas/ocurrencia/:id/responder', authBot, async (req, res) => {
  try {
    const occurrenceId = Number(req.params.id)
    const { empleadoId, opcion, nota } = req.body

    if (!Number.isFinite(occurrenceId) || !Number.isFinite(Number(empleadoId))) {
      return res.status(400).json({ error: 'occurrenceId y empleadoId son requeridos' })
    }
    if (!['1', '2', '3'].includes(opcion)) {
      return res.status(400).json({ error: 'opcion inválida' })
    }

    const occurrence = await roundsService.registerWhatsappReply({
      occurrenceId,
      empleadoId: Number(empleadoId),
      option: opcion,
      note: typeof nota === 'string' ? nota : undefined,
    })

    return res.json({ success: true, occurrence })
  } catch (e: any) {
    const message = e?.message ?? 'No se pudo registrar la respuesta'
    if (message.includes('not found')) return res.status(404).json({ error: message })
    if (message.includes('does not belong') || message.includes('no longer pending') || message.includes('Unsupported')) {
      return res.status(400).json({ error: message })
    }
    return res.status(500).json({ error: message })
  }
})

botRouter.post('/rondas/ocurrencia/:id/iniciar', authBot, async (req, res) => {
  try {
    const occurrenceId = Number(req.params.id)
    const empleadoId = Number(req.body.empleadoId)
    if (!Number.isFinite(occurrenceId) || !Number.isFinite(empleadoId)) {
      return res.status(400).json({ error: 'occurrenceId y empleadoId son requeridos' })
    }

    const occurrence = await roundsService.startOccurrence({
      occurrenceId,
      empleadoId,
    })

    return res.json({ success: true, occurrence })
  } catch (error: any) {
    const message = error?.message ?? 'No se pudo iniciar la ronda'
    if (message.includes('not found')) return res.status(404).json({ error: message })
    if (message.includes('current employee') || message.includes('cannot be started') || message.includes('no current assignee')) {
      return res.status(409).json({ error: message })
    }
    return res.status(500).json({ error: message })
  }
})

botRouter.post('/rondas/ocurrencia/:id/pausar', authBot, async (req, res) => {
  try {
    const occurrenceId = Number(req.params.id)
    const empleadoId = Number(req.body.empleadoId)
    if (!Number.isFinite(occurrenceId) || !Number.isFinite(empleadoId)) {
      return res.status(400).json({ error: 'occurrenceId y empleadoId son requeridos' })
    }

    const occurrence = await roundsService.pauseOccurrence({
      occurrenceId,
      empleadoId,
    })

    return res.json({ success: true, occurrence })
  } catch (error: any) {
    const message = error?.message ?? 'No se pudo pausar la ronda'
    if (message.includes('not found')) return res.status(404).json({ error: message })
    if (message.includes('current employee') || message.includes('not in progress')) {
      return res.status(409).json({ error: message })
    }
    return res.status(500).json({ error: message })
  }
})

botRouter.post('/rondas/ocurrencia/:id/finalizar', authBot, async (req, res) => {
  try {
    const occurrenceId = Number(req.params.id)
    const empleadoId = Number(req.body.empleadoId)
    const nota = typeof req.body.nota === 'string' ? req.body.nota : undefined
    if (!Number.isFinite(occurrenceId) || !Number.isFinite(empleadoId)) {
      return res.status(400).json({ error: 'occurrenceId y empleadoId son requeridos' })
    }

    const occurrence = await roundsService.finishOccurrence({
      occurrenceId,
      empleadoId,
      note: nota,
    })

    return res.json({ success: true, occurrence })
  } catch (error: any) {
    const message = error?.message ?? 'No se pudo finalizar la ronda'
    if (message.includes('not found')) return res.status(404).json({ error: message })
    if (message.includes('current employee') || message.includes('cannot be finished')) {
      return res.status(409).json({ error: message })
    }
    return res.status(500).json({ error: message })
  }
})

botRouter.post('/tarea-operativa/:id/aceptar', authBot, async (req, res) => {
  try {
    const taskId = Number(req.params.id)
    const empleadoId = Number(req.body.empleadoId)
    if (!Number.isFinite(taskId) || !Number.isFinite(empleadoId)) {
      return res.status(400).json({ error: 'taskId y empleadoId son requeridos' })
    }

    const task = await tasksService.acceptTask({ taskId, empleadoId })
    return res.json({ success: true, task })
  } catch (error: any) {
    return mapOperationalTaskError(res, error)
  }
})

botRouter.post('/tarea-operativa/:id/pausar', authBot, async (req, res) => {
  try {
    const taskId = Number(req.params.id)
    const empleadoId = Number(req.body.empleadoId)
    if (!Number.isFinite(taskId) || !Number.isFinite(empleadoId)) {
      return res.status(400).json({ error: 'taskId y empleadoId son requeridos' })
    }

    const task = await tasksService.pauseTask({ taskId, empleadoId })
    return res.json({ success: true, task })
  } catch (error: any) {
    return mapOperationalTaskError(res, error)
  }
})

botRouter.post('/tarea-operativa/:id/terminar', authBot, async (req, res) => {
  try {
    const taskId = Number(req.params.id)
    const empleadoId = Number(req.body.empleadoId)
    const nota = typeof req.body.nota === 'string' ? req.body.nota : undefined
    if (!Number.isFinite(taskId) || !Number.isFinite(empleadoId)) {
      return res.status(400).json({ error: 'taskId y empleadoId son requeridos' })
    }

    const result = await tasksService.finishTask({ taskId, empleadoId, note: nota })
    return res.json({ success: true, task: result.task, nextTask: result.nextTask })
  } catch (error: any) {
    return mapOperationalTaskError(res, error)
  }
})

botRouter.post('/tarea-operativa/:id/rechazar', authBot, async (req, res) => {
  try {
    const taskId = Number(req.params.id)
    const empleadoId = Number(req.body.empleadoId)
    const nota = typeof req.body.nota === 'string' ? req.body.nota : undefined
    if (!Number.isFinite(taskId) || !Number.isFinite(empleadoId)) {
      return res.status(400).json({ error: 'taskId y empleadoId son requeridos' })
    }

    const task = await tasksService.rejectTask({ taskId, empleadoId, note: nota })
    return res.json({ success: true, task })
  } catch (error: any) {
    return mapOperationalTaskError(res, error)
  }
})

// Legacy compatibility for the currently deployed WhatsApp bot.
botRouter.post('/operacion/:id/respuesta', authBot, async (req, res) => {
  try {
    const taskId = parseId(req.params.id)
    if (!taskId) return res.status(400).json({ error: 'id de tarea inválido' })

    const respuesta = normalizeText(req.body?.respuesta).toLowerCase() as RespuestaEmpleado
    const empleadoNombre = normalizeOptionalText(req.body?.empleadoNombre)
    const { empleadoId } = await resolveOperationalTaskAssignment(taskId, req.body?.empleadoId)

    if (!respuesta || !RESPUESTAS_EMPLEADO.includes(respuesta)) {
      return res.status(400).json({ error: 'respuesta inválida' })
    }

    if (respuesta === 'recibida') {
      const task = await tasksService.acceptTask({ taskId, empleadoId })
      return res.json({ success: true, respuesta, task: buildTaskPayload(task) })
    }

    const note = normalizeOptionalText(req.body?.nota) ?? buildRechazoDescription(respuesta as Exclude<RespuestaEmpleado, 'recibida'>)
    const task = await tasksService.rejectTask({ taskId, empleadoId, note })
    return res.json({ success: true, respuesta, task: buildTaskPayload(task) })
  } catch (error: any) {
    return mapOperationalTaskError(res, error)
  }
})

botRouter.post('/operacion/:id/iniciar', authBot, async (req, res) => {
  try {
    const taskId = parseId(req.params.id)
    if (!taskId) return res.status(400).json({ error: 'id de tarea inválido' })

    const task = await startOperationalTaskCompatibility({
      taskId,
      empleadoId: parseOptionalBodyId(req.body?.empleadoId),
      empleadoNombre: normalizeOptionalText(req.body?.empleadoNombre),
    })
    if (!task) return res.status(404).json({ error: 'Operational task not found' })

    const payload = buildTaskPayload(task)
    return res.json({
      success: true,
      estado: payload.estado,
      tiempoTrabajadoSegundos: payload.tiempoTrabajadoSegundos,
      tiempoTrabajado: payload.tiempoTrabajado,
      task: payload,
    })
  } catch (error: any) {
    return mapOperationalTaskError(res, error)
  }
})

botRouter.post('/operacion/:id/progreso', authBot, async (req, res) => {
  try {
    const taskId = parseId(req.params.id)
    if (!taskId) return res.status(400).json({ error: 'id de tarea inválido' })

    const nota = normalizeOptionalText(req.body?.nota)
    if (!nota) return res.status(400).json({ error: 'nota es requerida' })

    const { empleadoId } = await resolveOperationalTaskAssignment(taskId, req.body?.empleadoId)
    const empleadoNombre = normalizeOptionalText(req.body?.empleadoNombre)
    await startOperationalTaskCompatibility({ taskId, empleadoId, empleadoNombre })
    await addOperationalTaskEvent({
      tareaId: taskId,
      tipo: 'admin_update',
      actorTipo: 'employee',
      actorId: empleadoId,
      actorNombre: empleadoNombre ?? 'Empleado',
      descripcion: nota,
      metadata: { source: 'whatsapp_progress' },
    })

    const task = await getOperationalTaskById(taskId)
    const payload = task ? buildTaskPayload(task) : null
    return res.json({
      success: true,
      tiempoTrabajadoSegundos: payload?.tiempoTrabajadoSegundos ?? 0,
      tiempoTrabajado: payload?.tiempoTrabajado ?? formatDuration(0),
      task: payload,
    })
  } catch (error: any) {
    return mapOperationalTaskError(res, error)
  }
})

botRouter.post('/operacion/:id/pausar', authBot, async (req, res) => {
  try {
    const taskId = parseId(req.params.id)
    if (!taskId) return res.status(400).json({ error: 'id de tarea inválido' })

    const { empleadoId } = await resolveOperationalTaskAssignment(taskId, req.body?.empleadoId)
    const task = await tasksService.pauseTask({
      taskId,
      empleadoId,
    })
    const payload = buildTaskPayload(task)
    return res.json({
      success: true,
      estado: payload.estado,
      tiempoTrabajadoSegundos: payload.tiempoTrabajadoSegundos,
      tiempoTrabajado: payload.tiempoTrabajado,
      task: payload,
    })
  } catch (error: any) {
    return mapOperationalTaskError(res, error)
  }
})

botRouter.post('/operacion/:id/completar', authBot, async (req, res) => {
  try {
    const taskId = parseId(req.params.id)
    if (!taskId) return res.status(400).json({ error: 'id de tarea inválido' })

    const { empleadoId } = await resolveOperationalTaskAssignment(taskId, req.body?.empleadoId)
    const nota = normalizeOptionalText(req.body?.nota)
    const result = await tasksService.finishTask({ taskId, empleadoId, note: nota })
    const payload = buildTaskPayload(result.task)
    return res.json({
      success: true,
      tiempoTrabajadoSegundos: payload.tiempoTrabajadoSegundos,
      tiempoTrabajado: payload.tiempoTrabajado,
      nextTask: result.nextTask ? buildTaskPayload(result.nextTask) : null,
      task: payload,
    })
  } catch (error: any) {
    return mapOperationalTaskError(res, error)
  }
})

// POST /api/bot/reporte
botRouter.post('/reporte', authBot, async (req, res) => {
  try {
    const locatario = normalizeText(req.body?.locatario)
    const local = normalizeText(req.body?.local)
    const planta = normalizeText(req.body?.planta)
    const contacto = normalizeOptionalText(req.body?.contacto)
    const categoria = normalizeText(req.body?.categoria).toLowerCase()
    const prioridad = normalizeText(req.body?.prioridad).toLowerCase()
    const titulo = normalizeText(req.body?.titulo)
    const descripcion = normalizeText(req.body?.descripcion)
    if (!locatario || !local || !planta || !categoria || !prioridad || !titulo || !descripcion) {
      return res.status(400).json({ error: 'Faltan campos requeridos' })
    }
    if (!isValidPlanta(planta)) {
      return res.status(400).json({ error: `planta inválida. Debe ser una de: ${PLANTAS.join(', ')}` })
    }
    if (!isValidCategoria(categoria)) {
      return res.status(400).json({ error: `categoria inválida. Debe ser una de: ${CATEGORIAS.join(', ')}` })
    }
    if (!isValidPrioridad(prioridad)) {
      return res.status(400).json({ error: `prioridad inválida. Debe ser una de: ${PRIORIDADES.join(', ')}` })
    }
    const id = await crearReporte({ locatario, local, planta, contacto, categoria, prioridad, titulo, descripcion } as any)
    notifyOwner({
      title: `[${prioridad.toUpperCase()}] Reclamo vía WhatsApp — ${local}`,
      content: `${locatario}: ${titulo}`,
      urgent: prioridad === 'urgente',
    }).catch(console.error)
    return res.json({ success: true, id })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// POST /api/bot/lead
botRouter.post('/lead', authBot, async (req, res) => {
  try {
    const nombre = normalizeText(req.body?.nombre)
    const telefono = normalizeOptionalText(req.body?.telefono)
    const email = normalizeOptionalText(req.body?.email)
    const waId = normalizeOptionalText(req.body?.waId)
    const rubro = normalizeOptionalText(req.body?.rubro)
    const tipoLocal = normalizeOptionalText(req.body?.tipoLocal)
    const mensaje = normalizeOptionalText(req.body?.mensaje)
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' })
    const id = await crearLead({ nombre, telefono, email, waId, rubro, tipoLocal, mensaje, fuente: 'whatsapp' } as any)
    notifyOwner({
      title: `Nuevo lead WhatsApp`,
      content: `${nombre} (${telefono || waId || 'sin contacto'}) — ${rubro || 'sin rubro'}`,
    }).catch(console.error)
    return res.json({ success: true, id })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// GET /api/bot/locales-disponibles
botRouter.get('/locales-disponibles', authBot, (_req, res) => {
  return res.json({
    disponibles: [],
    mensaje: 'Contactarse con administración para consultar disponibilidad actualizada.',
  })
})

// GET /api/bot/empleado/identificar/:waNumber
botRouter.get('/empleado/identificar/:waNumber', authBot, async (req, res) => {
  try {
    const empleado = await getEmpleadoByWaId(req.params.waNumber)
    if (!empleado) return res.status(404).json({ found: false })
    return res.json({ found: true, id: empleado.id, nombre: empleado.nombre, especialidad: empleado.especialidad })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// POST /api/bot/empleado/:id/entrada
botRouter.post('/empleado/:id/entrada', authBot, async (req, res) => {
  try {
    const empleadoId = parseId(req.params.id)
    if (!empleadoId) return res.status(400).json({ error: 'id de empleado inválido' })
    const empleado = await getEmpleadoById(empleadoId)
    if (!empleado || empleado.activo === false) return res.status(404).json({ error: 'Empleado no encontrado' })
    const nota = normalizeOptionalText(req.body?.nota)
    const { marcacion, alreadyOpen } = await registrarEntradaEmpleado(empleadoId, { fuente: 'whatsapp', nota })
    return res.json({
      success: true,
      alreadyOpen,
      empleado: { id: empleado.id, nombre: empleado.nombre },
      jornada: {
        id: marcacion.id,
        entradaAt: formatDateTime(marcacion.entradaAt),
        salidaAt: formatDateTime(marcacion.salidaAt),
      },
      message: alreadyOpen ? 'La jornada ya estaba iniciada.' : 'Entrada registrada correctamente.',
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// POST /api/bot/empleado/:id/salida
botRouter.post('/empleado/:id/salida', authBot, async (req, res) => {
  try {
    const empleadoId = parseId(req.params.id)
    if (!empleadoId) return res.status(400).json({ error: 'id de empleado inválido' })
    const empleado = await getEmpleadoById(empleadoId)
    if (!empleado || empleado.activo === false) return res.status(404).json({ error: 'Empleado no encontrado' })
    const nota = normalizeOptionalText(req.body?.nota)
    const marcacion = await registrarSalidaEmpleado(empleadoId, { nota })
    if (!marcacion) {
      return res.status(409).json({ error: 'No hay una jornada activa para registrar salida.' })
    }
    return res.json({
      success: true,
      empleado: { id: empleado.id, nombre: empleado.nombre },
      jornada: {
        id: marcacion.id,
        entradaAt: formatDateTime(marcacion.entradaAt),
        salidaAt: formatDateTime(marcacion.salidaAt),
        duracionSegundos: marcacion.duracionSegundos ?? 0,
        duracion: formatDuration(marcacion.duracionSegundos ?? 0),
      },
      message: 'Salida registrada correctamente.',
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// GET /api/bot/empleado/:id/jornada
botRouter.get('/empleado/:id/jornada', authBot, async (req, res) => {
  try {
    const empleadoId = parseId(req.params.id)
    if (!empleadoId) return res.status(400).json({ error: 'id de empleado inválido' })
    const jornada = await getJornadaActivaEmpleado(empleadoId)
    if (!jornada) return res.json({ active: false, jornada: null })
    return res.json({
      active: true,
      jornada: {
        id: jornada.id,
        entradaAt: formatDateTime(jornada.entradaAt),
        salidaAt: formatDateTime(jornada.salidaAt),
      },
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// GET /api/bot/empleado/:id/tareas
botRouter.get('/empleado/:id/tareas', authBot, async (req, res) => {
  try {
    const empleadoId = parseId(req.params.id)
    if (!empleadoId) return res.status(400).json({ error: 'id de empleado inválido' })
    const tareas = await getTareasEmpleado(empleadoId)
    return res.json({ tareas: tareas.map(t => buildTaskPayload(t, t.tiempoTrabajadoSegundos ?? 0)) })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// GET /api/bot/empleado/:id/resumen
botRouter.get('/empleado/:id/resumen', authBot, async (req, res) => {
  try {
    const empleadoId = Number(req.params.id)
    const [empleado, attendance, reclamosRaw, tareasInternasRaw] = await Promise.all([
      getEmpleadoActivoById(empleadoId),
      getEmpleadoAttendanceStatus(empleadoId),
      getTareasEmpleado(empleadoId),
      listOperationalTasksByEmployee(empleadoId),
    ])
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' })

    const reclamos = reclamosRaw.map(t => buildTaskPayload(t, t.tiempoTrabajadoSegundos ?? 0))
    const tareasInternas = tareasInternasRaw
      .filter(task => !['terminada', 'cancelada', 'rechazada'].includes(task.estado))
      .map(task => buildTaskPayload(task, task.tiempoTrabajadoSegundos ?? task.trabajoAcumuladoSegundos ?? 0))
    const tareas = [...reclamos, ...tareasInternas].sort(sortBotTasks)

    return res.json({
      empleado: {
        id: empleado.id,
        nombre: empleado.nombre,
        especialidad: empleado.especialidad,
      },
      attendance: buildAttendancePayload(attendance),
      counters: buildEmpleadoCounters(tareas),
      tareas,
      reclamos,
      tareasInternas,
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// POST /api/bot/empleado/:id/asistencia
botRouter.post('/empleado/:id/asistencia', authBot, async (req, res) => {
  try {
    const empleadoId = Number(req.params.id)
    const { accion, nota } = req.body as {
      accion?: typeof ATTENDANCE_ACTIONS[number]
      nota?: string
    }

    if (!accion || !ATTENDANCE_ACTIONS.includes(accion)) {
      return res.status(400).json({ error: 'accion inválida' })
    }

    const empleado = await getEmpleadoActivoById(empleadoId)
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' })

    const result = await registerEmpleadoAttendance(empleadoId, accion, 'whatsapp', nota)
    if (!result.success) {
      return res.status(409).json({
        success: false,
        code: result.code,
        attendance: buildAttendancePayload(result.status),
      })
    }

    return res.json({
      success: true,
      accion,
      attendance: buildAttendancePayload(result.status),
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// POST /api/bot/reporte/:id/respuesta
botRouter.post('/reporte/:id/respuesta', authBot, async (req, res) => {
  try {
    const reporteId = parseId(req.params.id)
    if (!reporteId) return res.status(400).json({ error: 'id de reclamo inválido' })
    const { respuesta, empleadoNombre } = req.body as {
      respuesta?: RespuestaEmpleado
      empleadoNombre?: string
    }
    const reporte = await getReporteById(reporteId)
    if (!reporte) return res.status(404).json({ error: 'Reclamo no encontrado' })
    if (!respuesta || !RESPUESTAS_EMPLEADO.includes(respuesta)) {
      return res.status(400).json({ error: 'respuesta inválida' })
    }

    if (respuesta === 'recibida') {
      const updated = await iniciarTrabajoReporte(reporteId)
      await actualizarReporte(reporteId, {
        asignacionEstado: 'aceptada',
        asignacionRespondidaAt: new Date(),
      } as any)
      await crearActualizacion({
        reporteId,
        usuarioNombre: empleadoNombre ?? 'Empleado',
        tipo: 'timer',
        descripcion: 'Empleado aceptó la tarea vía WhatsApp',
        estadoAnterior: reporte.estado,
        estadoNuevo: 'en_progreso',
      } as any)
      return res.json({
        success: true,
        respuesta,
        task: buildTaskPayload(updated ?? { ...reporte, estado: 'en_progreso' }),
      })
    }

    await actualizarReporte(reporteId, {
      estado: 'pendiente' as any,
      asignacionEstado: 'rechazada' as any,
      asignadoA: null as any,
      asignadoId: null as any,
      asignacionRespondidaAt: new Date(),
      trabajoIniciadoAt: null as any,
    } as any)
    await crearActualizacion({
      reporteId,
      usuarioNombre: empleadoNombre ?? 'Empleado',
      tipo: 'asignacion',
      descripcion: buildRechazoDescription(respuesta),
      estadoAnterior: reporte.estado,
      estadoNuevo: 'pendiente',
    } as any)
    notifyOwner({
      title: `Tarea rechazada — Reclamo #${reporteId}`,
      content: `${empleadoNombre ?? 'Empleado'} respondió "${respuesta}". Quedó disponible para reasignar.`,
    }).catch(console.error)
    const updated = await getReporteById(reporteId)
    return res.json({
      success: true,
      respuesta,
      task: updated ? buildTaskPayload(updated) : null,
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// POST /api/bot/reporte/:id/iniciar
botRouter.post('/reporte/:id/iniciar', authBot, async (req, res) => {
  try {
    const reporteId = parseId(req.params.id)
    if (!reporteId) return res.status(400).json({ error: 'id de reclamo inválido' })
    const { empleadoNombre } = req.body
    const reporte = await getReporteById(reporteId)
    if (!reporte) return res.status(404).json({ error: 'Reclamo no encontrado' })
    const updated = await iniciarTrabajoReporte(reporteId)
    await actualizarReporte(reporteId, {
      asignacionEstado: reporte.asignadoId ? 'aceptada' : reporte.asignacionEstado,
      asignacionRespondidaAt: reporte.asignadoId && !reporte.asignacionRespondidaAt ? new Date() : reporte.asignacionRespondidaAt,
    } as any)
    await crearActualizacion({
      reporteId,
      usuarioNombre: empleadoNombre ?? 'Empleado',
      tipo: 'timer',
      descripcion: 'Tarea iniciada vía WhatsApp',
      estadoAnterior: reporte.estado,
      estadoNuevo: 'en_progreso',
    } as any)
    return res.json({
      success: true,
      estado: updated?.estado ?? 'en_progreso',
      tiempoTrabajadoSegundos: updated ? getReporteTiempoTrabajadoSegundos(updated) : 0,
      tiempoTrabajado: formatDuration(updated ? getReporteTiempoTrabajadoSegundos(updated) : 0),
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// POST /api/bot/reporte/:id/pausar
botRouter.post('/reporte/:id/pausar', authBot, async (req, res) => {
  try {
    const reporteId = parseId(req.params.id)
    if (!reporteId) return res.status(400).json({ error: 'id de reclamo inválido' })
    const { nota, empleadoNombre } = req.body
    const reporte = await getReporteById(reporteId)
    if (!reporte) return res.status(404).json({ error: 'Reclamo no encontrado' })
    const updated = await pausarTrabajoReporte(reporteId)
    await crearActualizacion({
      reporteId,
      usuarioNombre: empleadoNombre ?? 'Empleado',
      tipo: 'timer',
      descripcion: nota ?? 'Tarea pausada vía WhatsApp',
      estadoAnterior: reporte.estado,
      estadoNuevo: 'pausado',
    } as any)
    return res.json({
      success: true,
      estado: updated?.estado ?? 'pausado',
      tiempoTrabajadoSegundos: updated?.trabajoAcumuladoSegundos ?? 0,
      tiempoTrabajado: formatDuration(updated?.trabajoAcumuladoSegundos ?? 0),
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// POST /api/bot/reporte/:id/progreso
botRouter.post('/reporte/:id/progreso', authBot, async (req, res) => {
  try {
    const reporteId = parseId(req.params.id)
    if (!reporteId) return res.status(400).json({ error: 'id de reclamo inválido' })
    const { nota, empleadoNombre } = req.body
    const empleadoId = parseOptionalBodyId(req.body?.empleadoId)
    if (!nota) return res.status(400).json({ error: 'nota es requerida' })
    if (req.body?.empleadoId !== undefined && empleadoId === null) {
      return res.status(400).json({ error: 'empleadoId inválido' })
    }
    const reporte = await getReporteById(reporteId)
    if (!reporte) return res.status(404).json({ error: 'Reclamo no encontrado' })
    // Only start timer if employee already accepted — don't auto-start on progress note
    const alreadyAccepted = reporte.asignacionEstado === 'aceptada' || !reporte.asignadoId
    const updated = (reporte.trabajoIniciadoAt || !alreadyAccepted) ? reporte : await iniciarTrabajoReporte(reporteId)
    if (alreadyAccepted && !reporte.asignacionRespondidaAt) {
      await actualizarReporte(reporteId, {
        asignacionEstado: 'aceptada',
        asignacionRespondidaAt: new Date(),
      } as any)
    }
    await crearActualizacion({
      reporteId,
      usuarioNombre: empleadoNombre ?? 'Empleado',
      tipo: 'progreso',
      descripcion: nota,
      estadoAnterior: reporte.estado,
      estadoNuevo: 'en_progreso',
    } as any)
    return res.json({
      success: true,
      tiempoTrabajadoSegundos: updated ? getReporteTiempoTrabajadoSegundos(updated) : 0,
      tiempoTrabajado: formatDuration(updated ? getReporteTiempoTrabajadoSegundos(updated) : 0),
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// POST /api/bot/reporte/:id/completar
botRouter.post('/reporte/:id/completar', authBot, async (req, res) => {
  try {
    const reporteId = parseId(req.params.id)
    if (!reporteId) return res.status(400).json({ error: 'id de reclamo inválido' })
    const { nota, empleadoNombre } = req.body
    const empleadoId = parseOptionalBodyId(req.body?.empleadoId)
    if (req.body?.empleadoId !== undefined && empleadoId === null) {
      return res.status(400).json({ error: 'empleadoId inválido' })
    }
    const reporte = await getReporteById(reporteId)
    if (!reporte) return res.status(404).json({ error: 'Reclamo no encontrado' })
    const updated = await completarTrabajoReporte(reporteId)
    const tiempoTrabajadoSegundos = updated?.trabajoAcumuladoSegundos ?? getReporteTiempoTrabajadoSegundos(reporte)
    await crearActualizacion({
      reporteId,
      usuarioNombre: empleadoNombre ?? 'Empleado',
      tipo: 'completado',
      descripcion: nota ?? `Tarea completada vía WhatsApp. Tiempo total: ${formatDuration(tiempoTrabajadoSegundos)}`,
      estadoAnterior: reporte.estado,
      estadoNuevo: 'completado',
    } as any)
    notifyOwner({
      title: `Tarea completada — Reclamo #${reporteId}`,
      content: `${empleadoNombre ?? 'Empleado'} marcó el reclamo como completado. Tiempo total: ${formatDuration(tiempoTrabajadoSegundos)}.`,
    }).catch(console.error)

    let nextTask = null
    if (empleadoId) {
      const tareasRestantes = await getTareasEmpleado(empleadoId)
      if (tareasRestantes.length === 0) {
        const empleado = await getEmpleadoActivoById(Number(empleadoId))
        const siguiente = await getNextAssignableReporteForEmpleado(Number(empleadoId))
        if (empleado && siguiente) {
          await actualizarReporte(siguiente.id, {
            asignadoA: empleado.nombre,
            asignadoId: empleado.id,
            estado: 'pendiente' as any,
            asignacionEstado: 'pendiente_confirmacion' as any,
            asignacionRespondidaAt: null as any,
          } as any)
          await crearActualizacion({
            reporteId: siguiente.id,
            usuarioNombre: 'DocksBot',
            tipo: 'asignacion',
            descripcion: `Asignado automáticamente a: ${empleado.nombre}. Pendiente de confirmación del empleado.`,
            estadoAnterior: 'pendiente',
            estadoNuevo: 'pendiente',
          } as any)
          nextTask = {
            id: siguiente.id,
            titulo: siguiente.titulo,
            local: siguiente.local,
            planta: siguiente.planta,
            prioridad: siguiente.prioridad,
            estado: 'pendiente',
            descripcion: siguiente.descripcion,
            tiempoTrabajadoSegundos: 0,
            tiempoTrabajado: formatDuration(0),
          }
        }
      }
    }

    return res.json({
      success: true,
      nextTask,
      tiempoTrabajadoSegundos,
      tiempoTrabajado: formatDuration(tiempoTrabajadoSegundos),
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// GET /api/bot/queue — bot polls for pending outbound messages
botRouter.get('/queue', authBot, async (_req, res) => {
  try {
    const items = await getPendingBotMessages()
    return res.json({ items })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// POST /api/bot/queue/:id/sent
botRouter.post('/queue/:id/sent', authBot, async (req, res) => {
  try {
    const id = parseId(req.params.id)
    if (!id) return res.status(400).json({ error: 'id de mensaje inválido' })
    await markBotMessageSent(id)
    return res.json({ success: true })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// POST /api/bot/queue/:id/failed
botRouter.post('/queue/:id/failed', authBot, async (req, res) => {
  try {
    const id = parseId(req.params.id)
    if (!id) return res.status(400).json({ error: 'id de mensaje inválido' })
    await markBotMessageFailed(id)
    return res.json({ success: true })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

export default botRouter
