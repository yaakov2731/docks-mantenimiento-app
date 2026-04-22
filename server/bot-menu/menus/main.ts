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

  return [
    `👔 Hola, ${session.userName}. Panel de administración`,
    `🏢 Docks del Puerto`,
    ``,
    `📋 Abiertos: ${abiertos.length} | 🔴 Urgentes: ${urgentes.length} | 🎯 Leads: ${leadsLibres.length}`,
    ``,
    `Elegí un área:`,
    `1️⃣  Reclamos`,
    `2️⃣  Operación diaria`,
    `3️⃣  Rondas de baños`,
    `4️⃣  Comercial`,
    ``,
    `0️⃣  Ayuda`,
  ].join('\n')
}

export function buildAdminReclamosMenu(_session: BotSession): string {
  return [
    `📋 *Reclamos*`,
    `🏢 Docks del Puerto`,
    SEP,
    `1️⃣  Ver pendientes`,
    `2️⃣  Urgentes sin asignar`,
    `3️⃣  Sin asignar`,
    `4️⃣  SLA vencidos`,
    SEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export function buildAdminOperationMenu(_session: BotSession): string {
  return [
    `📊 *Operación diaria*`,
    `🏢 Docks del Puerto`,
    SEP,
    `1️⃣  Estado general del día`,
    `2️⃣  Asignar tarea a empleado`,
    SEP,
    `0️⃣  Volver`,
  ].join('\n')
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
