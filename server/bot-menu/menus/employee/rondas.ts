/**
 * Flujo de rondas modernas para empleados.
 * Usa rondas_ocurrencia y valida siempre contra el responsable actual.
 */
import { BotSession, navigateTo } from '../../session'
import { SEP, parseMenuOption, invalidOption, paginate, errorMsg, fmtDuration } from '../../shared/guards'
import { getRoundOccurrenceById, listRoundOccurrencesForEmployee } from '../../../db'
import { createRoundsService } from '../../../rounds/service'
import * as roundDb from '../../../db'

const roundsService = createRoundsService(roundDb as any)
const PAGE_SIZE = 5

function currentResponsible(round: any) {
  return round.responsableActualNombre ?? round.empleadoNombre ?? 'Sin asignar'
}

function getRondaEstadoLabel(estado: string) {
  switch (estado) {
    case 'pendiente': return '⏳ Pendiente'
    case 'en_progreso': return '🔄 En progreso'
    case 'pausada': return '⏸️ Pausada'
    case 'cumplido': return '✅ Cumplida'
    case 'cumplido_con_observacion': return '⚠️ Con observación'
    case 'vencido': return '❌ Vencida'
    default: return estado
  }
}

export async function buildRondasLista(session: BotSession): Promise<string> {
  const rounds = await listRoundOccurrencesForEmployee(session.userId)

  if (rounds.length === 0) {
    return [
      `🚻 *Control de baños*`,
      SEP,
      `✅ No tenés rondas asignadas ahora.`,
      `Cuando el admin te reasigne una ronda, la vas a ver acá.`,
      SEP,
      `0️⃣  Volver al menú principal`,
    ].join('\n')
  }

  const page = session.contextData.page ?? 1
  const paged = paginate(rounds, page, PAGE_SIZE)
  const lines = [
    `🚻 *Rondas asignadas* (${rounds.length})`,
    SEP,
  ]

  paged.items.forEach((round, index) => {
    const num = (page - 1) * PAGE_SIZE + index + 1
    lines.push(
      `${num}️⃣  ${round.programadoAtLabel ?? '--:--'} — *${round.nombreRonda ?? 'Ronda operativa'}*`,
      `   ${getRondaEstadoLabel(round.estado)} | ${fmtDuration(Number(round.tiempoAcumuladoSegundos ?? 0))}`,
      `   👷 ${currentResponsible(round)}`,
    )
  })

  lines.push(SEP)
  if (paged.hasPrev) lines.push(`8️⃣  ◀️ Anterior`)
  if (paged.hasNext) lines.push(`9️⃣  ▶️ Ver más`)
  lines.push(`0️⃣  Volver`)

  return lines.join('\n')
}

export async function handleRondasLista(session: BotSession, input: string): Promise<string> {
  const rounds = await listRoundOccurrencesForEmployee(session.userId)
  const page = session.contextData.page ?? 1
  const paged = paginate(rounds, page, PAGE_SIZE)

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

  const round = paged.items[opt - 1]
  await navigateTo(session, 'ronda_detalle', { rondaId: round.id })
  return buildRondaDetalle(round)
}

function buildRondaDetalle(round: any) {
  const lines = [
    `🚻 *${round.nombreRonda ?? 'Ronda operativa'}*`,
    `🕒 Programada: *${round.programadoAtLabel ?? '--:--'}*`,
    `👷 Responsable actual: *${currentResponsible(round)}*`,
    `⏱️ Tiempo acumulado: *${fmtDuration(Number(round.tiempoAcumuladoSegundos ?? 0))}*`,
    `📌 Estado: ${getRondaEstadoLabel(round.estado)}`,
    SEP,
  ]

  if (round.estado === 'pendiente') {
    lines.push(
      `1️⃣  ▶️ Iniciar ronda`,
      `2️⃣  ❌ No pude hacerla`,
      `0️⃣  Volver`,
    )
  } else if (round.estado === 'en_progreso') {
    lines.push(
      `1️⃣  ⏸️ Pausar ronda`,
      `2️⃣  ✅ Finalizar ronda`,
      `3️⃣  ⚠️ Finalizar con observación`,
      `4️⃣  ❌ No pude hacerla`,
      `0️⃣  Volver`,
    )
  } else if (round.estado === 'pausada') {
    lines.push(
      `1️⃣  ▶️ Reanudar ronda`,
      `2️⃣  ✅ Finalizar ronda`,
      `3️⃣  ⚠️ Finalizar con observación`,
      `4️⃣  ❌ No pude hacerla`,
      `0️⃣  Volver`,
    )
  } else {
    lines.push(`0️⃣  Volver`)
  }

  return lines.join('\n')
}

export async function handleRondaDetalle(session: BotSession, input: string): Promise<string> {
  const occurrenceId = Number(session.contextData.rondaId)
  if (!Number.isFinite(occurrenceId)) return errorMsg('No se encontró la ronda.')

  const round = await getRoundOccurrenceById(occurrenceId)
  if (!round) return errorMsg('Ronda no encontrada.')

  try {
    if (round.estado === 'pendiente') {
      if (input === '1') {
        const started = await roundsService.startOccurrence({ occurrenceId, empleadoId: session.userId })
        return buildRondaDetalle(started)
      }
      if (input === '2') {
        await navigateTo(session, 'ronda_rechazo', { rondaId: occurrenceId })
        return buildRondaRechazo()
      }
    }

    if (round.estado === 'en_progreso') {
      if (input === '1') {
        const paused = await roundsService.pauseOccurrence({ occurrenceId, empleadoId: session.userId })
        return buildRondaDetalle(paused)
      }
      if (input === '2') {
        const finished = await roundsService.finishOccurrence({ occurrenceId, empleadoId: session.userId })
        return `✅ Ronda finalizada.\n\n${buildRondaDetalle(finished)}`
      }
      if (input === '3') {
        await navigateTo(session, 'ronda_observacion', { rondaId: occurrenceId })
        return buildRondaObservacion()
      }
      if (input === '4') {
        await navigateTo(session, 'ronda_rechazo', { rondaId: occurrenceId })
        return buildRondaRechazo()
      }
    }

    if (round.estado === 'pausada') {
      if (input === '1') {
        const resumed = await roundsService.startOccurrence({ occurrenceId, empleadoId: session.userId })
        return buildRondaDetalle(resumed)
      }
      if (input === '2') {
        const finished = await roundsService.finishOccurrence({ occurrenceId, empleadoId: session.userId })
        return `✅ Ronda finalizada.\n\n${buildRondaDetalle(finished)}`
      }
      if (input === '3') {
        await navigateTo(session, 'ronda_observacion', { rondaId: occurrenceId })
        return buildRondaObservacion()
      }
      if (input === '4') {
        await navigateTo(session, 'ronda_rechazo', { rondaId: occurrenceId })
        return buildRondaRechazo()
      }
    }

    if (input === '0') return null as any
    return invalidOption(buildRondaDetalle(round))
  } catch (error: any) {
    return errorMsg(error?.message ?? 'No se pudo actualizar la ronda.')
  }
}

function buildRondaRechazo() {
  return [
    `❌ *No pude hacer la ronda*`,
    SEP,
    `1️⃣  Estoy ocupado con otra tarea`,
    `2️⃣  Salí a almorzar / no estoy disponible`,
    `3️⃣  Otro motivo`,
    `0️⃣  Cancelar`,
  ].join('\n')
}

export async function handleRondaRechazo(session: BotSession, input: string): Promise<string> {
  const occurrenceId = Number(session.contextData.rondaId)
  if (!Number.isFinite(occurrenceId)) return errorMsg('No se encontró la ronda.')
  if (input === '0') return null as any

  const reasons: Record<string, string> = {
    '1': 'Estoy ocupado con otra tarea',
    '2': 'Salí a almorzar / no estoy disponible',
    '3': 'Otro motivo',
  }
  const note = reasons[input]
  if (!note) return invalidOption(buildRondaRechazo())

  try {
    const outcome = await roundsService.markUnableToComplete({
      occurrenceId,
      empleadoId: session.userId,
      note,
    })
    return `⚠️ Se informó que no pudiste completar la ronda.\n\n${buildRondaDetalle(outcome)}`
  } catch (error: any) {
    return errorMsg(error?.message ?? 'No se pudo registrar el desvío.')
  }
}

function buildRondaObservacion() {
  return [
    `⚠️ *Observación de la ronda*`,
    SEP,
    `1️⃣  Falta papel / toallas`,
    `2️⃣  Falta jabón / desinfectante`,
    `3️⃣  Desperfecto en instalación`,
    `4️⃣  Suciedad excesiva`,
    `5️⃣  Escribir otra observación`,
    `0️⃣  Cancelar`,
  ].join('\n')
}

const OBSERVACIONES: Record<string, string> = {
  '1': 'Falta papel / toallas',
  '2': 'Falta jabón / desinfectante',
  '3': 'Desperfecto en instalación',
  '4': 'Suciedad excesiva',
}

export async function handleRondaObservacion(session: BotSession, input: string): Promise<string> {
  const occurrenceId = Number(session.contextData.rondaId)
  if (!Number.isFinite(occurrenceId)) return errorMsg('No se encontró la ronda.')

  if (input === '5') {
    await navigateTo(session, 'ronda_observacion_libre', { rondaId: occurrenceId, pendingText: true })
    return `✏️ Escribí la observación brevemente:`
  }
  if (input === '0') return null as any

  const note = OBSERVACIONES[input]
  if (!note) return invalidOption(buildRondaObservacion())

  try {
    const outcome = await roundsService.reportObservation({
      occurrenceId,
      empleadoId: session.userId,
      note,
    })
    return `✅ Ronda finalizada con observación.\n\n${buildRondaDetalle(outcome)}`
  } catch (error: any) {
    return errorMsg(error?.message ?? 'No se pudo registrar la observación.')
  }
}

export async function handleRondaObservacionLibre(session: BotSession, input: string): Promise<string> {
  const occurrenceId = Number(session.contextData.rondaId)
  if (!Number.isFinite(occurrenceId)) return errorMsg('No se encontró la ronda.')
  if (!input.trim()) return `✏️ Escribí la observación brevemente:`

  try {
    const outcome = await roundsService.reportObservation({
      occurrenceId,
      empleadoId: session.userId,
      note: input.trim(),
    })
    return `✅ Ronda finalizada con observación.\n\n${buildRondaDetalle(outcome)}`
  } catch (error: any) {
    return errorMsg(error?.message ?? 'No se pudo registrar la observación.')
  }
}
