/**
 * REST API para el bot de WhatsApp.
 * Autenticación: header X-Bot-Api-Key
 */
import { Router } from 'express'
import {
  crearReporte,
  crearLead,
  getEmpleadoByWaId,
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

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return `${safe}s`
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

// POST /api/bot/reporte
botRouter.post('/reporte', authBot, async (req, res) => {
  try {
    const { locatario, local, planta, contacto, categoria, prioridad, titulo, descripcion } = req.body
    if (!locatario || !local || !planta || !categoria || !prioridad || !titulo || !descripcion) {
      return res.status(400).json({ error: 'Faltan campos requeridos' })
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
    const { nombre, telefono, email, waId, rubro, tipoLocal, mensaje } = req.body
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' })
    const id = await crearLead({ nombre, telefono, email, waId, rubro, tipoLocal, mensaje, fuente: 'whatsapp' } as any)
    notifyOwner({
      title: `Nuevo lead WhatsApp`,
      content: `${nombre} (${telefono ?? waId ?? 'sin contacto'}) — ${rubro ?? 'sin rubro'}`,
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

// GET /api/bot/empleado/:id/tareas
botRouter.get('/empleado/:id/tareas', authBot, async (req, res) => {
  try {
    const tareas = await getTareasEmpleado(Number(req.params.id))
    return res.json({ tareas: tareas.map(t => buildTaskPayload(t, t.tiempoTrabajadoSegundos ?? 0)) })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// POST /api/bot/reporte/:id/respuesta
botRouter.post('/reporte/:id/respuesta', authBot, async (req, res) => {
  try {
    const reporteId = Number(req.params.id)
    const { respuesta, empleadoNombre } = req.body as {
      respuesta?: 'recibida' | 'no_puede' | 'ocupado' | 'franco'
      empleadoNombre?: string
    }
    const reporte = await getReporteById(reporteId)
    if (!reporte) return res.status(404).json({ error: 'Reclamo no encontrado' })
    if (!respuesta || !['recibida', 'no_puede', 'ocupado', 'franco'].includes(respuesta)) {
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
      descripcion: 'Empleado indicó que no puede tomar la tarea. Tarea liberada para reasignación.',
      estadoAnterior: reporte.estado,
      estadoNuevo: 'pendiente',
    } as any)
    notifyOwner({
      title: `Tarea rechazada — Reclamo #${reporteId}`,
      content: `${empleadoNombre ?? 'Empleado'} indicó que no puede tomar la tarea. Quedó disponible para reasignar.`,
    }).catch(console.error)
    const updated = await getReporteById(reporteId)
    return res.json({
      success: true,
      respuesta: 'no_puede',
      task: updated ? buildTaskPayload(updated) : null,
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// POST /api/bot/reporte/:id/iniciar
botRouter.post('/reporte/:id/iniciar', authBot, async (req, res) => {
  try {
    const reporteId = Number(req.params.id)
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
    const reporteId = Number(req.params.id)
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
    const reporteId = Number(req.params.id)
    const { nota, empleadoId, empleadoNombre } = req.body
    if (!nota) return res.status(400).json({ error: 'nota es requerida' })
    const reporte = await getReporteById(reporteId)
    if (!reporte) return res.status(404).json({ error: 'Reclamo no encontrado' })
    const updated = reporte.trabajoIniciadoAt ? reporte : await iniciarTrabajoReporte(reporteId)
    await actualizarReporte(reporteId, {
      asignacionEstado: reporte.asignadoId ? 'aceptada' : reporte.asignacionEstado,
      asignacionRespondidaAt: reporte.asignadoId && !reporte.asignacionRespondidaAt ? new Date() : reporte.asignacionRespondidaAt,
    } as any)
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
    const reporteId = Number(req.params.id)
    const { nota, empleadoId, empleadoNombre } = req.body
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
      const tareasRestantes = await getTareasEmpleado(Number(empleadoId))
      if (tareasRestantes.length === 0) {
        const empleado = await getEmpleadoById(Number(empleadoId))
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
    await markBotMessageSent(Number(req.params.id))
    return res.json({ success: true })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// POST /api/bot/queue/:id/failed
botRouter.post('/queue/:id/failed', authBot, async (req, res) => {
  try {
    await markBotMessageFailed(Number(req.params.id))
    return res.json({ success: true })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

export default botRouter
