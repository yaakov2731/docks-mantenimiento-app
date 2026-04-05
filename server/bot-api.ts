/**
 * REST API para el bot de WhatsApp.
 * Autenticación: header X-Bot-Api-Key
 */
import { Router } from 'express'
import {
  crearReporte,
  crearLead,
  getEmpleadoByWaId,
  getJornadaActivaEmpleado,
  registrarEntradaEmpleado,
  registrarSalidaEmpleado,
  getTareasEmpleado,
  crearActualizacion,
  getPendingBotMessages,
  markBotMessageSent,
  markBotMessageFailed,
  getEmpleadoById,
  getNextAssignableReporteForEmpleado,
  getReporteById,
  getReporteTiempoTrabajadoSegundos,
  iniciarTrabajoReporte,
  pausarTrabajoReporte,
  completarTrabajoReporte,
  actualizarReporte,
} from './db'
import { notifyOwner } from './_core/notification'
import { readEnv } from './_core/env'

const botRouter = Router()
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
  const total = tiempoTrabajadoSegundos ?? getReporteTiempoTrabajadoSegundos(reporte)
  return {
    id: reporte.id,
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
        const empleado = await getEmpleadoById(empleadoId)
        const siguiente = await getNextAssignableReporteForEmpleado(empleadoId)
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
