/**
 * Flujo de Control de Baños (Rondas) para empleados.
 * Menús: rondas_lista → ronda_detalle → ronda_observacion
 */
import { BotSession, navigateTo, navigateBack } from '../../session'
import { SEP, parseMenuOption, invalidOption, paginate, errorMsg } from '../../shared/guards'
import { getBathroomRoundTasksForEmployee, acceptOperationalTask, persistOperationalTaskChange, addOperationalTaskEvent } from '../../../db'

function getRondaEstadoLabel(estado: string): string {
  switch (estado) {
    case 'pendiente_confirmacion': return '⏳ Pendiente de confirmación'
    case 'en_progreso': return '🔄 En progreso'
    case 'pausada': return '⏸️ Pausada'
    case 'terminada': return '✅ Completada'
    case 'cancelada': return '❌ Cancelada'
    case 'rechazada': return '🚫 Rechazada'
    default: return `Estado: ${estado}`
  }
}

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return `${safe}s`
}

// ─── Lista de rondas pendientes ───────────────────────────────────────────────

export async function buildRondasLista(session: BotSession): Promise<string> {
  const rondas = await getBathroomRoundTasksForEmployee(session.userId)

  if (rondas.length === 0) {
    return [
      `🚻 *Control de baños*`,
      SEP,
      `✅ No tenés rondas asignadas ahora.`,
      `Las rondas se asignan según el horario establecido.`,
      SEP,
      `0️⃣  Volver al menú principal`,
    ].join('\n')
  }

  const page = session.contextData.page ?? 1
  const paged = paginate(rondas, page, 5)
  const lines = [
    `🚻 *Rondas asignadas* (${rondas.length})`,
    SEP,
  ]

  paged.items.forEach((r, i) => {
    const num = (page - 1) * 5 + i + 1
    const estadoStr = getRondaEstadoLabel(r.estado)
    const tiempoStr = r.tiempoTrabajadoSegundos > 0
      ? ` (${formatDuration(r.tiempoTrabajadoSegundos)})`
      : ''
    lines.push(
      `${num}️⃣  *${r.titulo}*`,
      `   📍 ${r.ubicacion}`,
      `   ${estadoStr}${tiempoStr}`,
      `   🔑 ID: ${r.id}`,
    )
  })

  lines.push(SEP)
  if (paged.hasPrev) lines.push(`8️⃣  ◀️ Anterior`)
  if (paged.hasNext) lines.push(`9️⃣  ▶️ Ver más`)
  lines.push(`0️⃣  Volver`)

  return lines.join('\n')
}

export async function handleRondasLista(session: BotSession, input: string): Promise<string> {
  const rondas = await getBathroomRoundTasksForEmployee(session.userId)
  const page = session.contextData.page ?? 1
  const paged = paginate(rondas, page, 5)

  if (input === '8' && paged.hasPrev) {
    await navigateTo(session, 'rondas_lista', { page: page - 1 })
    return buildRondasLista({ ...session, contextData: { page: page - 1 } })
  }
  if (input === '9' && paged.hasNext) {
    await navigateTo(session, 'rondas_lista', { page: page + 1 })
    return buildRondasLista({ ...session, contextData: { page: page + 1 } })
  }
  if (input === '0') return null as any

  const opt = parseMenuOption(input, paged.items.length)
  if (!opt) return invalidOption(await buildRondasLista(session))

  const ronda = paged.items[opt - 1]
  if (!ronda) return invalidOption(await buildRondasLista(session))

  await navigateTo(session, 'ronda_detalle', { rondaId: ronda.id })
  return buildRondaDetalle(ronda)
}

// ─── Detalle de ronda ─────────────────────────────────────────────────────────

function buildRondaDetalle(ronda: any): string {
  const estado = ronda.estado
  const lines = [
    `🚻 *${ronda.titulo}*`,
    `📍 Ubicación: *${ronda.ubicacion}*`,
    `🔑 ID: *${ronda.id}*`,
    `⏱️ Tiempo trabajado: *${formatDuration(ronda.tiempoTrabajadoSegundos)}*`,
    SEP,
  ]

  if (estado === 'pendiente_confirmacion') {
    lines.push(
      `¿Aceptás esta ronda?`,
      `1️⃣  ✅ Sí, comenzar ahora`,
      `2️⃣  🚫 No puedo / Ocupado / Franco`,
      `0️⃣  Volver`
    )
  } else if (estado === 'en_progreso') {
    lines.push(
      `¿Qué querés hacer?`,
      `1️⃣  ✅ Completar ronda - Todo en orden`,
      `2️⃣  ⚠️  Completar con observación`,
      `3️⃣  ⏸️  Pausar temporalmente`,
      `0️⃣  Volver`
    )
  } else if (estado === 'pausada') {
    lines.push(
      `Ronda pausada. ¿Continuar?`,
      `1️⃣  ▶️  Reanudar ronda`,
      `2️⃣  ✅ Completar ronda - Todo en orden`,
      `3️⃣  ⚠️  Completar con observación`,
      `0️⃣  Volver`
    )
  } else {
    lines.push(
      `Estado: ${getRondaEstadoLabel(estado)}`,
      `0️⃣  Volver`
    )
  }

  return lines.join('\n')
}

export async function handleRondaDetalle(session: BotSession, input: string): Promise<string> {
  const { rondaId } = session.contextData
  if (!rondaId) return errorMsg('No se encontró la ronda.')

  // Obtener la tarea de ronda
  const rondas = await getBathroomRoundTasksForEmployee(session.userId)
  const ronda = rondas.find(r => r.id === rondaId)
  if (!ronda) return errorMsg('Ronda no encontrada.')

  const estado = ronda.estado

  if (estado === 'pendiente_confirmacion') {
    if (input === '1') {
      // Aceptar y comenzar
      try {
        await acceptOperationalTask(rondaId as number, session.userId)
        // Refrescar la ronda
        const rondasActualizadas = await getBathroomRoundTasksForEmployee(session.userId)
        const rondaActualizada = rondasActualizadas.find(r => r.id === rondaId)
        return buildRondaDetalle(rondaActualizada || ronda)
      } catch (error: any) {
        return errorMsg(`Error al aceptar la ronda: ${error.message}`)
      }
    }
    if (input === '2') {
      // Rechazar
      await navigateTo(session, 'ronda_rechazo', { rondaId })
      return buildRondaRechazo()
    }
    if (input === '0') return null as any
  } else if (estado === 'en_progreso') {
    if (input === '1') {
      // Completar OK
      return await completarRonda(session, rondaId as number, 'Todo en orden')
    }
    if (input === '2') {
      // Completar con observación
      await navigateTo(session, 'ronda_observacion', { rondaId })
      return buildRondaObservacion()
    }
    if (input === '3') {
      // Pausar
      try {
        const tasksService = { pauseTask: async (input: any) => {
          const now = new Date()
          await persistOperationalTaskChange(rondaId as number, {
            estado: 'pausada',
            trabajoAcumuladoSegundos: ronda.tiempoTrabajadoSegundos,
            trabajoIniciadoAt: null,
            pausadoAt: now,
          }, [{
            tareaId: rondaId as number,
            tipo: 'pausa',
            actorTipo: 'employee',
            actorId: session.userId,
            actorNombre: session.userName,
            descripcion: 'Ronda pausada por el empleado',
            createdAt: now,
          }])
        }}
        await tasksService.pauseTask({ taskId: rondaId, empleadoId: session.userId })
        // Refrescar
        const rondasActualizadas = await getBathroomRoundTasksForEmployee(session.userId)
        const rondaActualizada = rondasActualizadas.find(r => r.id === rondaId)
        return buildRondaDetalle(rondaActualizada || ronda)
      } catch (error: any) {
        return errorMsg(`Error al pausar: ${error.message}`)
      }
    }
    if (input === '0') return null as any
  } else if (estado === 'pausada') {
    if (input === '1') {
      // Reanudar
      try {
        const tasksService = { resumeTask: async (input: any) => {
          const now = new Date()
          await persistOperationalTaskChange(rondaId as number, {
            estado: 'en_progreso',
            trabajoIniciadoAt: now,
            pausadoAt: null,
          }, [{
            tareaId: rondaId as number,
            tipo: 'reanudar',
            actorTipo: 'employee',
            actorId: session.userId,
            actorNombre: session.userName,
            descripcion: 'Ronda reanudada',
            createdAt: now,
          }])
        }}
        await tasksService.resumeTask({ taskId: rondaId, empleadoId: session.userId })
        // Refrescar
        const rondasActualizadas = await getBathroomRoundTasksForEmployee(session.userId)
        const rondaActualizada = rondasActualizadas.find(r => r.id === rondaId)
        return buildRondaDetalle(rondaActualizada || ronda)
      } catch (error: any) {
        return errorMsg(`Error al reanudar: ${error.message}`)
      }
    }
    if (input === '2') {
      // Completar OK
      return await completarRonda(session, rondaId as number, 'Todo en orden')
    }
    if (input === '3') {
      // Completar con observación
      await navigateTo(session, 'ronda_observacion', { rondaId })
      return buildRondaObservacion()
    }
    if (input === '0') return null as any
  }

  return invalidOption(buildRondaDetalle(ronda))
}

// ─── Sub-flujo: Rechazo ──────────────────────────────────────────────────────

function buildRondaRechazo(): string {
  return [
    `🚫 *¿Por qué no podés hacer la ronda?*`,
    SEP,
    `1️⃣  Estoy ocupado con otra tarea`,
    `2️⃣  Estoy de franco`,
    `3️⃣  No puedo (otro motivo)`,
    `0️⃣  Cancelar`,
  ].join('\n')
}

export async function handleRondaRechazo(session: BotSession, input: string): Promise<string> {
  const { rondaId } = session.contextData
  if (!rondaId) return errorMsg('No se encontró la ronda.')

  const motivos: Record<string, string> = {
    '1': 'Empleado indicó que está ocupado',
    '2': 'Empleado indicó que está de franco',
    '3': 'Empleado indicó que no puede',
  }

  const motivo = motivos[input]
  if (!motivo) {
    if (input === '0') return null as any
    return invalidOption(buildRondaRechazo())
  }

  try {
    const now = new Date()
    await persistOperationalTaskChange(rondaId as number, {
      estado: 'rechazada',
    }, [{
      tareaId: rondaId as number,
      tipo: 'rechazo',
      actorTipo: 'employee',
      actorId: session.userId,
      actorNombre: session.userName,
      descripcion: motivo,
      createdAt: now,
    }])

    return `✅ Ronda rechazada. Será reasignada a otro empleado.`
  } catch (error: any) {
    return errorMsg(`Error al rechazar: ${error.message}`)
  }
}

// ─── Sub-flujo: Observación ──────────────────────────────────────────────────

function buildRondaObservacion(): string {
  return [
    `⚠️  *¿Qué observaste en la ronda?*`,
    SEP,
    `1️⃣  🧻 Falta papel / toallas`,
    `2️⃣  🧴 Falta jabón / desinfectante`,
    `3️⃣  🔧 Desperfecto (canilla, inodoro, luz)`,
    `4️⃣  🧹 Suciedad excesiva`,
    `5️⃣  ✏️  Otra observación (escribir)`,
    `0️⃣  Cancelar`,
  ].join('\n')
}

const OBSERVACIONES: Record<string, string> = {
  '1': 'Falta papel / toallas',
  '2': 'Falta jabón / desinfectante',
  '3': 'Desperfecto en instalación (canilla, inodoro o luz)',
  '4': 'Suciedad excesiva',
}

export async function handleRondaObservacion(session: BotSession, input: string): Promise<string> {
  const { rondaId } = session.contextData
  if (!rondaId) return errorMsg('No se encontró la ronda.')

  if (input === '5') {
    await navigateTo(session, 'ronda_observacion_libre', { rondaId, pendingText: true })
    return `✏️  Escribí la observación brevemente:`
  }

  const obs = OBSERVACIONES[input]
  if (!obs) {
    if (input === '0') return null as any
    return invalidOption(buildRondaObservacion())
  }

  return await completarRonda(session, rondaId as number, obs)
}

export async function handleRondaObservacionLibre(session: BotSession, input: string): Promise<string> {
  const { rondaId } = session.contextData
  if (!rondaId) return errorMsg('No se encontró la ronda.')

  if (!input.trim()) return `✏️  Escribí la observación brevemente:`

  return await completarRonda(session, rondaId as number, input.trim())
}

// ─── Función auxiliar para completar ronda ───────────────────────────────────

async function completarRonda(session: BotSession, rondaId: number, observacion: string): Promise<string> {
  try {
    const tasksService = { finishTask: async (input: any) => {
      const now = new Date()
      await persistOperationalTaskChange(rondaId, {
        estado: 'terminada',
        terminadoAt: now,
      }, [{
        tareaId: rondaId,
        tipo: 'terminacion',
        actorTipo: 'employee',
        actorId: session.userId,
        actorNombre: session.userName,
        descripcion: `Ronda completada: ${observacion}`,
        metadata: { observacion },
        createdAt: now,
      }])
    }}
    await tasksService.finishTask({ taskId: rondaId, empleadoId: session.userId, note: observacion })

    return `✅ Ronda completada exitosamente!\n\nObservación: ${observacion}`
  } catch (error: any) {
    return errorMsg(`Error al completar: ${error.message}`)
  }
}
