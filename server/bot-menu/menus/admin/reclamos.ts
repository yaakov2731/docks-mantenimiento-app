/**
 * Flujo de Reclamos para administradores/gerentes.
 * admin_reclamos → admin_reclamo_detalle → admin_asignar_empleado → admin_asignar_confirmar
 */
import { BotSession, navigateTo, navigateBack } from '../../session'
import {
  SEP, parseMenuOption, invalidOption, paginate,
  prioEmoji, estadoEmoji, fmtDuration, errorMsg, confirmMsg,
} from '../../shared/guards'
import {
  getReportes,
  getReporteById,
  getEmpleadoById,
  calcularSLA,
  getReportesVencidos,
  getBotConnectionStatus,
  getPendingBotMessages,
} from '../../../db'
import { assignReporteToEmployee } from '../../../reporte-assignment'
import { createRoundsService } from '../../../rounds/service'
import * as roundDb from '../../../db'

const PAGE_SIZE = 5

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFechaRelativa(date: Date | number | null | undefined): string {
  if (!date) return '—'
  const d = date instanceof Date ? date : new Date(Number(date) * 1000)
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 2) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hs = Math.floor(mins / 60)
  if (hs < 24) return `hace ${hs}h`
  return `hace ${Math.floor(hs / 24)}d`
}

function serializeReclamo(r: any) {
  return {
    id: r.id,
    titulo: r.titulo,
    local: r.local,
    planta: r.planta,
    prioridad: r.prioridad,
    estado: r.estado,
    asignacionEstado: r.asignacionEstado,
    asignadoA: r.asignadoA ?? null,
    asignadoId: r.asignadoId ?? null,
    descripcion: r.descripcion,
    locatario: r.locatario,
    createdAt: r.createdAt,
    sla: calcularSLA(r.prioridad, r.createdAt),
  }
}

async function getReclamosPendientes() {
  const reportes = await getReportes()
  return reportes
    .filter(r => !['completado', 'cancelado'].includes(r.estado))
    .map(serializeReclamo)
    .sort((a, b) => {
      // urgente primero, luego sin asignar, luego por antigüedad
      const prank: Record<string, number> = { urgente: 4, alta: 3, media: 2, baja: 1 }
      const pd = (prank[b.prioridad] ?? 0) - (prank[a.prioridad] ?? 0)
      if (pd !== 0) return pd
      if (!a.asignadoId && b.asignadoId) return -1
      if (a.asignadoId && !b.asignadoId) return 1
      return 0
    })
}

// ─── Lista reclamos pendientes ────────────────────────────────────────────────

export async function buildReclamosPendientes(session: BotSession, filtro?: 'urgentes'): Promise<string> {
  let todos = await getReclamosPendientes()
  if (filtro === 'urgentes') todos = todos.filter(r => r.prioridad === 'urgente' && !r.asignadoId)

  const page = session.contextData.page ?? 1
  const paged = paginate(todos, page, PAGE_SIZE)

  if (todos.length === 0) {
    const msg = filtro === 'urgentes' ? '✅ No hay urgentes sin asignar.' : '✅ No hay reclamos pendientes.'
    return `📋 *Reclamos*\n${SEP}\n${msg}\n${SEP}\n0️⃣  Volver`
  }

  const titulo = filtro === 'urgentes'
    ? `🔴 *Urgentes sin asignar* (${todos.length})`
    : `📋 *Reclamos pendientes* (${todos.length})`

  const lines = [titulo, SEP]

  paged.items.forEach((r, i) => {
    const n = (page - 1) * PAGE_SIZE + i + 1
    const asign = r.asignadoA ? `👷 ${r.asignadoA}` : `⚠️ Sin asignar`
    const slaStr = r.sla.vencida ? ` 🚨 SLA VENCIDO` : r.sla.enRiesgo ? ` ⚠️ SLA en riesgo` : ''
    lines.push(
      `${n}️⃣  ${prioEmoji(r.prioridad)} #${r.id} — ${r.titulo}${slaStr}`,
      `   📍 ${r.local} | ${asign} | ${fmtFechaRelativa(r.createdAt)}`,
    )
  })

  lines.push(SEP)
  if (paged.hasPrev) lines.push(`8️⃣  ◀️ Anterior`)
  if (paged.hasNext) lines.push(`9️⃣  ▶️ Ver más`)
  lines.push(`0️⃣  Volver`)
  return lines.join('\n')
}

export async function handleReclamosPendientes(
  session: BotSession,
  input: string,
  filtro?: 'urgentes'
): Promise<string> {
  let todos = await getReclamosPendientes()
  if (filtro === 'urgentes') todos = todos.filter(r => r.prioridad === 'urgente' && !r.asignadoId)

  const page = session.contextData.page ?? 1
  const paged = paginate(todos, page, PAGE_SIZE)

  if (input === '8' && paged.hasPrev) {
    const ctx = { ...session.contextData, page: page - 1, filtroReclamos: filtro }
    await navigateTo(session, session.currentMenu, ctx)
    return buildReclamosPendientes({ ...session, contextData: ctx }, filtro)
  }
  if (input === '9' && paged.hasNext) {
    const ctx = { ...session.contextData, page: page + 1, filtroReclamos: filtro }
    await navigateTo(session, session.currentMenu, ctx)
    return buildReclamosPendientes({ ...session, contextData: ctx }, filtro)
  }
  if (input === '0') return null as any

  const opt = parseMenuOption(input, paged.items.length)
  if (!opt) return invalidOption(await buildReclamosPendientes(session, filtro))

  const reclamo = paged.items[opt - 1]
  await navigateTo(session, 'admin_reclamo_detalle', {
    reporteId: reclamo.id,
    prevMenu: session.currentMenu,
  })
  return buildAdminReclamoDetalle(reclamo)
}

// ─── Detalle reclamo (admin) ──────────────────────────────────────────────────

export function buildAdminReclamoDetalle(r: any): string {
  const asign = r.asignadoA
    ? `👷 ${r.asignadoA} (${r.asignacionEstado})`
    : `⚠️ Sin asignar`
  const slaStr = r.sla.vencida
    ? `🚨 *VENCIDO* (${r.sla.elapsedMins} min)`
    : r.sla.enRiesgo
      ? `⚠️ En riesgo — ${r.sla.minRestantes} min restantes`
      : `✅ OK — ${r.sla.minRestantes} min restantes`

  const lines = [
    `📌 *Reclamo #${r.id}* — ${r.prioridad.toUpperCase()}`,
    SEP,
    `📍 ${r.local} (planta ${r.planta})`,
    `🔧 ${r.titulo}`,
    `📝 ${r.descripcion.substring(0, 120)}${r.descripcion.length > 120 ? '...' : ''}`,
    `👤 Locatario: ${r.locatario}`,
    `📅 Creado: ${fmtFechaRelativa(r.createdAt)}`,
    `⏱️ SLA: ${slaStr}`,
    SEP,
    `Asignación: ${asign}`,
    SEP,
    `1️⃣  👷 Asignar a empleado`,
    `2️⃣  ⚡ Cambiar prioridad`,
    `3️⃣  📄 Ver descripción completa`,
    `4️⃣  ❌ Cancelar reclamo`,
    `0️⃣  Volver`,
  ]
  return lines.join('\n')
}

export async function handleAdminReclamoDetalle(session: BotSession, input: string): Promise<string> {
  const { reporteId } = session.contextData
  if (!reporteId) return errorMsg('No se encontró el reclamo.')

  const reporte = await getReporteById(reporteId as number)
  if (!reporte) return errorMsg('Reclamo no encontrado.')
  const r = serializeReclamo(reporte)

  if (input === '1') {
    await navigateTo(session, 'admin_asignar_empleado', { reporteId })
    return buildAsignarEmpleado(r)
  }
  if (input === '2') {
    await navigateTo(session, 'admin_cambiar_prioridad', { reporteId })
    return buildCambiarPrioridad(r)
  }
  if (input === '3') {
    return `📝 *Descripción completa #${r.id}:*\n\n${r.descripcion}\n\n${SEP}\n0️⃣  Volver`
  }
  if (input === '4') {
    await navigateTo(session, 'admin_cancelar_reclamo', { reporteId })
    return confirmMsg(`¿Cancelar reclamo #${r.id}?\n📍 ${r.titulo}`, 'Sí, cancelar')
  }
  if (input === '0') return null as any

  return invalidOption(buildAdminReclamoDetalle(r))
}

// ─── Asignar empleado ─────────────────────────────────────────────────────────

async function buildAsignarEmpleado(reclamo: any): Promise<string> {
  const { getEmpleados } = await import('../../../db')
  const empleados = (await getEmpleados()).filter((e: any) => e.activo)

  if (empleados.length === 0) {
    return `⚠️ No hay empleados activos registrados.\n\n0️⃣  Volver`
  }

  const lines = [
    `👷 *Asignar Reclamo #${reclamo.id}*`,
    `🔧 ${reclamo.titulo}`,
    SEP,
    `Empleados disponibles:`,
  ]

  empleados.slice(0, 8).forEach((e: any, i: number) => {
    lines.push(`${i + 1}️⃣  ${e.nombre}${e.especialidad ? ` — ${e.especialidad}` : ''}`)
  })

  lines.push(SEP, `0️⃣  Cancelar`)
  return lines.join('\n')
}

export async function handleAsignarEmpleado(session: BotSession, input: string): Promise<string> {
  const { reporteId } = session.contextData
  if (!reporteId) return errorMsg('No se encontró el reclamo.')

  const { getEmpleados } = await import('../../../db')
  const empleados = (await getEmpleados()).filter((e: any) => e.activo).slice(0, 8)

  if (input === '0') return null as any

  const opt = parseMenuOption(input, empleados.length)
  if (!opt) {
    const reporte = await getReporteById(reporteId as number)
    if (!reporte) return errorMsg('Reclamo no encontrado.')
    return invalidOption(await buildAsignarEmpleado(serializeReclamo(reporte)))
  }

  const empleado = empleados[opt - 1]
  if (!empleado) return errorMsg('Empleado no encontrado.')

  await navigateTo(session, 'admin_asignar_confirmar', {
    reporteId,
    empleadoId: empleado.id,
    empleadoNombre: empleado.nombre,
  })

  return confirmMsg(
    `¿Asignar a *${empleado.nombre}*?\n\nReclamo #${reporteId}`,
    `Sí, asignar a ${empleado.nombre}`
  )
}

export async function handleAsignarConfirmar(session: BotSession, input: string): Promise<string> {
  const { reporteId, empleadoId, empleadoNombre } = session.contextData
  if (!reporteId || !empleadoId) return errorMsg('Datos incompletos.')

  if (input === '2') {
    await navigateBack(session)
    return null as any
  }
  if (input !== '1') {
    return invalidOption(confirmMsg(`¿Asignar a *${empleadoNombre}*?\n\nReclamo #${reporteId}`, `Sí, asignar`))
  }

  try {
    await assignReporteToEmployee({
      reporteId: reporteId as number,
      empleadoId: empleadoId as number,
      empleadoNombre: empleadoNombre as string,
      actor: { id: session.userId, name: session.userName },
    })
    await navigateTo(session, 'admin_reclamos', { page: 1 })
    return [
      `✅ *Reclamo #${reporteId} asignado.*`,
      ``,
      `👷 Asignado a: *${empleadoNombre}*`,
      `Se envió notificación al empleado por WhatsApp.`,
      ``,
      `0️⃣  Volver a reclamos`,
    ].join('\n')
  } catch (e: any) {
    return errorMsg(e?.message ?? 'No se pudo asignar el reclamo.')
  }
}

// ─── Cambiar prioridad ────────────────────────────────────────────────────────

function buildCambiarPrioridad(r: any): string {
  return [
    `⚡ *Cambiar prioridad — Reclamo #${r.id}*`,
    `Prioridad actual: ${prioEmoji(r.prioridad)} ${r.prioridad.toUpperCase()}`,
    SEP,
    `1️⃣  🟢 Baja`,
    `2️⃣  🟡 Media`,
    `3️⃣  🟠 Alta`,
    `4️⃣  🔴 Urgente`,
    `0️⃣  Cancelar`,
  ].join('\n')
}

const PRIORIDADES_MAP: Record<string, string> = { '1': 'baja', '2': 'media', '3': 'alta', '4': 'urgente' }

export async function handleCambiarPrioridad(session: BotSession, input: string): Promise<string> {
  const { reporteId } = session.contextData
  if (!reporteId) return errorMsg('No se encontró el reclamo.')

  if (input === '0') return null as any

  const prioridad = PRIORIDADES_MAP[input]
  if (!prioridad) {
    const reporte = await getReporteById(reporteId as number)
    if (!reporte) return errorMsg('Reclamo no encontrado.')
    return invalidOption(buildCambiarPrioridad(serializeReclamo(reporte)))
  }

  const { actualizarReporte, crearActualizacion } = await import('../../../db')
  await actualizarReporte(reporteId as number, { prioridad } as any)
  await crearActualizacion({
    reporteId,
    usuarioNombre: session.userName,
    tipo: 'estado',
    descripcion: `${session.userName} cambió la prioridad a ${prioridad}`,
  } as any)

  await navigateTo(session, 'admin_reclamos', { page: 1 })
  return `✅ Prioridad actualizada a *${prioridad.toUpperCase()}*.\n\n0️⃣  Volver`
}

// ─── Cancelar reclamo ─────────────────────────────────────────────────────────

export async function handleCancelarReclamo(session: BotSession, input: string): Promise<string> {
  const { reporteId } = session.contextData
  if (!reporteId) return errorMsg('No se encontró el reclamo.')

  if (input === '2') return null as any
  if (input !== '1') return invalidOption(confirmMsg(`¿Cancelar reclamo #${reporteId}?`))

  const { actualizarReporte, crearActualizacion } = await import('../../../db')
  await actualizarReporte(reporteId as number, { estado: 'cancelado' } as any)
  await crearActualizacion({
    reporteId,
    usuarioNombre: session.userName,
    tipo: 'estado',
    descripcion: `${session.userName} canceló el reclamo`,
    estadoNuevo: 'cancelado',
  } as any)

  await navigateTo(session, 'admin_reclamos', { page: 1 })
  return `✅ Reclamo #${reporteId} cancelado.\n\n0️⃣  Volver`
}

// ─── Estado general del día ───────────────────────────────────────────────────

export async function buildEstadoGeneral(session: BotSession): Promise<string> {
  const [reportes, vencidos, botStatus, pendingMsgs] = await Promise.all([
    getReportes(),
    getReportesVencidos(),
    getBotConnectionStatus(),
    getPendingBotMessages(),
  ])

  const abiertos = reportes.filter(r => !['completado', 'cancelado'].includes(r.estado))
  const completadosHoy = reportes.filter(r => {
    if (r.estado !== 'completado' || !r.completadoAt) return false
    const hoy = new Date()
    const d = r.completadoAt instanceof Date ? r.completadoAt : new Date(Number(r.completadoAt) * 1000)
    return d.toDateString() === hoy.toDateString()
  })

  const urgentesLibres = abiertos.filter(r => r.prioridad === 'urgente' && !r.asignadoId)
  const enProgreso = abiertos.filter(r => r.estado === 'en_progreso')
  const sinAsignar = abiertos.filter(r => !r.asignadoId)

  const botStr = botStatus.connected
    ? `🟢 Conectado`
    : `🔴 Desconectado (${botStatus.minutesSince ?? '?'} min sin responder)`

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  })

  return [
    `📊 *Estado general — Docks del Puerto*`,
    `📅 ${today}`,
    SEP,
    `📋 Reclamos abiertos: *${abiertos.length}*`,
    `  ▶️ En progreso: ${enProgreso.length}`,
    `  ⚠️  Sin asignar: ${sinAsignar.length}`,
    `  🔴 Urgentes sin asignar: ${urgentesLibres.length}`,
    `  🚨 SLA vencidos: ${vencidos.length}`,
    `  ✅ Completados hoy: ${completadosHoy.length}`,
    SEP,
    `🤖 Bot WhatsApp: ${botStr}`,
    pendingMsgs.length > 0 ? `  📨 Mensajes en cola: ${pendingMsgs.length}` : '',
    SEP,
    `0️⃣  Volver al menú principal`,
  ].filter(Boolean).join('\n')
}

// ─── Rondas de baños (admin) ──────────────────────────────────────────────────

export async function buildEstadoRondas(): Promise<string> {
  try {
    const { createClient } = await import('@libsql/client')
    const { drizzle } = await import('drizzle-orm/libsql')
    const { eq, and } = await import('drizzle-orm')
    const schema = await import('../../../../drizzle/schema')
    const { readEnv } = await import('../../../_core/env')
    const cl = createClient({ url: readEnv('TURSO_URL')!, authToken: readEnv('TURSO_TOKEN')! })
    const db = drizzle(cl, { schema })

    const hoy = new Date().toISOString().split('T')[0]
    const rondas = await db.select().from(schema.rondasOcurrencia)
      .where(eq(schema.rondasOcurrencia.fechaOperativa, hoy))

    const total = rondas.length
    const cumplidas = rondas.filter(r => r.estado === 'cumplido').length
    const conObs = rondas.filter(r => r.estado === 'cumplido_con_observacion').length
    const vencidas = rondas.filter(r => r.estado === 'vencido').length
    const pendientes = rondas.filter(r => r.estado === 'pendiente').length

    return [
      `🚻 *Estado rondas de baños — Hoy*`,
      SEP,
      `Total programadas: ${total}`,
      `✅ Cumplidas: ${cumplidas}`,
      `⚠️  Con observación: ${conObs}`,
      `❌ Vencidas: ${vencidas}`,
      `⏳ Pendientes: ${pendientes}`,
      SEP,
      `0️⃣  Volver al menú principal`,
    ].join('\n')
  } catch {
    return `🚻 No se pudo obtener el estado de rondas.\n\n0️⃣  Volver`
  }
}

// ─── SLA vencidos ─────────────────────────────────────────────────────────────

export async function buildSLAVencidos(): Promise<string> {
  const vencidos = await getReportesVencidos()

  if (vencidos.length === 0) {
    return `✅ *No hay reclamos con SLA vencido.*\n\n0️⃣  Volver`
  }

  const lines = [
    `🚨 *Reclamos con SLA vencido* (${vencidos.length})`,
    SEP,
  ]

  vencidos.slice(0, 8).forEach((r, i) => {
    const asign = r.asignadoA ? `${r.asignadoA}` : 'Sin asignar'
    lines.push(
      `${i + 1}️⃣  ${prioEmoji(r.prioridad)} #${r.id} — ${r.titulo}`,
      `   ⏱️ ${r.sla.elapsedMins} min vencido | ${asign}`,
    )
  })

  lines.push(SEP, `0️⃣  Volver`)
  return lines.join('\n')
}
