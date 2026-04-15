/**
 * Menús de Rondas de Baños para administradores.
 */
import { BotSession, navigateTo, navigateBack } from '../../session'
import { SEP, parseMenuOption, invalidOption, paginate, errorMsg } from '../../shared/guards'
import { getEmpleados, getBathroomRoundTasksForEmployee, createBathroomRoundTask, assignBathroomRoundTask, getUnassignedBathroomRoundTasks } from '../../../db'

// ─── Menú principal de rondas ─────────────────────────────────────────────────

export async function buildAdminRondasMenu(session: BotSession): Promise<string> {
  const unassigned = await getUnassignedBathroomRoundTasks()

  return [
    `🚻 *Gestión de Rondas de Baños*`,
    `🏢 Docks del Puerto`,
    SEP,
    `Rondas sin asignar: ${unassigned.length}`,
    SEP,
    `1️⃣  📋 Ver rondas sin asignar`,
    `2️⃣  ➕ Crear nueva ronda`,
    `3️⃣  👀 Ver rondas por empleado`,
    SEP,
    `0️⃣  Volver al menú principal`,
  ].join('\n')
}

export async function handleAdminRondas(session: BotSession, input: string): Promise<string> {
  if (input === '1') {
    await navigateTo(session, 'admin_rondas_unassigned', { page: 1 })
    return buildAdminRondasUnassigned({ ...session, currentMenu: 'admin_rondas_unassigned', contextData: { page: 1 } })
  }
  if (input === '2') {
    await navigateTo(session, 'admin_rondas_create', {})
    return buildAdminRondasCreate()
  }
  if (input === '3') {
    await navigateTo(session, 'admin_rondas_by_employee', { page: 1 })
    return buildAdminRondasByEmployee({ ...session, currentMenu: 'admin_rondas_by_employee', contextData: { page: 1 } })
  }
  if (input === '0') return null as any

  return invalidOption(await buildAdminRondasMenu(session))
}

// ─── Rondas sin asignar ──────────────────────────────────────────────────────

export async function buildAdminRondasUnassigned(session: BotSession): Promise<string> {
  const rondas = await getUnassignedBathroomRoundTasks()
  const page = session.contextData.page ?? 1
  const paged = paginate(rondas, page, 5)

  if (rondas.length === 0) {
    return [
      `🚻 *Rondas sin asignar*`,
      SEP,
      `✅ No hay rondas sin asignar.`,
      SEP,
      `0️⃣  Volver`,
    ].join('\n')
  }

  const lines = [
    `🚻 *Rondas sin asignar* (${rondas.length})`,
    SEP,
  ]

  paged.items.forEach((r, i) => {
    const num = (page - 1) * 5 + i + 1
    lines.push(
      `${num}️⃣  *${r.titulo}*`,
      `   📍 ${r.ubicacion}`,
      `   🔑 ID: ${r.id}`,
    )
  })

  lines.push(SEP)
  if (paged.hasPrev) lines.push(`8️⃣  ◀️ Anterior`)
  if (paged.hasNext) lines.push(`9️⃣  ▶️ Ver más`)
  lines.push(`0️⃣  Volver`)

  return lines.join('\n')
}

export async function handleAdminRondasUnassigned(session: BotSession, input: string): Promise<string> {
  const rondas = await getUnassignedBathroomRoundTasks()
  const page = session.contextData.page ?? 1
  const paged = paginate(rondas, page, 5)

  if (input === '8' && paged.hasPrev) {
    await navigateTo(session, 'admin_rondas_unassigned', { page: page - 1 })
    return buildAdminRondasUnassigned({ ...session, contextData: { page: page - 1 } })
  }
  if (input === '9' && paged.hasNext) {
    await navigateTo(session, 'admin_rondas_unassigned', { page: page + 1 })
    return buildAdminRondasUnassigned({ ...session, contextData: { page: page + 1 } })
  }
  if (input === '0') return null as any

  const opt = parseMenuOption(input, paged.items.length)
  if (!opt) return invalidOption(await buildAdminRondasUnassigned(session))

  const ronda = paged.items[opt - 1]
  if (!ronda) return invalidOption(await buildAdminRondasUnassigned(session))

  await navigateTo(session, 'admin_rondas_assign', { rondaId: ronda.id })
  return buildAdminRondasAssign(ronda)
}

// ─── Asignar ronda ───────────────────────────────────────────────────────────

export function buildAdminRondasAssign(ronda: any): string {
  return [
    `🚻 *Asignar ronda*`,
    SEP,
    `*${ronda.titulo}*`,
    `📍 ${ronda.ubicacion}`,
    SEP,
    `¿A qué empleado asignar?`,
    `1️⃣  Juan Pérez`,
    `2️⃣  María García`,
    `3️⃣  Carlos López`,
    `4️⃣  Ana Rodríguez`,
    SEP,
    `0️⃣  Cancelar`,
  ].join('\n')
}

export async function handleAdminRondasAssign(session: BotSession, input: string): Promise<string> {
  const { rondaId } = session.contextData
  if (!rondaId) return errorMsg('No se encontró la ronda.')

  if (input === '0') return null as any

  // Mapear opciones a empleados (esto debería ser dinámico)
  const empleadosMap: Record<string, { id: number; nombre: string; waId?: string }> = {
    '1': { id: 1, nombre: 'Juan Pérez', waId: undefined },
    '2': { id: 2, nombre: 'María García', waId: undefined },
    '3': { id: 3, nombre: 'Carlos López', waId: undefined },
    '4': { id: 4, nombre: 'Ana Rodríguez', waId: undefined },
  }

  const empleado = empleadosMap[input]
  if (!empleado) return invalidOption(await buildAdminRondasAssign({ id: rondaId }))

  try {
    await assignBathroomRoundTask(rondaId as number, empleado.id, empleado.nombre, empleado.waId)
    return `✅ Ronda asignada exitosamente a ${empleado.nombre}.`
  } catch (error: any) {
    return errorMsg(`Error al asignar: ${error.message}`)
  }
}

// ─── Crear nueva ronda ───────────────────────────────────────────────────────

export function buildAdminRondasCreate(): string {
  return [
    `🚻 *Crear nueva ronda de baños*`,
    SEP,
    `Selecciona el tipo de ronda:`,
    `1️⃣  🏢 Baños Planta Baja`,
    `2️⃣  🏢 Baños Planta Alta`,
    `3️⃣  🏢 Todos los baños`,
    `4️⃣  ✏️  Personalizada`,
    SEP,
    `0️⃣  Cancelar`,
  ].join('\n')
}

export async function handleAdminRondasCreate(session: BotSession, input: string): Promise<string> {
  if (input === '0') return null as any

  const tipos: Record<string, { titulo: string; ubicacion: string }> = {
    '1': { titulo: 'Ronda Baños Planta Baja', ubicacion: 'Baños Planta Baja' },
    '2': { titulo: 'Ronda Baños Planta Alta', ubicacion: 'Baños Planta Alta' },
    '3': { titulo: 'Ronda General Baños', ubicacion: 'Todos los baños del local' },
  }

  if (input === '4') {
    await navigateTo(session, 'admin_rondas_create_custom', { pendingText: true })
    return `✏️  Escribe el título de la ronda:`
  }

  const tipo = tipos[input]
  if (!tipo) return invalidOption(buildAdminRondasCreate())

  try {
    const taskId = await createBathroomRoundTask({
      empleadoId: 0, // Sin asignar inicialmente
      empleadoNombre: '',
      titulo: tipo.titulo,
      descripcion: `Control de limpieza y mantenimiento de ${tipo.ubicacion}`,
      ubicacion: tipo.ubicacion,
      prioridad: 'media',
    })

    return `✅ Ronda creada exitosamente!\n\nID: ${taskId}\nAhora puedes asignarla desde "Ver rondas sin asignar".`
  } catch (error: any) {
    return errorMsg(`Error al crear: ${error.message}`)
  }
}

export async function handleAdminRondasCreateCustom(session: BotSession, input: string): Promise<string> {
  if (!input.trim()) return `✏️  Escribe el título de la ronda:`

  session.contextData.titulo = input.trim()
  await navigateTo(session, 'admin_rondas_create_location', { pendingText: true })
  return `📍 Escribe la ubicación:`
}

export async function handleAdminRondasCreateLocation(session: BotSession, input: string): Promise<string> {
  if (!input.trim()) return `📍 Escribe la ubicación:`

  const titulo = session.contextData.titulo
  if (!titulo) return errorMsg('Título no encontrado.')

  try {
    const taskId = await createBathroomRoundTask({
      empleadoId: 0,
      empleadoNombre: '',
      titulo: titulo as string,
      descripcion: `Control personalizado: ${input.trim()}`,
      ubicacion: input.trim(),
      prioridad: 'media',
    })

    return `✅ Ronda personalizada creada!\n\nID: ${taskId}\nAsígnala desde "Ver rondas sin asignar".`
  } catch (error: any) {
    return errorMsg(`Error al crear: ${error.message}`)
  }
}

// ─── Ver rondas por empleado ─────────────────────────────────────────────────

export async function buildAdminRondasByEmployee(session: BotSession): Promise<string> {
  const empleados = await getEmpleados()
  const page = session.contextData.page ?? 1
  const paged = paginate(empleados.filter(e => e.activo), page, 5)

  const lines = [
    `🚻 *Rondas por empleado*`,
    SEP,
  ]

  for (const empleado of paged.items) {
    const rondas = await getBathroomRoundTasksForEmployee(empleado.id)
    const activas = rondas.filter(r => !['terminada', 'cancelada', 'rechazada'].includes(r.estado))
    lines.push(
      `👷 ${empleado.nombre}`,
      `   Rondas activas: ${activas.length}`,
      `   Total: ${rondas.length}`,
    )
  }

  lines.push(SEP)
  if (paged.hasPrev) lines.push(`8️⃣  ◀️ Anterior`)
  if (paged.hasNext) lines.push(`9️⃣  ▶️ Ver más`)
  lines.push(`0️⃣  Volver`)

  return lines.join('\n')
}

export async function handleAdminRondasByEmployee(session: BotSession, input: string): Promise<string> {
  const empleados = await getEmpleados()
  const activos = empleados.filter(e => e.activo)
  const page = session.contextData.page ?? 1
  const paged = paginate(activos, page, 5)

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