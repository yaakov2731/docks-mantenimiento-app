/**
 * Flujo completo de Mis Tareas para empleados.
 * Menús: tarea_actual → tareas_lista → tarea_detalle → tarea_confirmar_completar | tarea_pausa_motivo | tarea_problema
 */
import { BotSession, navigateTo, navigateBack } from '../../session'
import {
  SEP, parseMenuOption, invalidOption, prioEmoji, estadoEmoji,
  fmtDuration, paginate, errorMsg,
} from '../../shared/guards'
import {
  getTareasEmpleado,
  listOperationalTasksByEmployee,
  getReporteById,
  iniciarTrabajoReporte,
  pausarTrabajoReporte,
  completarTrabajoReporte,
  actualizarReporte,
  crearActualizacion,
  getOperationalTaskById,
  enqueueBotMessage,
} from '../../../db'
import { createOperationalTasksService } from '../../../tasks/service'
import * as roundDb from '../../../db'
import { notifyOwner } from '../../../_core/notification'

const tasksService = createOperationalTasksService(roundDb as any)

const PAGE_SIZE = 5

// ─── Helpers ─────────────────────────────────────────────────────────────────

type UnifiedTask = {
  id: number
  origen: 'reclamo' | 'operacion'
  titulo: string
  local: string
  prioridad: string
  estado: string
  asignacionEstado: string
  tiempoSeg: number
}

export async function getAllTareasActivas(empleadoId: number): Promise<UnifiedTask[]> {
  const [reclamos, operaciones] = await Promise.all([
    getTareasEmpleado(empleadoId),
    listOperationalTasksByEmployee(empleadoId),
  ])
  const ops = operaciones.filter(t => !['terminada', 'cancelada', 'rechazada'].includes(t.estado))

  // Unificar formato
  const unified = [
    ...reclamos.map(r => ({
      id: r.id,
      origen: 'reclamo' as const,
      titulo: r.titulo,
      local: r.local,
      prioridad: r.prioridad,
      estado: r.estado,
      asignacionEstado: r.asignacionEstado,
      tiempoSeg: r.trabajoAcumuladoSegundos ?? 0,
    })),
    ...ops.map(t => ({
      id: t.id,
      origen: 'operacion' as const,
      titulo: t.titulo,
      local: (t as any).ubicacion ?? 'Operación',
      prioridad: t.prioridad,
      estado: normalizeEstado(t.estado),
      asignacionEstado: deriveAsignacion(t.estado),
      tiempoSeg: (t as any).tiempoTrabajadoSegundos ?? (t as any).trabajoAcumuladoSegundos ?? 0,
    })),
  ]

  // Ordenar: pendiente_confirmacion primero, luego en_progreso, pausado, pendiente
  return unified.sort((a, b) => rankTarea(a) - rankTarea(b))
}

async function getCurrentTask(empleadoId: number): Promise<UnifiedTask | null> {
  const tareas = await getAllTareasActivas(empleadoId)
  return tareas[0] ?? null
}

function normalizeEstado(estado: string): string {
  switch (estado) {
    case 'pendiente_asignacion':
    case 'pendiente_confirmacion': return 'pendiente'
    case 'pausada': return 'pausado'
    case 'terminada': return 'completado'
    case 'rechazada':
    case 'cancelada': return 'cancelado'
    default: return estado
  }
}

function deriveAsignacion(estado: string): string {
  if (estado === 'pendiente_confirmacion') return 'pendiente_confirmacion'
  return 'aceptada'
}

function rankTarea(t: { estado: string; asignacionEstado: string }): number {
  if (t.asignacionEstado === 'pendiente_confirmacion') return 0
  switch (t.estado) {
    case 'en_progreso': return 1
    case 'pausado':     return 2
    case 'pendiente':   return 3
    default:            return 4
  }
}

function buildMainOptionsFooter(): string[] {
  return [
    SEP,
    `1️⃣  🎯 Ver mi tarea actual`,
    `2️⃣  📋 Ver todas mis tareas`,
    `3️⃣  🕐 Registrar asistencia`,
    `4️⃣  🚻 Control de baños`,
  ]
}

function buildOperationalTaskAcceptanceBlocked(task: { id: number }, menu: string): string {
  return [
    `⚠️ *No pude aceptar la tarea #${task.id}.*`,
    `Ya tenés otra tarea operativa en curso. Terminá o pausá esa primero y después volvé a intentarlo.`,
    '',
    menu,
  ].join('\n')
}

function isOperationalTaskConflict(error: unknown): boolean {
  return error instanceof Error && error.message === 'Employee already has an active operational task'
}

// ─── TAREA ACTUAL ────────────────────────────────────────────────────────────

export async function buildTareaActual(session: BotSession): Promise<string> {
  const tarea = await getCurrentTask(session.userId)

  if (!tarea) {
    return [
      `🎯 *Tu tarea actual*`,
      SEP,
      `✅ No tenés una tarea activa ahora.`,
      `Podés revisar todo tu listado o seguir con otra gestión.`,
      SEP,
      `1️⃣  📋 Ver todas mis tareas`,
      `2️⃣  🕐 Registrar asistencia`,
      `3️⃣  🚻 Ver rondas`,
      `0️⃣  Volver`,
    ].join('\n')
  }

  if (tarea.origen === 'operacion') {
    const task = await getOperationalTaskById(tarea.id)
    if (!task) return errorMsg('No se encontró la tarea actual.')
    return buildOperacionalActual(task)
  }

  const reporte = await getReporteById(tarea.id)
  if (!reporte) return errorMsg('No se encontró la tarea actual.')
  return buildReclamoActual(reporte)
}

export async function handleTareaActual(session: BotSession, input: string): Promise<string> {
  const tarea = await getCurrentTask(session.userId)

  if (!tarea) {
    if (input === '0') return null as any
    if (input === '1') {
      await navigateTo(session, 'tareas_lista', { page: 1 })
      return buildTareasLista({ ...session, currentMenu: 'tareas_lista', contextData: { page: 1 } })
    }
    if (input === '2') {
      await navigateTo(session, 'asistencia', {})
      const { buildAsistenciaMenu } = await import('./asistencia')
      return buildAsistenciaMenu({ ...session, currentMenu: 'asistencia', contextData: {} })
    }
    if (input === '3') {
      await navigateTo(session, 'rondas_lista', { page: 1 })
      const { buildRondasLista } = await import('./rondas')
      return buildRondasLista({ ...session, currentMenu: 'rondas_lista', contextData: { page: 1 } })
    }
    return invalidOption(await buildTareaActual(session))
  }

  if (input === '0') return null as any

  if (input === '4') {
    await navigateTo(session, 'tareas_lista', { page: 1 })
    return buildTareasLista({ ...session, currentMenu: 'tareas_lista', contextData: { page: 1 } })
  }

  if (tarea.origen === 'operacion') {
    const task = await getOperationalTaskById(tarea.id)
    if (!task) return errorMsg('No se encontró la tarea actual.')
    try {
      return await handleOperacionalActual(session, task, input)
    } catch (e) {
      return errorMsg(`Ocurrió un error al procesar la tarea. Escribí "menú" para volver al inicio.`)
    }
  }

  const reporte = await getReporteById(tarea.id)
  if (!reporte) return errorMsg('No se encontró la tarea actual.')
  try {
    return await handleReclamoActual(session, reporte, input)
  } catch (e) {
    return errorMsg(`Ocurrió un error al procesar la tarea. Escribí "menú" para volver al inicio.`)
  }
}

function buildReclamoActual(reporte: any): string {
  const pendConf = reporte.asignacionEstado === 'pendiente_confirmacion'
  const tiempo = reporte.trabajoAcumuladoSegundos ?? 0

  const lines = [
    `🎯 *Tu tarea actual*`,
    SEP,
    `📌 Rec. #${reporte.id} — ${reporte.titulo}`,
    `📍 ${reporte.local} (planta ${reporte.planta})`,
    `${prioEmoji(reporte.prioridad)} Prioridad: *${reporte.prioridad.toUpperCase()}*`,
    tiempo > 0 ? `⏱️ Tiempo trabajado: ${fmtDuration(tiempo)}` : '',
    `📝 ${reporte.descripcion}`,
    SEP,
  ].filter(Boolean)

  if (pendConf) {
    lines.push(
      `Estado: ⚠️ Pendiente de confirmación`,
      `1️⃣  ✅ Aceptar e iniciar`,
      `2️⃣  ❌ No puedo tomarla`,
      `3️⃣  📄 Ver detalle completo`,
      `4️⃣  📋 Ver todas mis tareas`,
      `0️⃣  Volver`,
    )
    return lines.join('\n')
  }

  if (reporte.estado === 'pausado') {
    lines.push(
      `Estado: ⏸️ Pausada`,
      `1️⃣  ▶️ Retomar tarea`,
      `2️⃣  ✅ Finalizar tarea`,
      `3️⃣  📝 Agregar nota`,
      `4️⃣  📋 Ver todas mis tareas`,
      `0️⃣  Volver`,
    )
    return lines.join('\n')
  }

  if (reporte.estado === 'en_progreso') {
    lines.push(
      `Estado: ▶️ En progreso`,
      `1️⃣  ✅ Finalizar tarea`,
      `2️⃣  ⏸️ Pausar tarea`,
      `3️⃣  📝 Agregar nota`,
      `4️⃣  📋 Ver todas mis tareas`,
      `0️⃣  Volver`,
    )
    return lines.join('\n')
  }

  lines.push(
    `Estado: ${estadoEmoji(reporte.estado)} ${reporte.estado}`,
    `1️⃣  ▶️ Iniciar tarea`,
    `2️⃣  📄 Ver detalle completo`,
    `4️⃣  📋 Ver todas mis tareas`,
    `0️⃣  Volver`,
  )
  return lines.join('\n')
}

function buildOperacionalActual(task: any): string {
  const pendConf = task.estado === 'pendiente_confirmacion'
  const tiempo = task.tiempoTrabajadoSegundos ?? task.trabajoAcumuladoSegundos ?? 0

  const lines = [
    `🎯 *Tu tarea actual*`,
    SEP,
    `📌 Op. #${task.id} — ${task.titulo}`,
    `📍 ${task.ubicacion ?? 'Sin ubicación'}`,
    `${prioEmoji(task.prioridad)} Prioridad: *${task.prioridad.toUpperCase()}*`,
    tiempo > 0 ? `⏱️ Tiempo trabajado: ${fmtDuration(tiempo)}` : '',
    `📝 ${task.descripcion}`,
    task.checklistObjetivo ? `📋 Checklist: ${task.checklistObjetivo}` : '',
    SEP,
  ].filter(Boolean)

  if (pendConf) {
    lines.push(
      `Estado: ⚠️ Pendiente de confirmación`,
      `1️⃣  ✅ Aceptar e iniciar`,
      `2️⃣  ❌ No puedo tomarla`,
      `3️⃣  📄 Ver detalle completo`,
      `4️⃣  📋 Ver todas mis tareas`,
      `0️⃣  Volver`,
    )
    return lines.join('\n')
  }

  if (task.estado === 'pausada') {
    lines.push(
      `Estado: ⏸️ Pausada`,
      `1️⃣  ▶️ Retomar tarea`,
      `2️⃣  ✅ Finalizar tarea`,
      `3️⃣  📝 Agregar nota`,
      `4️⃣  📋 Ver todas mis tareas`,
      `0️⃣  Volver`,
    )
    return lines.join('\n')
  }

  lines.push(
    `Estado: ${estadoEmoji(normalizeEstado(task.estado))} ${task.estado}`,
    `1️⃣  ✅ Finalizar tarea`,
    `2️⃣  ⏸️ Pausar tarea`,
    `3️⃣  📝 Agregar nota`,
    `4️⃣  📋 Ver todas mis tareas`,
    `0️⃣  Volver`,
  )
  return lines.join('\n')
}

async function handleReclamoActual(session: BotSession, reporte: any, input: string): Promise<string> {
  const pendConf = reporte.asignacionEstado === 'pendiente_confirmacion'

  if (pendConf) {
    if (input === '1') return acceptCurrentReclamo(session, reporte)
    if (input === '2') return rejectCurrentReclamo(session, reporte)
    if (input === '3') {
      await navigateTo(session, 'tarea_detalle', { tareaId: reporte.id, origen: 'reclamo' })
      return buildTareaDetalle({ ...session, currentMenu: 'tarea_detalle', contextData: { tareaId: reporte.id, origen: 'reclamo' } })
    }
    return invalidOption(buildReclamoActual(reporte))
  }

  if (reporte.estado === 'pausado') {
    if (input === '1') return resumeCurrentReclamo(session, reporte)
    if (input === '2') return completeCurrentTask(session, reporte.id, 'reclamo')
    if (input === '3') {
      await navigateTo(session, 'tarea_nota_libre', { tareaId: reporte.id, origen: 'reclamo', pendingText: true })
      return `📝 Escribí la nota que querés agregar:`
    }
    return invalidOption(buildReclamoActual(reporte))
  }

  if (reporte.estado === 'en_progreso') {
    if (input === '1') return completeCurrentTask(session, reporte.id, 'reclamo')
    if (input === '2') {
      await navigateTo(session, 'tarea_pausa_motivo', { tareaId: reporte.id, origen: 'reclamo' })
      return buildPausaMotivo()
    }
    if (input === '3') {
      await navigateTo(session, 'tarea_nota_libre', { tareaId: reporte.id, origen: 'reclamo', pendingText: true })
      return `📝 Escribí la nota que querés agregar:`
    }
    return invalidOption(buildReclamoActual(reporte))
  }

  if (input === '1') return startCurrentReclamo(session, reporte)
  if (input === '2') {
    await navigateTo(session, 'tarea_detalle', { tareaId: reporte.id, origen: 'reclamo' })
    return buildTareaDetalle({ ...session, currentMenu: 'tarea_detalle', contextData: { tareaId: reporte.id, origen: 'reclamo' } })
  }
  return invalidOption(buildReclamoActual(reporte))
}

async function handleOperacionalActual(session: BotSession, task: any, input: string): Promise<string> {
  if (task.estado === 'pendiente_confirmacion') {
    if (input === '1') {
      try {
        await tasksService.acceptTask({ taskId: task.id, empleadoId: session.userId })
      } catch (error) {
        if (isOperationalTaskConflict(error)) {
          return buildOperationalTaskAcceptanceBlocked(task, buildOperacionalActual(task))
        }
        // Estado cambió desde que se mostró el menú (ya aceptada, cancelada, etc.)
        await navigateBack(session)
        return [
          `⚠️ No se pudo aceptar la tarea #${task.id}.`,
          `Es posible que el estado haya cambiado. Revisá tu lista de tareas.`,
          ...buildMainOptionsFooter(),
        ].join('\n')
      }
      await navigateBack(session)
      return [
        `✅ *Tarea #${task.id} aceptada.*`,
        `La dejamos en marcha para que sigas rápido.`,
        ...buildMainOptionsFooter(),
      ].join('\n')
    }
    if (input === '2') {
      try {
        await tasksService.rejectTask({ taskId: task.id, empleadoId: session.userId, note: 'Empleado no puede tomar la tarea' })
      } catch {
        await navigateBack(session)
        return [
          `⚠️ No se pudo rechazar la tarea #${task.id}. Es posible que el estado haya cambiado.`,
          ...buildMainOptionsFooter(),
        ].join('\n')
      }
      await navigateBack(session)
      return [
        `❌ *Tarea #${task.id} rechazada.*`,
        `Quedó liberada para reasignación.`,
        ...buildMainOptionsFooter(),
      ].join('\n')
    }
    if (input === '3') {
      await navigateTo(session, 'tarea_detalle', { tareaId: task.id, origen: 'operacion' })
      return buildTareaDetalle({ ...session, currentMenu: 'tarea_detalle', contextData: { tareaId: task.id, origen: 'operacion' } })
    }
    return invalidOption(buildOperacionalActual(task))
  }

  if (task.estado === 'pausada') {
    if (input === '1') {
      await tasksService.resumeTask({ taskId: task.id, empleadoId: session.userId })
      await navigateBack(session)
      return [
        `▶️ *Tarea #${task.id} retomada.*`,
        `Volvió a quedar como tu tarea principal.`,
        ...buildMainOptionsFooter(),
      ].join('\n')
    }
    if (input === '2') return completeCurrentTask(session, task.id, 'operacion')
    if (input === '3') {
      await navigateTo(session, 'tarea_nota_libre', { tareaId: task.id, origen: 'operacion', pendingText: true })
      return `📝 Escribí la nota que querés agregar:`
    }
    return invalidOption(buildOperacionalActual(task))
  }

  if (input === '1') return completeCurrentTask(session, task.id, 'operacion')
  if (input === '2') {
    await navigateTo(session, 'tarea_pausa_motivo', { tareaId: task.id, origen: 'operacion' })
    return buildPausaMotivo()
  }
  if (input === '3') {
    await navigateTo(session, 'tarea_nota_libre', { tareaId: task.id, origen: 'operacion', pendingText: true })
    return `📝 Escribí la nota que querés agregar:`
  }
  return invalidOption(buildOperacionalActual(task))
}

async function acceptCurrentReclamo(session: BotSession, reporte: any): Promise<string> {
  await iniciarTrabajoReporte(reporte.id)
  await actualizarReporte(reporte.id, {
    asignacionEstado: 'aceptada',
    asignacionRespondidaAt: new Date(),
  } as any)
  await crearActualizacion({
    reporteId: reporte.id,
    usuarioNombre: session.userName,
    tipo: 'timer',
    descripcion: `${session.userName} aceptó la tarea vía WhatsApp`,
    estadoAnterior: reporte.estado,
    estadoNuevo: 'en_progreso',
  } as any)
  await navigateBack(session)
  return [
    `✅ *Tarea #${reporte.id} aceptada.*`,
    `Ya quedó iniciada para que sigas sin pasos extra.`,
    ...buildMainOptionsFooter(),
  ].join('\n')
}

async function rejectCurrentReclamo(session: BotSession, reporte: any): Promise<string> {
  await actualizarReporte(reporte.id, {
    estado: 'pendiente',
    asignacionEstado: 'rechazada',
    asignadoA: null,
    asignadoId: null,
    asignacionRespondidaAt: new Date(),
    trabajoIniciadoAt: null,
  } as any)
  await crearActualizacion({
    reporteId: reporte.id,
    usuarioNombre: session.userName,
    tipo: 'asignacion',
    descripcion: `${session.userName} indicó que no puede tomar la tarea. Liberada para reasignación.`,
    estadoAnterior: reporte.estado,
    estadoNuevo: 'pendiente',
  } as any)
  notifyOwner({
    title: `Tarea rechazada — Reclamo #${reporte.id}`,
    content: `${session.userName} no puede tomarla. Disponible para reasignar.`,
  }).catch(console.error)
  await navigateBack(session)
  return [
    `❌ *Tarea #${reporte.id} rechazada.*`,
    `El encargado ya puede reasignarla.`,
    ...buildMainOptionsFooter(),
  ].join('\n')
}

async function startCurrentReclamo(session: BotSession, reporte: any): Promise<string> {
  await iniciarTrabajoReporte(reporte.id)
  await crearActualizacion({
    reporteId: reporte.id,
    usuarioNombre: session.userName,
    tipo: 'timer',
    descripcion: `${session.userName} inició la tarea vía WhatsApp`,
    estadoAnterior: reporte.estado,
    estadoNuevo: 'en_progreso',
  } as any)
  await navigateBack(session)
  return [
    `▶️ *Tarea #${reporte.id} iniciada.*`,
    `La dejamos corriendo como tu tarea principal.`,
    ...buildMainOptionsFooter(),
  ].join('\n')
}

async function resumeCurrentReclamo(session: BotSession, reporte: any): Promise<string> {
  await iniciarTrabajoReporte(reporte.id)
  await crearActualizacion({
    reporteId: reporte.id,
    usuarioNombre: session.userName,
    tipo: 'timer',
    descripcion: `${session.userName} retomó la tarea vía WhatsApp`,
    estadoAnterior: 'pausado',
    estadoNuevo: 'en_progreso',
  } as any)
  await navigateBack(session)
  return [
    `▶️ *Tarea #${reporte.id} retomada.*`,
    `Volvió a quedar como tu tarea principal.`,
    ...buildMainOptionsFooter(),
  ].join('\n')
}

async function completeCurrentTask(session: BotSession, tareaId: number, origen: 'reclamo' | 'operacion'): Promise<string> {
  if (origen === 'operacion') {
    let result: Awaited<ReturnType<typeof tasksService.finishTask>>
    try {
      result = await tasksService.finishTask({ taskId: tareaId, empleadoId: session.userId })
    } catch {
      await navigateBack(session)
      return [
        `⚠️ No se pudo completar la tarea #${tareaId}. Puede que el estado haya cambiado.`,
        ...buildMainOptionsFooter(),
      ].join('\n')
    }
    const tiempo = fmtDuration((result.task as any).tiempoTrabajadoSegundos ?? (result.task as any).trabajoAcumuladoSegundos ?? 0)
    await navigateBack(session)
    return [
      `🏁 *Operación #${tareaId} completada.*`,
      `⏱️ Tiempo total: *${tiempo}*`,
      ...buildMainOptionsFooter(),
    ].join('\n')
  }

  const updated = await completarTrabajoReporte(tareaId)
  const tiempo = fmtDuration(updated?.trabajoAcumuladoSegundos ?? 0)
  await crearActualizacion({
    reporteId: tareaId,
    usuarioNombre: session.userName,
    tipo: 'completado',
    descripcion: `${session.userName} completó la tarea vía WhatsApp. Tiempo: ${tiempo}`,
    estadoAnterior: 'en_progreso',
    estadoNuevo: 'completado',
  } as any)
  notifyOwner({
    title: `Tarea completada — Reclamo #${tareaId}`,
    content: `${session.userName}. Tiempo total: ${tiempo}`,
  }).catch(console.error)
  await navigateBack(session)
  return [
    `🏁 *Reclamo #${tareaId} completado.*`,
    `⏱️ Tiempo total: *${tiempo}*`,
    ...buildMainOptionsFooter(),
  ].join('\n')
}

// ─── LISTA DE TAREAS ─────────────────────────────────────────────────────────

export async function buildTareasLista(session: BotSession): Promise<string> {
  const tareas = await getAllTareasActivas(session.userId)
  const page = session.contextData.page ?? 1
  const paged = paginate(tareas, page, PAGE_SIZE)

  if (tareas.length === 0) {
    return [
      `📋 *Tus tareas*`,
      SEP,
      `✅ No tenés tareas pendientes por ahora.`,
      SEP,
      `0️⃣  Volver al menú principal`,
    ].join('\n')
  }

  const lines = [
    `📋 *Tus tareas* (${tareas.length} activa${tareas.length > 1 ? 's' : ''})`,
    SEP,
  ]

  paged.items.forEach((t, i) => {
    const num = i + 1
    const pendConf = t.asignacionEstado === 'pendiente_confirmacion'
    const estadoStr = pendConf
      ? '⚠️ Pendiente de confirmación'
      : `${estadoEmoji(t.estado)} ${t.estado.replace('_', ' ')}${t.tiempoSeg > 0 ? ` | ${fmtDuration(t.tiempoSeg)}` : ''}`
    lines.push(
      `${num}️⃣  ${prioEmoji(t.prioridad)} ${t.origen === 'operacion' ? 'Op.' : 'Rec.'} #${t.id} — ${t.titulo}`,
      `   📍 ${t.local} | ${estadoStr}`,
    )
  })

  lines.push(SEP)
  if (paged.hasPrev) lines.push(`8️⃣  ◀️ Página anterior`)
  if (paged.hasNext) lines.push(`9️⃣  ▶️ Ver más`)
  lines.push(`0️⃣  Volver`)

  return lines.join('\n')
}

export async function handleTareasLista(session: BotSession, input: string): Promise<string> {
  const tareas = await getAllTareasActivas(session.userId)
  const page = session.contextData.page ?? 1
  const paged = paginate(tareas, page, PAGE_SIZE)

  if (input === '8' && paged.hasPrev) {
    await navigateTo(session, 'tareas_lista', { page: page - 1 })
    const updated = { ...session, contextData: { ...session.contextData, page: page - 1 } }
    return buildTareasLista(updated)
  }
  if (input === '9' && paged.hasNext) {
    await navigateTo(session, 'tareas_lista', { page: page + 1 })
    const updated = { ...session, contextData: { ...session.contextData, page: page + 1 } }
    return buildTareasLista(updated)
  }

  const opt = parseMenuOption(input, paged.items.length)
  if (!opt || opt === 0) {
    if (input === '0') return null as any // volver al engine
    return invalidOption(await buildTareasLista(session))
  }

  const globalIndex = (page - 1) * PAGE_SIZE + opt - 1
  const tarea = tareas[globalIndex]
  if (!tarea) return invalidOption(await buildTareasLista(session))

  await navigateTo(session, 'tarea_detalle', {
    tareaId: tarea.id,
    origen: tarea.origen as string,
    page: 1,
  })
  const updated = { ...session, currentMenu: 'tarea_detalle', contextData: { tareaId: tarea.id, origen: tarea.origen } }
  return buildTareaDetalle(updated)
}

// ─── DETALLE DE TAREA ────────────────────────────────────────────────────────

export async function buildTareaDetalle(session: BotSession): Promise<string> {
  const { tareaId, origen } = session.contextData
  if (!tareaId) return errorMsg('No se encontró la tarea.')

  if (origen === 'operacion') {
    const task = await getOperationalTaskById(tareaId as number)
    if (!task) return errorMsg('Tarea no encontrada.')
    return buildOperacionalDetalle(task)
  }

  const reporte = await getReporteById(tareaId as number)
  if (!reporte) return errorMsg('Tarea no encontrada.')
  return buildReclamoDetalle(reporte)
}

function buildReclamoDetalle(r: any): string {
  const pendConf = r.asignacionEstado === 'pendiente_confirmacion'
  const tiempo = r.trabajoAcumuladoSegundos ?? 0

  const lines = [
    `📌 *Reclamo #${r.id}*`,
    SEP,
    `🔧 ${r.titulo}`,
    `📍 ${r.local} (planta ${r.planta})`,
    `${prioEmoji(r.prioridad)} Prioridad: *${r.prioridad.toUpperCase()}*`,
    `📝 ${r.descripcion}`,
    tiempo > 0 ? `⏱️ Tiempo trabajado: ${fmtDuration(tiempo)}` : '',
    SEP,
  ].filter(Boolean)

  if (pendConf) {
    lines.push(
      `¿Podés tomar esta tarea?`,
      `1️⃣  ✅ Sí, acepto`,
      `2️⃣  ❌ No puedo tomarla`,
      `0️⃣  Volver`,
    )
  } else if (r.estado === 'pausado') {
    lines.push(
      `Estado: ⏸️ Pausada | ${fmtDuration(tiempo)} acumulados`,
      SEP,
      `1️⃣  ▶️ Retomar tarea`,
      `2️⃣  ✅ Completar tarea`,
      `3️⃣  📝 Agregar nota`,
      `0️⃣  Volver`,
    )
  } else if (r.estado === 'en_progreso') {
    lines.push(
      `Estado: ▶️ En progreso`,
      SEP,
      `1️⃣  ✅ Completar tarea`,
      `2️⃣  ⏸️ Pausar tarea`,
      `3️⃣  📝 Reportar problema / nota`,
      `4️⃣  📄 Ver descripción completa`,
      `0️⃣  Volver`,
    )
  } else {
    lines.push(
      `Estado: ${estadoEmoji(r.estado)} ${r.estado}`,
      SEP,
      `1️⃣  ▶️ Iniciar tarea`,
      `2️⃣  📝 Agregar nota`,
      `0️⃣  Volver`,
    )
  }

  return lines.join('\n')
}

function buildOperacionalDetalle(t: any): string {
  const pendConf = t.estado === 'pendiente_confirmacion'
  const tiempo = (t.tiempoTrabajadoSegundos ?? t.trabajoAcumuladoSegundos ?? 0)

  const lines = [
    `📌 *Operación #${t.id}*`,
    SEP,
    `🔧 ${t.titulo}`,
    `📍 ${t.ubicacion ?? 'Sin ubicación'}`,
    `${prioEmoji(t.prioridad)} Prioridad: *${t.prioridad.toUpperCase()}*`,
    `📝 ${t.descripcion}`,
    t.checklistObjetivo ? `📋 Checklist: ${t.checklistObjetivo}` : '',
    tiempo > 0 ? `⏱️ Tiempo trabajado: ${fmtDuration(tiempo)}` : '',
    SEP,
  ].filter(Boolean)

  if (pendConf) {
    lines.push(
      `¿Podés tomar esta tarea?`,
      `1️⃣  ✅ Sí, acepto`,
      `2️⃣  ❌ No puedo tomarla`,
      `0️⃣  Volver`,
    )
  } else if (t.estado === 'pausada') {
    lines.push(
      `Estado: ⏸️ Pausada`,
      SEP,
      `1️⃣  ▶️ Retomar tarea`,
      `2️⃣  ✅ Completar tarea`,
      `3️⃣  📝 Agregar nota`,
      `0️⃣  Volver`,
    )
  } else {
    lines.push(
      `Estado: ${estadoEmoji(normalizeEstado(t.estado))} ${t.estado}`,
      SEP,
      `1️⃣  ✅ Completar tarea`,
      `2️⃣  ⏸️ Pausar tarea`,
      `3️⃣  📝 Reportar problema / nota`,
      `0️⃣  Volver`,
    )
  }

  return lines.join('\n')
}

// ─── ACCIONES SOBRE TAREA ────────────────────────────────────────────────────

export async function handleTareaDetalle(session: BotSession, input: string): Promise<string> {
  const { tareaId, origen } = session.contextData
  if (!tareaId) return errorMsg('No se encontró la tarea.')

  try {
    if (origen === 'operacion') {
      return await handleOperacionalDetalle(session, tareaId as number, input)
    }
    return await handleReclamoDetalle(session, tareaId as number, input)
  } catch (e) {
    return errorMsg(`Ocurrió un error al procesar la tarea. Escribí "menú" para volver al inicio.`)
  }
}

async function handleReclamoDetalle(session: BotSession, reporteId: number, input: string): Promise<string> {
  const reporte = await getReporteById(reporteId)
  if (!reporte) return errorMsg('Reclamo no encontrado.')

  const pendConf = reporte.asignacionEstado === 'pendiente_confirmacion'

  if (pendConf) {
    if (input === '1') return handleReclamoAceptar(session, reporte)
    if (input === '2') return handleReclamoRechazar(session, reporte)
    return invalidOption(buildReclamoDetalle(reporte))
  }

  if (reporte.estado === 'pausado') {
    if (input === '1') return handleReclamoRetomar(session, reporte)
    if (input === '2') {
      await navigateTo(session, 'tarea_confirmar_completar', { tareaId: reporteId, origen: 'reclamo' })
      return buildConfirmarCompletar(reporte.titulo)
    }
    if (input === '3') {
      await navigateTo(session, 'tarea_nota_libre', { tareaId: reporteId, origen: 'reclamo', pendingText: true })
      return `📝 Escribí la nota que querés agregar a la tarea:`
    }
    return invalidOption(buildReclamoDetalle(reporte))
  }

  if (reporte.estado === 'en_progreso') {
    if (input === '1') {
      await navigateTo(session, 'tarea_confirmar_completar', { tareaId: reporteId, origen: 'reclamo' })
      return buildConfirmarCompletar(reporte.titulo)
    }
    if (input === '2') {
      await navigateTo(session, 'tarea_pausa_motivo', { tareaId: reporteId, origen: 'reclamo' })
      return buildPausaMotivo()
    }
    if (input === '3') {
      await navigateTo(session, 'tarea_problema', { tareaId: reporteId, origen: 'reclamo' })
      return buildProblemaMenu()
    }
    if (input === '4') {
      return `📝 *Descripción completa:*\n\n${reporte.descripcion}\n\n${SEP}\n0️⃣  Volver`
    }
    return invalidOption(buildReclamoDetalle(reporte))
  }

  // pendiente / otros
  if (input === '1') return handleReclamoIniciar(session, reporte)
  if (input === '2') {
    await navigateTo(session, 'tarea_nota_libre', { tareaId: reporteId, origen: 'reclamo', pendingText: true })
    return `📝 Escribí la nota que querés agregar:`
  }
  return invalidOption(buildReclamoDetalle(reporte))
}

async function handleOperacionalDetalle(session: BotSession, taskId: number, input: string): Promise<string> {
  const task = await getOperationalTaskById(taskId)
  if (!task) return errorMsg('Tarea no encontrada.')

  const pendConf = task.estado === 'pendiente_confirmacion'

  if (pendConf) {
    if (input === '1') {
      try {
        await tasksService.acceptTask({ taskId, empleadoId: session.userId })
      } catch (error) {
        if (isOperationalTaskConflict(error)) {
          return buildOperationalTaskAcceptanceBlocked(task, buildOperacionalDetalle(task))
        }
        await navigateBack(session)
        return `⚠️ No se pudo aceptar la tarea #${taskId}. Es posible que el estado haya cambiado. Revisá tu lista.\n\n0️⃣  Volver a mis tareas`
      }
      await navigateBack(session)
      return `✅ *Tarea #${taskId} aceptada.*\nRegistramos el inicio de tu trabajo.\n\n0️⃣  Volver a mis tareas`
    }
    if (input === '2') {
      try {
        await tasksService.rejectTask({ taskId, empleadoId: session.userId, note: 'Empleado no puede tomar la tarea' })
      } catch {
        await navigateBack(session)
        return `⚠️ No se pudo rechazar la tarea #${taskId}. Es posible que el estado haya cambiado.\n\n0️⃣  Volver a mis tareas`
      }
      await navigateBack(session)
      return `❌ Tarea rechazada. Quedó disponible para reasignar.\n\n0️⃣  Volver a mis tareas`
    }
    return invalidOption(buildOperacionalDetalle(task))
  }

  if (task.estado === 'pausada') {
    if (input === '1') {
      await tasksService.resumeTask({ taskId, empleadoId: session.userId })
      await navigateBack(session)
      return `▶️ *Tarea #${taskId} retomada.*\n\n0️⃣  Volver a mis tareas`
    }
    if (input === '2') {
      await navigateTo(session, 'tarea_confirmar_completar', { tareaId: taskId, origen: 'operacion' })
      return buildConfirmarCompletar(task.titulo)
    }
    if (input === '3') {
      await navigateTo(session, 'tarea_nota_libre', { tareaId: taskId, origen: 'operacion', pendingText: true })
      return `📝 Escribí la nota que querés agregar:`
    }
    return invalidOption(buildOperacionalDetalle(task))
  }

  if (input === '1') {
    await navigateTo(session, 'tarea_confirmar_completar', { tareaId: taskId, origen: 'operacion' })
    return buildConfirmarCompletar(task.titulo)
  }
  if (input === '2') {
    await navigateTo(session, 'tarea_pausa_motivo', { tareaId: taskId, origen: 'operacion' })
    return buildPausaMotivo()
  }
  if (input === '3') {
    await navigateTo(session, 'tarea_problema', { tareaId: taskId, origen: 'operacion' })
    return buildProblemaMenu()
  }
  return invalidOption(buildOperacionalDetalle(task))
}

// ─── SUB-FLUJO: Aceptar / rechazar / iniciar reclamo ─────────────────────────

async function handleReclamoAceptar(session: BotSession, reporte: any): Promise<string> {
  await iniciarTrabajoReporte(reporte.id)
  await actualizarReporte(reporte.id, {
    asignacionEstado: 'aceptada',
    asignacionRespondidaAt: new Date(),
  } as any)
  await crearActualizacion({
    reporteId: reporte.id,
    usuarioNombre: session.userName,
    tipo: 'timer',
    descripcion: `${session.userName} aceptó la tarea vía WhatsApp`,
    estadoAnterior: reporte.estado,
    estadoNuevo: 'en_progreso',
  } as any)
  await navigateBack(session)
  return [
    `✅ *Tarea #${reporte.id} aceptada.*`,
    ``,
    `▶️ Registramos el inicio de tu trabajo en:`,
    `📍 *${reporte.titulo}* — ${reporte.local}`,
    ``,
    `Avisá cuando termines o necesites pausar.`,
    ``,
    `0️⃣  Volver a mis tareas`,
  ].join('\n')
}

async function handleReclamoRechazar(session: BotSession, reporte: any): Promise<string> {
  await actualizarReporte(reporte.id, {
    estado: 'pendiente',
    asignacionEstado: 'rechazada',
    asignadoA: null,
    asignadoId: null,
    asignacionRespondidaAt: new Date(),
    trabajoIniciadoAt: null,
  } as any)
  await crearActualizacion({
    reporteId: reporte.id,
    usuarioNombre: session.userName,
    tipo: 'asignacion',
    descripcion: `${session.userName} indicó que no puede tomar la tarea. Liberada para reasignación.`,
    estadoAnterior: reporte.estado,
    estadoNuevo: 'pendiente',
  } as any)
  notifyOwner({
    title: `Tarea rechazada — Reclamo #${reporte.id}`,
    content: `${session.userName} no puede tomarla. Disponible para reasignar.`,
  }).catch(console.error)
  await navigateBack(session)
  return `❌ *Tarea rechazada.*\nEl encargado fue notificado para reasignarla.\n\n0️⃣  Volver a mis tareas`
}

async function handleReclamoIniciar(session: BotSession, reporte: any): Promise<string> {
  await iniciarTrabajoReporte(reporte.id)
  await crearActualizacion({
    reporteId: reporte.id,
    usuarioNombre: session.userName,
    tipo: 'timer',
    descripcion: `${session.userName} inició la tarea vía WhatsApp`,
    estadoAnterior: reporte.estado,
    estadoNuevo: 'en_progreso',
  } as any)
  await navigateBack(session)
  return `▶️ *Tarea #${reporte.id} iniciada.*\nRegistramos el comienzo de tu trabajo.\n\n0️⃣  Volver a mis tareas`
}

async function handleReclamoRetomar(session: BotSession, reporte: any): Promise<string> {
  await iniciarTrabajoReporte(reporte.id)
  await crearActualizacion({
    reporteId: reporte.id,
    usuarioNombre: session.userName,
    tipo: 'timer',
    descripcion: `${session.userName} retomó la tarea vía WhatsApp`,
    estadoAnterior: 'pausado',
    estadoNuevo: 'en_progreso',
  } as any)
  await navigateBack(session)
  return `▶️ *Tarea #${reporte.id} retomada.*\n\n0️⃣  Volver a mis tareas`
}

// ─── SUB-FLUJO: Confirmar completar ──────────────────────────────────────────

function buildConfirmarCompletar(titulo: string): string {
  return [
    `¿Confirmás que la tarea está completada?`,
    SEP,
    `🔧 ${titulo}`,
    SEP,
    `1️⃣  ✅ Sí, completar`,
    `2️⃣  ❌ Cancelar`,
  ].join('\n')
}

export async function handleConfirmarCompletar(session: BotSession, input: string): Promise<string> {
  const { tareaId, origen } = session.contextData
  if (!tareaId) return errorMsg('No se encontró la tarea.')

  if (input === '2') {
    await navigateBack(session)
    return await buildTareaDetalle({ ...session, currentMenu: 'tarea_detalle' })
  }
  if (input !== '1') {
    const titulo = origen === 'operacion'
      ? (await getOperationalTaskById(tareaId as number))?.titulo ?? 'Tarea'
      : (await getReporteById(tareaId as number))?.titulo ?? 'Tarea'
    return invalidOption(buildConfirmarCompletar(titulo))
  }

  if (origen === 'operacion') {
    let result: Awaited<ReturnType<typeof tasksService.finishTask>>
    try {
      result = await tasksService.finishTask({ taskId: tareaId as number, empleadoId: session.userId })
    } catch {
      await navigateTo(session, 'tareas_lista', { page: 1 })
      return `⚠️ No se pudo completar la tarea #${tareaId}. Puede que el estado haya cambiado.\n\n0️⃣  Volver a mis tareas`
    }
    const tiempo = fmtDuration((result.task as any).tiempoTrabajadoSegundos ?? (result.task as any).trabajoAcumuladoSegundos ?? 0)
    await navigateTo(session, 'tareas_lista', { page: 1 })
    return [
      `🏁 *Operación #${tareaId} completada.*`,
      `⏱️ Tiempo total: *${tiempo}*`,
      ``,
      `¡Buen trabajo!`,
      ``,
      `0️⃣  Volver a mis tareas`,
    ].join('\n')
  }

  // reclamo
  const updated = await completarTrabajoReporte(tareaId as number)
  const tiempo = fmtDuration(updated?.trabajoAcumuladoSegundos ?? 0)
  await crearActualizacion({
    reporteId: tareaId,
    usuarioNombre: session.userName,
    tipo: 'completado',
    descripcion: `${session.userName} completó la tarea vía WhatsApp. Tiempo: ${tiempo}`,
    estadoAnterior: 'en_progreso',
    estadoNuevo: 'completado',
  } as any)
  notifyOwner({
    title: `Tarea completada — Reclamo #${tareaId}`,
    content: `${session.userName}. Tiempo total: ${tiempo}`,
  }).catch(console.error)
  await navigateTo(session, 'tareas_lista', { page: 1 })
  return [
    `🏁 *Reclamo #${tareaId} completado.*`,
    `⏱️ Tiempo total: *${tiempo}*`,
    ``,
    `¡Buen trabajo!`,
    ``,
    `0️⃣  Volver a mis tareas`,
  ].join('\n')
}

// ─── SUB-FLUJO: Pausa con motivo ─────────────────────────────────────────────

function buildPausaMotivo(): string {
  return [
    `⏸️ *¿Por qué pausás la tarea?*`,
    SEP,
    `1️⃣  🔩 Espero materiales / herramientas`,
    `2️⃣  🍽️ Corte de almuerzo`,
    `3️⃣  👥 Requiere más personal`,
    `4️⃣  🚪 Sin acceso al local`,
    `5️⃣  ✏️ Otro motivo (escribir)`,
    `0️⃣  Cancelar`,
  ].join('\n')
}

const MOTIVOS_PAUSA: Record<string, string> = {
  '1': 'Espera de materiales / herramientas',
  '2': 'Corte de almuerzo',
  '3': 'Requiere más personal',
  '4': 'Sin acceso al local',
}

export async function handlePausaMotivo(session: BotSession, input: string): Promise<string> {
  const { tareaId, origen } = session.contextData
  if (!tareaId) return errorMsg('No se encontró la tarea.')

  if (input === '5') {
    await navigateTo(session, 'tarea_pausa_motivo_libre', { ...session.contextData, pendingText: true })
    return `✏️ Escribí el motivo de la pausa brevemente:`
  }

  const motivo = MOTIVOS_PAUSA[input]
  if (!motivo) {
    if (input === '0') {
      await navigateBack(session)
      return await buildTareaDetalle({ ...session, currentMenu: 'tarea_detalle' })
    }
    return invalidOption(buildPausaMotivo())
  }

  return ejecutarPausa(session, tareaId as number, origen as string, motivo)
}

export async function handlePausaMotivoLibre(session: BotSession, texto: string): Promise<string> {
  const { tareaId, origen } = session.contextData
  if (!tareaId) return errorMsg('No se encontró la tarea.')
  return ejecutarPausa(session, tareaId as number, origen as string, texto.substring(0, 200))
}

async function ejecutarPausa(session: BotSession, tareaId: number, origen: string, motivo: string): Promise<string> {
  if (origen === 'operacion') {
    try {
      await tasksService.pauseTask({ taskId: tareaId, empleadoId: session.userId })
    } catch {
      await navigateTo(session, 'tareas_lista', { page: 1 })
      return `⚠️ No se pudo pausar la tarea #${tareaId}. Puede que el estado haya cambiado.\n\n0️⃣  Volver a mis tareas`
    }
  } else {
    await pausarTrabajoReporte(tareaId)
    await crearActualizacion({
      reporteId: tareaId,
      usuarioNombre: session.userName,
      tipo: 'timer',
      descripcion: `${session.userName} pausó la tarea. Motivo: ${motivo}`,
      estadoAnterior: 'en_progreso',
      estadoNuevo: 'pausado',
    } as any)
  }
  await navigateTo(session, 'tareas_lista', { page: 1 })
  return [
    `⏸️ *Tarea #${tareaId} pausada.*`,
    `📝 Motivo: ${motivo}`,
    ``,
    `Avisá cuando puedas retomar.`,
    ``,
    `0️⃣  Volver a mis tareas`,
  ].join('\n')
}

// ─── SUB-FLUJO: Reportar problema / nota ─────────────────────────────────────

function buildProblemaMenu(): string {
  return [
    `📝 *¿Qué querés reportar?*`,
    SEP,
    `1️⃣  🔩 Problema con materiales`,
    `2️⃣  👥 Necesito ayuda de otro empleado`,
    `3️⃣  🚪 Acceso bloqueado al local`,
    `4️⃣  ⚡ Problema eléctrico / técnico adicional`,
    `5️⃣  ✏️ Otro (escribir nota)`,
    `0️⃣  Cancelar`,
  ].join('\n')
}

const PROBLEMAS: Record<string, string> = {
  '1': 'Problema con materiales',
  '2': 'Necesita ayuda de otro empleado',
  '3': 'Acceso bloqueado al local',
  '4': 'Problema eléctrico / técnico adicional',
}

export async function handleProblema(session: BotSession, input: string): Promise<string> {
  const { tareaId, origen } = session.contextData
  if (!tareaId) return errorMsg('No se encontró la tarea.')

  if (input === '5') {
    await navigateTo(session, 'tarea_problema_libre', { ...session.contextData, pendingText: true })
    return `✏️ Escribí tu nota o reporte brevemente:`
  }

  const problema = PROBLEMAS[input]
  if (!problema) {
    if (input === '0') {
      await navigateBack(session)
      return await buildTareaDetalle({ ...session, currentMenu: 'tarea_detalle' })
    }
    return invalidOption(buildProblemaMenu())
  }

  return registrarNota(session, tareaId as number, origen as string, problema, true)
}

export async function handleProblemaLibre(session: BotSession, texto: string): Promise<string> {
  const { tareaId, origen } = session.contextData
  if (!tareaId) return errorMsg('No se encontró la tarea.')
  return registrarNota(session, tareaId as number, origen as string, texto.substring(0, 500), false)
}

export async function handleNotaLibre(session: BotSession, texto: string): Promise<string> {
  const { tareaId, origen } = session.contextData
  if (!tareaId) return errorMsg('No se encontró la tarea.')
  return registrarNota(session, tareaId as number, origen as string, texto.substring(0, 500), false)
}

async function registrarNota(
  session: BotSession,
  tareaId: number,
  origen: string,
  nota: string,
  notificarAdmin: boolean
): Promise<string> {
  if (origen === 'operacion') {
    const { addOperationalTaskEvent } = await import('../../../db')
    await addOperationalTaskEvent({
      tareaId,
      tipo: 'admin_update',
      actorTipo: 'employee',
      actorId: session.userId,
      actorNombre: session.userName,
      descripcion: nota,
      metadata: { source: 'whatsapp_menu' },
    })
  } else {
    await crearActualizacion({
      reporteId: tareaId,
      usuarioNombre: session.userName,
      tipo: 'progreso',
      descripcion: nota,
    } as any)
    if (notificarAdmin) {
      notifyOwner({
        title: `Reporte de problema — Reclamo #${tareaId}`,
        content: `${session.userName}: ${nota}`,
      }).catch(console.error)
    }
  }
  await navigateTo(session, 'tareas_lista', { page: 1 })
  return [
    `📝 *Nota registrada.*`,
    ``,
    `"${nota}"`,
    ``,
    notificarAdmin ? `⚠️ Se notificó al encargado.` : ``,
    ``,
    `0️⃣  Volver a mis tareas`,
  ].filter(l => l !== '').join('\n')
}
