/**
 * Menús principales por tipo de usuario.
 */
import { BotSession } from '../session'
import { SEP } from '../shared/guards'
import {
  getTareasEmpleado,
  listOperationalTasksByEmployee,
  getReportes,
  getEmpleadoAttendanceStatus,
  listUnassignedLeads,
} from '../../db'

// ─── Empleado ────────────────────────────────────────────────────────────────

export async function buildEmployeeMainMenu(session: BotSession): Promise<string> {
  // Contar tareas activas
  const [reclamos, operaciones] = await Promise.all([
    getTareasEmpleado(session.userId),
    listOperationalTasksByEmployee(session.userId),
  ])
  const tareasActivas = [
    ...reclamos,
    ...operaciones.filter(t => !['terminada', 'cancelada', 'rechazada'].includes(t.estado)),
  ].filter(t => !['completado', 'cancelado'].includes((t as any).estado ?? ''))

  const pendConf = tareasActivas.filter(
    t => (t as any).asignacionEstado === 'pendiente_confirmacion'
      || (t as any).estado === 'pendiente_confirmacion'
  ).length

  const countLabel = tareasActivas.length > 0
    ? ` (${tareasActivas.length} activa${tareasActivas.length > 1 ? 's' : ''}${pendConf > 0 ? `, ${pendConf} sin confirmar` : ''})`
    : ''

  return [
    `👷 *${session.userName}* — Menú principal`,
    SEP,
    `1️⃣  📋 Mis tareas${countLabel}`,
    `2️⃣  🕐 Registrar asistencia`,
    `3️⃣  🚻 Control de baños`,
    SEP,
    `0️⃣  ❓ Ayuda`,
  ].join('\n')
}

// ─── Admin / Gerente ──────────────────────────────────────────────────────────

export async function buildAdminMainMenu(session: BotSession): Promise<string> {
  const [reportes, leadsLibres] = await Promise.all([
    getReportes(),
    listUnassignedLeads(),
  ])
  const abiertos = reportes.filter(r => !['completado', 'cancelado'].includes(r.estado))
  const urgentes = abiertos.filter(r => r.prioridad === 'urgente' && !r.asignadoId)

  const resumen = abiertos.length > 0
    ? `📊 ${abiertos.length} abiertos${urgentes.length > 0 ? ` | 🔴 ${urgentes.length} urgente${urgentes.length > 1 ? 's' : ''} sin asignar` : ''}`
    : '✅ Sin reclamos abiertos'

  const leadsResumen = leadsLibres.length > 0
    ? `🎯 ${leadsLibres.length} lead${leadsLibres.length > 1 ? 's' : ''} sin asignar`
    : null

  return [
    `👔 *${session.userName}* — Panel gerente`,
    `🏢 Docks del Puerto`,
    SEP,
    resumen,
    leadsResumen,
    SEP,
    `1️⃣  📋 Ver reclamos pendientes`,
    `2️⃣  🔴 Ver urgentes sin asignar`,
    `3️⃣  📊 Estado general del día`,
    `4️⃣  🚻 Estado rondas de baños`,
    `5️⃣  ⚠️  Tareas vencidas (SLA)`,
    `6️⃣  🚻 Gestionar rondas de baños`,
    `7️⃣  🎯 Asignar lead de alquiler`,
    SEP,
    `0️⃣  ❓ Ayuda`,
  ].filter(Boolean).join('\n')
}

// ─── Ventas ──────────────────────────────────────────────────────────────────

export function buildSalesMainMenu(session: BotSession): string {
  return [
    `🎯 *${session.userName}* — Panel ventas`,
    `🏢 Docks del Puerto`,
    SEP,
    `1️⃣  📋 Mis leads asignados`,
    `2️⃣  ➕ Registrar nuevo lead`,
    `3️⃣  📊 Estado de mis leads`,
    SEP,
    `0️⃣  ❓ Ayuda`,
  ].join('\n')
}

// ─── Ayuda por tipo ──────────────────────────────────────────────────────────

export function buildHelpMessage(userType: 'employee' | 'admin' | 'sales' | 'public'): string {
  const base = [
    `❓ *Ayuda — Docks del Puerto*`,
    SEP,
    `• Ingresá el *número* de la opción que querés usar`,
    `• *0* siempre vuelve al menú anterior`,
    `• *menú* o *inicio* te trae al menú principal`,
    `• Si no respondés en 10 minutos, la sesión se reinicia`,
    SEP,
  ]

  if (userType === 'employee') {
    base.push(
      `📋 *Mis tareas:* ver, aceptar, completar y pausar tareas`,
      `🕐 *Asistencia:* registrar entrada, salida y almuerzo`,
      `🚻 *Control de baños:* confirmar rondas programadas`,
    )
  } else if (userType === 'admin') {
    base.push(
      `📋 *Reclamos:* ver, asignar y gestionar reclamos`,
      `📊 *Estado:* resumen del día y métricas`,
      `⚠️  *SLA:* tareas que superaron el tiempo límite`,
      `🚻 *Rondas:* asignar, reasignar y liberar rondas de baños`,
    )
  } else {
    base.push(
      `📋 *Leads:* ver y gestionar leads asignados`,
      `➕ *Nuevo lead:* registrar consulta de potencial locatario`,
    )
  }

  base.push(SEP, `0️⃣  Volver al menú principal`)
  return base.join('\n')
}
