/**
 * Flujo: Asignar nueva tarea a empleado — bot administrativo
 *
 * admin_nueva_tarea_p1  → elegir empleado (lista paginada)
 * admin_nueva_tarea_p2  → descripción de la tarea (texto libre)
 * admin_nueva_tarea_p3  → prioridad
 * admin_nueva_tarea_confirmar → confirmar y crear
 */

import { BotSession, navigateTo } from '../../session'
import { SEP, paginate, errorMsg } from '../../shared/guards'
import { getEmpleados, crearTareaOperativaManual, enqueueBotMessage } from '../../../db'

const PAGE_SIZE = 6

const PRIO_MAP: Record<string, string> = {
  baja: '🟢 Baja',
  media: '🟡 Media',
  alta: '🟠 Alta',
  urgente: '🔴 Urgente',
}

// ─── Paso 1: elegir empleado ──────────────────────────────────────────────────

export async function buildNuevaTareaP1(session: BotSession): Promise<string> {
  const empleados = await getEmpleados()
  const page = (session.contextData.page as number) ?? 1
  const paged = paginate(empleados, page, PAGE_SIZE)

  const lines = [
    `📋 *Nueva tarea — Elegir empleado*`,
    SEP,
  ]

  paged.items.forEach((e: any, i: number) => {
    const n = (page - 1) * PAGE_SIZE + i + 1
    lines.push(`${n}️⃣  👷 ${e.nombre}${e.especialidad ? ` — ${e.especialidad}` : ''}`)
  })

  lines.push(SEP)
  if (paged.hasPrev) lines.push(`8️⃣  ◀️ Anterior`)
  if (paged.hasNext) lines.push(`9️⃣  ▶️ Ver más`)
  lines.push(`0️⃣  Volver`)
  return lines.join('\n')
}

export async function handleNuevaTareaP1(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') return null

  const empleados = await getEmpleados()
  const page = (session.contextData.page as number) ?? 1
  const paged = paginate(empleados, page, PAGE_SIZE)

  if (input === '8' && paged.hasPrev) {
    await navigateTo(session, 'admin_nueva_tarea_p1', { page: page - 1 })
    return buildNuevaTareaP1({ ...session, contextData: { page: page - 1 } })
  }
  if (input === '9' && paged.hasNext) {
    await navigateTo(session, 'admin_nueva_tarea_p1', { page: page + 1 })
    return buildNuevaTareaP1({ ...session, contextData: { page: page + 1 } })
  }

  const n = parseInt(input, 10)
  const idx = (page - 1) * PAGE_SIZE + n - 1
  const empleado = !isNaN(n) && n >= 1 ? empleados[idx] : null

  if (!empleado) {
    return `❓ Opción no válida.\n\n${await buildNuevaTareaP1(session)}`
  }

  await navigateTo(session, 'admin_nueva_tarea_p2', {
    pendingText: true,
    tareaEmpleadoId: (empleado as any).id,
    tareaEmpleadoNombre: (empleado as any).nombre,
    tareaEmpleadoWaId: (empleado as any).waId ?? null,
  })
  return buildNuevaTareaP2((empleado as any).nombre)
}

// ─── Paso 2: descripción de la tarea ─────────────────────────────────────────

export function buildNuevaTareaP2(empleadoNombre?: string): string {
  return [
    `📋 *Nueva tarea${empleadoNombre ? ` — ${empleadoNombre}` : ''}*`,
    SEP,
    `¿Cuál es la tarea a realizar?`,
    `(ej: _Revisar iluminación piso 1_, _Limpiar depósito local 204_)`,
    SEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export async function handleNuevaTareaP2(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') return null
  if (input.trim().length < 4) {
    const nombre = session.contextData.tareaEmpleadoNombre as string
    return `⚠️ Descripción muy corta.\n\n${buildNuevaTareaP2(nombre)}`
  }

  await navigateTo(session, 'admin_nueva_tarea_p3', {
    tareaTitulo: input.trim(),
  })
  return buildNuevaTareaP3()
}

// ─── Paso 3: prioridad ────────────────────────────────────────────────────────

export function buildNuevaTareaP3(): string {
  return [
    `📋 *Nueva tarea — Prioridad*`,
    SEP,
    `1️⃣  🟢 Baja`,
    `2️⃣  🟡 Media`,
    `3️⃣  🟠 Alta`,
    `4️⃣  🔴 Urgente`,
    SEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export async function handleNuevaTareaP3(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') return null

  const prioMap: Record<string, 'baja' | 'media' | 'alta' | 'urgente'> = {
    '1': 'baja', '2': 'media', '3': 'alta', '4': 'urgente',
  }
  const prioridad = prioMap[input]
  if (!prioridad) return `❓ Opción no válida.\n\n${buildNuevaTareaP3()}`

  await navigateTo(session, 'admin_nueva_tarea_confirmar', { tareaPrioridad: prioridad })
  return buildNuevaTareaConfirmar(session)
}

// ─── Confirmación ─────────────────────────────────────────────────────────────

export function buildNuevaTareaConfirmar(session: BotSession): string {
  const ctx = session.contextData as Record<string, any>
  return [
    `📋 *Confirmar tarea*`,
    SEP,
    `👷 *Empleado:* ${ctx.tareaEmpleadoNombre ?? '—'}`,
    `📝 *Tarea:* ${ctx.tareaTitulo ?? '—'}`,
    `⚡ *Prioridad:* ${PRIO_MAP[ctx.tareaPrioridad] ?? ctx.tareaPrioridad}`,
    SEP,
    `1️⃣  ✅ Confirmar y asignar`,
    `2️⃣  ❌ Cancelar`,
  ].join('\n')
}

export async function handleNuevaTareaConfirmar(session: BotSession, input: string): Promise<string | null> {
  if (input === '2' || input === '0') return null

  if (input !== '1') return `❓ Opción no válida.\n\n${buildNuevaTareaConfirmar(session)}`

  const ctx = session.contextData as Record<string, any>

  try {
    const tareaId = await crearTareaOperativaManual({
      titulo: String(ctx.tareaTitulo),
      ubicacion: 'General',
      prioridad: ctx.tareaPrioridad as 'baja' | 'media' | 'alta' | 'urgente',
      empleadoId: Number(ctx.tareaEmpleadoId),
      empleadoNombre: String(ctx.tareaEmpleadoNombre),
      empleadoWaId: ctx.tareaEmpleadoWaId ? String(ctx.tareaEmpleadoWaId) : null,
    })

    // Notificar al empleado
    if (ctx.tareaEmpleadoWaId) {
      await enqueueBotMessage(String(ctx.tareaEmpleadoWaId), [
        `📋 *Nueva tarea asignada*`,
        `🏢 Docks del Puerto`,
        SEP,
        `📝 ${ctx.tareaTitulo}`,
        `⚡ Prioridad: ${PRIO_MAP[ctx.tareaPrioridad]}`,
        SEP,
        `Respondé con *menú* para ver tus tareas.`,
      ].join('\n'))
    }

    await navigateTo(session, 'main', {})
    return [
      `✅ *¡Tarea asignada!*`,
      SEP,
      `👷 ${ctx.tareaEmpleadoNombre} recibió la tarea *#${tareaId}*.`,
      ctx.tareaEmpleadoWaId ? `📱 Se le envió una notificación por WhatsApp.` : `⚠️ No tiene WhatsApp registrado.`,
      SEP,
      `0️⃣  Volver al menú`,
    ].join('\n')
  } catch (e) {
    console.error('[bot/nueva_tarea]', e)
    return errorMsg('No se pudo crear la tarea. Intentá nuevamente.')
  }
}
