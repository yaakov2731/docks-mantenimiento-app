/**
 * REST API para el bot de WhatsApp.
 * Autenticación: header X-Bot-Api-Key
 */
import { Router } from 'express'
import { crearReporte, crearLead, getEmpleadoByWaId, getTareasEmpleado, actualizarReporte, crearActualizacion, getPendingBotMessages, markBotMessageSent, markBotMessageFailed } from './db'
import { notifyOwner } from './_core/notification'
import { readEnv } from './_core/env'

const botRouter = Router()

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
    return res.json({ tareas: tareas.map(t => ({
      id: t.id,
      titulo: t.titulo,
      local: t.local,
      planta: t.planta,
      prioridad: t.prioridad,
      estado: t.estado,
      descripcion: t.descripcion,
    })) })
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
    await actualizarReporte(reporteId, { estado: 'en_progreso' as any })
    await crearActualizacion({
      reporteId,
      usuarioNombre: empleadoNombre ?? 'Empleado',
      tipo: 'progreso',
      descripcion: nota,
      estadoAnterior: null as any,
      estadoNuevo: 'en_progreso',
    } as any)
    return res.json({ success: true })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// POST /api/bot/reporte/:id/completar
botRouter.post('/reporte/:id/completar', authBot, async (req, res) => {
  try {
    const reporteId = Number(req.params.id)
    const { nota, empleadoId, empleadoNombre } = req.body
    await actualizarReporte(reporteId, { estado: 'completado' as any, completadoAt: new Date() } as any)
    await crearActualizacion({
      reporteId,
      usuarioNombre: empleadoNombre ?? 'Empleado',
      tipo: 'completado',
      descripcion: nota ?? 'Tarea completada vía WhatsApp',
      estadoAnterior: null as any,
      estadoNuevo: 'completado',
    } as any)
    notifyOwner({
      title: `Tarea completada — Reclamo #${reporteId}`,
      content: `${empleadoNombre ?? 'Empleado'} marcó el reclamo como completado.`,
    }).catch(console.error)
    return res.json({ success: true })
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
