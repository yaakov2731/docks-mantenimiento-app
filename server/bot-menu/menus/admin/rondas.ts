/**
 * Menús de rondas modernas para administradores.
 * Opera sobre rondas_ocurrencia para compartir la misma fuente de verdad con app y bot.
 */
import { BotSession, navigateTo } from '../../session'
import { SEP, parseMenuOption, invalidOption, paginate, errorMsg, fmtDuration } from '../../shared/guards'
import { getEmpleados, getRoundOccurrenceById, getRoundTimeline, listRoundOccurrencesForEmployee } from '../../../db'
import { createRoundsService } from '../../../rounds/service'
import * as roundDb from '../../../db'

const roundsService = createRoundsService(roundDb as any)
const PAGE_SIZE = 5

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date())
}

function currentResponsible(item: any) {
  return item.responsableActualNombre ?? item.empleadoNombre ?? 'Sin asignar'
}

function assignmentStateLabel(item: any) {
  switch (item.asignacionEstado) {
    case 'sin_asignar': return 'Sin asignar'
    case 'asignada': return 'Asignada'
    case 'en_progreso': return 'En progreso'
    case 'completada': return 'Completada'
    case 'vencida': return 'Vencida'
    default: return item.asignacionEstado ?? 'Asignada'
  }
}

async function listRounds(scope: 'all' | 'unassigned' = 'all') {
  const rounds = await getRoundTimeline(todayKey())
  if (scope === 'unassigned') {
    return rounds.filter((item) => item.asignacionEstado === 'sin_asignar' || !item.responsableActualId)
  }
  return rounds
}

export async function buildAdminRondasMenu(_session: BotSession): Promise<string> {
  const rounds = await listRounds('all')
  const unassigned = rounds.filter((item) => item.asignacionEstado === 'sin_asignar' || !item.responsableActualId).length

  return [
    `🚻 *Gestión de rondas de baños*`,
    `🏢 Docks del Puerto`,
    SEP,
    `Rondas visibles hoy: ${rounds.length}`,
    `Sin asignar: ${unassigned}`,
    SEP,
    `1️⃣  📋 Ver rondas del día`,
    `2️⃣  ⚠️ Ver sin asignar`,
    `3️⃣  👀 Ver por empleado`,
    `4️⃣  🧭 Crear programación desde la app`,
    SEP,
    `0️⃣  Volver al menú principal`,
  ].join('\n')
}

export async function handleAdminRondas(session: BotSession, input: string): Promise<string> {
  if (input === '1') {
    await navigateTo(session, 'admin_rondas_unassigned', { page: 1, scope: 'all' })
    return buildAdminRondasUnassigned({ ...session, currentMenu: 'admin_rondas_unassigned', contextData: { page: 1, scope: 'all' } })
  }
  if (input === '2') {
    await navigateTo(session, 'admin_rondas_unassigned', { page: 1, scope: 'unassigned' })
    return buildAdminRondasUnassigned({ ...session, currentMenu: 'admin_rondas_unassigned', contextData: { page: 1, scope: 'unassigned' } })
  }
  if (input === '3') {
    await navigateTo(session, 'admin_rondas_by_employee', { page: 1 })
    return buildAdminRondasByEmployee({ ...session, currentMenu: 'admin_rondas_by_employee', contextData: { page: 1 } })
  }
  if (input === '4') {
    return buildAdminRondasCreate()
  }
  if (input === '0') return null as any

  return invalidOption(await buildAdminRondasMenu(session))
}

export async function buildAdminRondasUnassigned(session: BotSession): Promise<string> {
  const scope = session.contextData.scope === 'unassigned' ? 'unassigned' : 'all'
  const rounds = await listRounds(scope)
  const page = session.contextData.page ?? 1
  const paged = paginate(rounds, page, PAGE_SIZE)

  if (rounds.length === 0) {
    return [
      scope === 'unassigned' ? `🚻 *Rondas sin asignar*` : `🚻 *Rondas del día*`,
      SEP,
      scope === 'unassigned' ? `✅ No hay rondas sin asignar.` : `✅ No hay rondas visibles para hoy.`,
      SEP,
      `0️⃣  Volver`,
    ].join('\n')
  }

  const lines = [
    scope === 'unassigned' ? `🚻 *Rondas sin asignar* (${rounds.length})` : `🚻 *Rondas del día* (${rounds.length})`,
    SEP,
  ]

  paged.items.forEach((item, index) => {
    const num = (page - 1) * PAGE_SIZE + index + 1
    lines.push(
      `${num}️⃣  ${item.programadoAtLabel ?? '--:--'} — *${item.nombreRonda ?? 'Ronda operativa'}*`,
      `   👷 ${currentResponsible(item)} | ${assignmentStateLabel(item)}`,
      `   ⏱️ ${item.estado} | ${fmtDuration(Number(item.tiempoAcumuladoSegundos ?? 0))}`,
    )
  })

  lines.push(SEP)
  if (paged.hasPrev) lines.push(`8️⃣  ◀️ Anterior`)
  if (paged.hasNext) lines.push(`9️⃣  ▶️ Ver más`)
  lines.push(`0️⃣  Volver`)

  return lines.join('\n')
}

export async function handleAdminRondasUnassigned(session: BotSession, input: string): Promise<string> {
  const scope = session.contextData.scope === 'unassigned' ? 'unassigned' : 'all'
  const rounds = await listRounds(scope)
  const page = session.contextData.page ?? 1
  const paged = paginate(rounds, page, PAGE_SIZE)

  if (input === '8' && paged.hasPrev) {
    await navigateTo(session, 'admin_rondas_unassigned', { page: page - 1, scope })
    return buildAdminRondasUnassigned({ ...session, contextData: { page: page - 1, scope } })
  }
  if (input === '9' && paged.hasNext) {
    await navigateTo(session, 'admin_rondas_unassigned', { page: page + 1, scope })
    return buildAdminRondasUnassigned({ ...session, contextData: { page: page + 1, scope } })
  }
  if (input === '0') return null as any

  const opt = parseMenuOption(input, paged.items.length)
  if (!opt) return invalidOption(await buildAdminRondasUnassigned(session))

  const occurrence = paged.items[opt - 1]
  await navigateTo(session, 'admin_ronda_detalle', { rondaId: occurrence.id, scope, page })
  return buildAdminRondaDetalle(occurrence)
}

export function buildAdminRondaDetalle(ronda: any): string {
  const programmed = ronda.responsableProgramadoNombre ?? ronda.empleadoNombre ?? 'Sin programar'
  const current = currentResponsible(ronda)
  const sameResponsible = programmed === current

  return [
    `🚻 *Ronda #${ronda.id}*`,
    SEP,
    `Horario: ${ronda.programadoAtLabel ?? '--:--'}`,
    `Estado operativo: ${ronda.estado}`,
    `Asignación: ${assignmentStateLabel(ronda)}`,
    `Responsable actual: ${current}`,
    sameResponsible ? `Responsable programado: ${programmed}` : `Responsable programado: ${programmed} (difiere)`,
    `Tiempo acumulado: ${fmtDuration(Number(ronda.tiempoAcumuladoSegundos ?? 0))}`,
    ronda.nota ? `Nota: ${ronda.nota}` : null,
    SEP,
    `1️⃣  👷 ${ronda.responsableActualId ? 'Reasignar responsable' : 'Asignar responsable'}`,
    ronda.responsableActualId ? `2️⃣  🧹 Liberar ronda` : null,
    `0️⃣  Volver`,
  ].filter(Boolean).join('\n')
}

export async function handleAdminRondaDetalle(session: BotSession, input: string): Promise<string> {
  const occurrenceId = Number(session.contextData.rondaId)
  if (!Number.isFinite(occurrenceId)) return errorMsg('No se encontró la ronda.')

  const occurrence = await getRoundOccurrenceById(occurrenceId)
  if (!occurrence) return errorMsg('Ronda no encontrada.')

  if (input === '1') {
    await navigateTo(session, 'admin_rondas_assign', { rondaId: occurrenceId })
    return buildAdminRondasAssign(occurrence)
  }
  if (input === '2' && occurrence.responsableActualId) {
    try {
      const released = await roundsService.releaseOccurrence({
        occurrenceId,
        actor: { id: session.userId, name: session.userName },
      })
      return [
        `✅ Ronda liberada para reasignación.`,
        ``,
        buildAdminRondaDetalle(released),
      ].join('\n')
    } catch (error: any) {
      return errorMsg(error?.message ?? 'No se pudo liberar la ronda.')
    }
  }
  if (input === '0') return null as any

  return invalidOption(buildAdminRondaDetalle(occurrence))
}

export async function buildAdminRondasAssign(_ronda: any): Promise<string> {
  const empleados = (await getEmpleados()).filter((empleado: any) => empleado.activo)

  if (empleados.length === 0) {
    return `⚠️ No hay empleados activos registrados.\n\n0️⃣  Volver`
  }

  const lines = [
    `👷 *Seleccionar responsable*`,
    SEP,
  ]

  empleados.slice(0, 8).forEach((empleado: any, index: number) => {
    lines.push(`${index + 1}️⃣  ${empleado.nombre}${empleado.especialidad ? ` — ${empleado.especialidad}` : ''}`)
  })

  lines.push(SEP, `0️⃣  Cancelar`)
  return lines.join('\n')
}

export async function handleAdminRondasAssign(session: BotSession, input: string): Promise<string> {
  const occurrenceId = Number(session.contextData.rondaId)
  if (!Number.isFinite(occurrenceId)) return errorMsg('No se encontró la ronda.')
  if (input === '0') return null as any

  const empleados = (await getEmpleados()).filter((empleado: any) => empleado.activo).slice(0, 8)
  const opt = parseMenuOption(input, empleados.length)
  if (!opt) return invalidOption(await buildAdminRondasAssign({ id: occurrenceId }))

  const empleado = empleados[opt - 1]
  try {
    const occurrence = await roundsService.assignOccurrence({
      occurrenceId,
      empleadoId: empleado.id,
      actor: { id: session.userId, name: session.userName },
    })
    return [
      `✅ Responsable actualizado a *${empleado.nombre}*.`,
      ``,
      buildAdminRondaDetalle(occurrence),
    ].join('\n')
  } catch (error: any) {
    return errorMsg(error?.message ?? 'No se pudo asignar la ronda.')
  }
}

export async function buildAdminRondasCreate(): Promise<string> {
  return [
    `🧭 *Creación desde la app*`,
    SEP,
    `Las programaciones nuevas de rondas se crean desde el panel web en *Operaciones*.`,
    `Desde este chat podés ver, asignar, reasignar o liberar las ocurrencias del día.`,
    SEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export async function handleAdminRondasCreate(_session: BotSession, input: string): Promise<string> {
  if (input === '0') return null as any
  return invalidOption(await buildAdminRondasCreate())
}

export async function handleAdminRondasCreateCustom(_session: BotSession, _input: string): Promise<string> {
  return buildAdminRondasCreate()
}

export async function handleAdminRondasCreateLocation(_session: BotSession, _input: string): Promise<string> {
  return buildAdminRondasCreate()
}

export async function buildAdminRondasByEmployee(session: BotSession): Promise<string> {
  const empleados = (await getEmpleados()).filter((empleado: any) => empleado.activo)
  const page = session.contextData.page ?? 1
  const paged = paginate(empleados, page, PAGE_SIZE)

  const lines = [
    `🚻 *Rondas por empleado*`,
    SEP,
  ]

  for (const empleado of paged.items) {
    const rounds = await listRoundOccurrencesForEmployee(empleado.id)
    lines.push(
      `👷 ${empleado.nombre}`,
      `   Asignadas hoy: ${rounds.length}`,
      `   En curso: ${rounds.filter((item) => item.estado === 'en_progreso').length}`,
    )
  }

  lines.push(SEP)
  if (paged.hasPrev) lines.push(`8️⃣  ◀️ Anterior`)
  if (paged.hasNext) lines.push(`9️⃣  ▶️ Ver más`)
  lines.push(`0️⃣  Volver`)

  return lines.join('\n')
}

export async function handleAdminRondasByEmployee(session: BotSession, input: string): Promise<string> {
  const empleados = (await getEmpleados()).filter((empleado: any) => empleado.activo)
  const page = session.contextData.page ?? 1
  const paged = paginate(empleados, page, PAGE_SIZE)

  if (input === '8' && paged.hasPrev) {
    await navigateTo(session, 'admin_rondas_by_employee', { page: page - 1 })
    return buildAdminRondasByEmployee({ ...session, contextData: { page: page - 1 } })
  }
  if (input === '9' && paged.hasNext) {
    await navigateTo(session, 'admin_rondas_by_employee', { page: page + 1 })
    return buildAdminRondasByEmployee({ ...session, contextData: { page: page + 1 } })
  }
  if (input === '0') return null as any

  return invalidOption(await buildAdminRondasByEmployee(session))
}
