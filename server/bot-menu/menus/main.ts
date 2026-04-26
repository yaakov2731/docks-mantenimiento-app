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

function isEmployeeTaskClosed(task: any): boolean {
  const estado = (task as any).estado ?? ''
  return ['completado', 'cancelado', 'terminada', 'rechazada'].includes(estado)
}

function isPendingConfirmation(task: any): boolean {
  return (task as any).asignacionEstado === 'pendiente_confirmacion'
    || (task as any).estado === 'pendiente_confirmacion'
}

function employeeTaskRank(task: any): number {
  if (isPendingConfirmation(task)) return 0

  switch ((task as any).estado) {
    case 'en_progreso': return 1
    case 'pausado':
    case 'pausada': return 2
    case 'pendiente': return 3
    case 'pendiente_asignacion': return 4
    default: return 5
  }
}

function buildFeaturedTaskLabel(task: any): string {
  const isOperation = task.ubicacion !== undefined || task.checklistObjetivo !== undefined || task.ordenAsignacion !== undefined
  const kind = isOperation ? 'Op.' : 'Rec.'
  return `${kind} #${task.id} — ${task.titulo}`
}

export async function buildEmployeeMainMenu(session: BotSession): Promise<string> {
  const [reclamos, operaciones] = await Promise.all([
    getTareasEmpleado(session.userId),
    listOperationalTasksByEmployee(session.userId),
  ])
  const tareasActivas = [
    ...reclamos,
    ...operaciones.filter(t => !['terminada', 'cancelada', 'rechazada'].includes(t.estado)),
  ].filter(t => !isEmployeeTaskClosed(t))

  const pendingConfirmation = tareasActivas.filter(isPendingConfirmation).length
  const inProgress = tareasActivas.filter(t => (t as any).estado === 'en_progreso').length
  const featuredTask = [...tareasActivas].sort((left, right) => employeeTaskRank(left) - employeeTaskRank(right))[0]

  const summaryLines = featuredTask
    ? [
        `🎯 Siguiente: ${buildFeaturedTaskLabel(featuredTask)}`,
        `📋 Tenés ${tareasActivas.length} tarea${tareasActivas.length === 1 ? '' : 's'} activa${tareasActivas.length === 1 ? '' : 's'} (${pendingConfirmation} por aceptar, ${inProgress} en curso)`,
      ]
    : [
        `✅ No tenés tareas activas ahora.`,
        `Podés revisar el historial o registrar asistencia.`,
      ]

  return [
    `👷 *${session.userName}* — Menú principal`,
    SEP,
    ...summaryLines,
    SEP,
    `1️⃣  🎯 Ver mi tarea actual`,
    `2️⃣  📋 Ver todas mis tareas`,
    `3️⃣  🕐 Registrar asistencia`,
    `4️⃣  🚻 Control de baños`,
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
    `4️⃣  📋 Leads sin asignar`,
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
      `🎯 *Mi tarea actual:* aceptar, finalizar o pausar más rápido`,
      `📋 *Ver todas mis tareas:* lista completa por si necesitás elegir otra`,
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
