/**
 * Engine principal del bot de menús — Docks del Puerto
 *
 * Recibe cada mensaje entrante (waNumber + texto) y devuelve la respuesta.
 * Toda la lógica de navegación, timeout y enrutamiento de menús vive aquí.
 *
 * Flujo por mensaje:
 *   1. Identificar usuario (admin / employee / sales)
 *   2. Obtener o crear sesión
 *   3. Verificar timeout
 *   4. Comandos globales (0, menú, inicio, ayuda)
 *   5. Enrutar al handler del menú activo
 *   6. Si handler devuelve null → volver al menú anterior
 */

import {
  getSession, createSession, navigateBack, resetToMain, deleteSession,
  isSessionExpired, updateSession, navigateTo,
  type BotSession, type UserType,
} from './session'
import { SEP } from './shared/guards'

// ── Menús ─────────────────────────────────────────────────────────────────────
import {
  buildEmployeeMainMenu,
  buildAdminMainMenu,
  buildAdminReclamosMenu,
  buildAdminOperationMenu,
  buildSalesMainMenu,
  buildHelpMessage,
} from './menus/main'

// Empleado
import {
  buildTareaActual, handleTareaActual,
  buildTareasLista, handleTareasLista,
  buildTareaDetalle, handleTareaDetalle,
  handleConfirmarCompletar,
  handlePausaMotivo, handlePausaMotivoLibre,
  handleProblema, handleProblemaLibre, handleNotaLibre,
} from './menus/employee/tareas'
import { buildAsistenciaMenu, handleAsistencia } from './menus/employee/asistencia'
import {
  buildRondasLista, handleRondasLista,
  handleRondaDetalle, handleRondaObservacion, handleRondaObservacionLibre,
  handleRondaRechazo,
} from './menus/employee/rondas'

// Admin
import {
  buildReclamosPendientes, handleReclamosPendientes,
  buildAdminReclamoDetalle, handleAdminReclamoDetalle,
  handleAsignarEmpleado, handleAsignarConfirmar,
  handleCambiarPrioridad, handleCancelarReclamo,
  buildEstadoGeneral, buildSLAVencidos,
} from './menus/admin/reclamos'
import {
  buildAdminRondasMenu,
  handleAdminRondas,
  buildAdminRondasUnassigned,
  handleAdminRondasUnassigned,
  buildAdminRondaDetalle,
  handleAdminRondaDetalle,
  buildAdminRondasAssign,
  handleAdminRondasAssign,
  buildAdminRondasCreate,
  handleAdminRondasCreate,
  handleAdminRondasCreateCustom,
  handleAdminRondasCreateLocation,
  buildAdminRondasByEmployee,
  handleAdminRondasByEmployee,
} from './menus/admin/rondas'
import {
  buildAdminLeadsSinAsignar,
  handleAdminLeadsSinAsignar,
  handleAdminLeadDetalle,
  handleAdminLeadElegirVendedor,
  handleAdminLeadConfirmar,
  buildAdminBotAutorespuesta,
  handleAdminBotAutorespuesta,
} from './menus/admin/leads'
import {
  buildNuevaTareaP1,
  handleNuevaTareaP1,
  buildNuevaTareaP2,
  handleNuevaTareaP2,
  buildNuevaTareaP3,
  handleNuevaTareaP3,
  buildNuevaTareaConfirmar,
  handleNuevaTareaConfirmar,
} from './menus/admin/tasks'

// Gastronomía
import { buildGastronomiaMenu, handleGastronomia } from './menus/gastronomia/handler'

// Sales
import {
  buildLeadsLista, handleLeadsLista,
  handleLeadDetalle, handleLeadNota,
  buildNuevoLeadPaso1, handleNuevoLeadPaso1,
  handleNuevoLeadPaso2, handleNuevoLeadPaso3,
  handleNuevoLeadPaso4, handleNuevoLeadConfirmar,
  buildEstadoLeads,
  buildLeadsLibre, handleLeadsLibre,
  handleLeadLibreDetalle,
  buildBandeja, handleBandeja,
} from './menus/sales/leads'

// Público — lead response
import {
  buildLeadRespondioMenu,
  handleLeadRespondio,
  handleLeadVisita,
  handleLeadConsulta,
} from './menus/public/lead-response'

// Público (no registrados)
import {
  buildPublicMainMenu, handlePublicMain,
  buildPublicAlquilerP1, handlePublicAlquilerP1,
  buildPublicAlquilerP2, handlePublicAlquilerP2,
  buildPublicAlquilerP3, handlePublicAlquilerP3, handlePublicAlquilerP3Otro,
  buildPublicAlquilerP4, handlePublicAlquilerP4,
  buildPublicAlquilerP5, handlePublicAlquilerP5,
  buildPublicAlquilerP6, handlePublicAlquilerP6,
  buildPublicAlquilerP7, handlePublicAlquilerP7,
  buildPublicAlquilerConfirmar, handlePublicAlquilerConfirmar,
  buildPublicVisitaP1, handlePublicVisitaP1,
  buildPublicVisitaP2, handlePublicVisitaP2,
  buildPublicVisitaP3, handlePublicVisitaP3,
  buildPublicUbicacion, handlePublicUbicacion,
  buildPublicAsesorP1, handlePublicAsesorP1,
  buildPublicAsesorP2, handlePublicAsesorP2,
  buildPublicReclamoP1, handlePublicReclamoP1,
  buildPublicReclamoP2, handlePublicReclamoP2,
  buildPublicMensajeP1, handlePublicMensajeP1,
  buildPublicMensajeP2, handlePublicMensajeP2,
} from './menus/public/comercial'

// ── DB helpers para identificación ───────────────────────────────────────────
import {
  getEmpleadoByWaId,
  getUsers,
  getLeadByWaId,
  getPendingPlanificacionForEmpleado,
  responderPlanificacionGastronomia,
} from '../db'

function buildAdminGastroSectorMenu(): string {
  return [
    `🍽️ *Gastronomía — Seleccioná el local*`,
    SEP,
    `1️⃣  Uno Grill`,
    `2️⃣  Brooklyn`,
    `3️⃣  Heladería`,
    `4️⃣  Trento Café`,
    `5️⃣  Inflables`,
    `6️⃣  Encargados`,
    SEP,
    `0️⃣  Volver`,
  ].join('\n')
}

function buildEmpleadoModoSelectorMenu(userName: string): string {
  return [
    `👋 Hola, *${userName}*`,
    `¿Qué menú necesitás hoy?`,
    SEP,
    `1️⃣  🔧 Mantenimiento`,
    `2️⃣  🍽️ Gastronomía`,
    `3️⃣  🕐 Elegir asistencia`,
    SEP,
    `0️⃣  Volver`,
  ].join('\n')
}

function buildDualAttendanceSelectorMenu(userName: string, gastroSector?: string): string {
  const gastroLabel = gastroSector && gastroSector !== 'operativo'
    ? `Gastronomía (${gastroSector})`
    : 'Gastronomía'

  return [
    `🕐 *Asistencias — ${userName}*`,
    `Elegí qué asistencia querés registrar:`,
    SEP,
    `1️⃣  🔧 Mantenimiento / Shopping`,
    `2️⃣  🍽️ ${gastroLabel}`,
    SEP,
    `0️⃣  Volver`,
  ].join('\n')
}

function isDualEmployeeSession(session: Pick<BotSession, 'userType' | 'contextData'>): boolean {
  return session.userType === 'employee' && session.contextData?.puedeGastronomia === true
}

function shouldRefreshIdentifiedSession(
  session: BotSession,
  identifiedUser: Awaited<ReturnType<typeof identifyUser>> | null,
): boolean {
  if (!identifiedUser) return false
  if (session.userType !== identifiedUser.userType) return true
  if (session.userId !== identifiedUser.userId) return true

  if (session.userType === 'employee') {
    const identifiedContext = (identifiedUser as any).contextData ?? {}
    const identifiedCanUseGastro = identifiedContext.puedeGastronomia === true
    if (identifiedCanUseGastro && session.contextData?.puedeGastronomia !== true) return true
    if (
      identifiedCanUseGastro &&
      identifiedContext.gastroSector &&
      session.contextData?.gastroSector !== identifiedContext.gastroSector
    ) {
      return true
    }
  }

  if (session.userType === ('gastronomia' as any)) {
    const identifiedContext = (identifiedUser as any).contextData ?? {}
    if (identifiedContext.sector && session.contextData?.sector !== identifiedContext.sector) return true
  }

  return false
}

async function resetSessionHome(session: BotSession): Promise<BotSession> {
  const resetSession = await resetToMain(session)
  if (!isDualEmployeeSession(resetSession)) return resetSession

  await updateSession(resetSession.waNumber, {
    currentMenu: 'empleado_modo_selector',
    contextData: resetSession.contextData,
    menuHistory: [],
  })

  return {
    ...resetSession,
    currentMenu: 'empleado_modo_selector',
    menuHistory: [],
  }
}

const MSG_NO_REGISTRADO = [
  `❌ *Tu número no está registrado en Docks del Puerto.*`,
  ``,
  `Contactá al administrador para que te den de alta.`,
].join('\n')

const MSG_SESSION_EXPIRADA = `⏰ *Sesión expirada por inactividad.*\n\n`

// ── Identificación de usuario ──────────────────────────────────────────────────

function normalizeWa(waNumber: string): string {
  return waNumber.replace(/\D/g, '')
}

async function identifyUser(waNumber: string): Promise<{ userType: UserType; userId: number; userName: string } | null> {
  const normalized = normalizeWa(waNumber)

  // 1. ¿Es usuario del panel con waId? (admin o sales — tiene precedencia sobre empleado)
  const users = await getUsers()
  const panelUser = users.find((u: any) => {
    if (!u.waId || !u.activo) return false
    return normalizeWa(u.waId) === normalized
  })
  if (panelUser) {
    if (panelUser.role !== 'admin' && panelUser.role !== 'sales') return null
    const userType: UserType = panelUser.role === 'admin' ? 'admin' : 'sales'
    return { userType, userId: panelUser.id, userName: panelUser.name }
  }

  // 2. ¿Es empleado?
  const empleado = await getEmpleadoByWaId(waNumber)
  if (!empleado) {
    console.log(`[bot/identify] no_match waNumber=${normalized} — not found as active empleado`)
  }
  if (empleado) {
    if (empleado.puedeVender) {
      return { userType: 'sales', userId: empleado.id, userName: empleado.nombre }
    }
    if ((empleado as any).puedeGastronomia) {
      return {
        userType: 'employee',
        userId: empleado.id,
        userName: empleado.nombre,
        contextData: {
          puedeGastronomia: true,
          gastroSector: (empleado as any).sector ?? '',
          baseTipoEmpleado: (empleado as any).tipoEmpleado ?? 'operativo',
        },
      } as any
    }
    if ((empleado as any).tipoEmpleado === 'gastronomia') {
      return {
        userType: 'gastronomia' as any,
        userId: empleado.id,
        userName: empleado.nombre,
        contextData: {
          sector: (empleado as any).sector ?? '',
          sheetsRow: (empleado as any).sheetsRow ?? null,
        },
      } as any
    }
    return {
      userType: 'employee',
      userId: empleado.id,
      userName: empleado.nombre,
      contextData: { puedeGastronomia: !!(empleado as any).puedeGastronomia, gastroSector: (empleado as any).sector ?? '' },
    } as any
  }

  return null
}

function normalizePlanificacionInput(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}#\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parsePlanificacionResponse(input: string): { turnoId?: number; respuesta: 'confirmado' | 'no_trabaja'; planningSpecific: boolean } | null {
  const normalized = normalizePlanificacionInput(input)
  const explicit = normalized.match(/^(confirmo|confirmar|si|s|ok|dale|no|no puedo|no trabajo|no puedo trabajar|cancelar|rechazo)\s+#?(\d+)$/i)
  if (explicit) {
    return {
      turnoId: Number(explicit[2]),
      respuesta: ['no', 'no puedo', 'no trabajo', 'no puedo trabajar', 'cancelar', 'rechazo'].includes(explicit[1].toLowerCase()) ? 'no_trabaja' : 'confirmado',
      planningSpecific: true,
    }
  }
  const positiveButtonLike = normalized.match(/^1\s*(confirmo|confirmar|si|ok|dale|asistencia confirmada|confirmo asistencia|confirmo mi asistencia|confirmo turno|confirmo el turno)/i)
  if (positiveButtonLike) {
    return { respuesta: 'confirmado', planningSpecific: true }
  }
  const negativeButtonLike = normalized.match(/^2\s*(no|no puedo|no trabajo|no puedo trabajar|cancelar|rechazo|no voy|no voy a poder)/i)
  if (negativeButtonLike) {
    return { respuesta: 'no_trabaja', planningSpecific: true }
  }
  if (normalized === '1') return { respuesta: 'confirmado', planningSpecific: true }
  if (normalized === '2') return { respuesta: 'no_trabaja', planningSpecific: true }
  if ([
    'confirmo',
    'confirmar',
    'si',
    's',
    'ok',
    'dale',
    'confirmo asistencia',
    'confirmar asistencia',
    'confirmo mi asistencia',
    'confirmo turno',
    'confirmo el turno',
    'asistencia confirmada',
  ].includes(normalized)) return { respuesta: 'confirmado', planningSpecific: true }
  if ([
    'no',
    'no puedo',
    'no trabajo',
    'no puedo trabajar',
    'no puedo asistir',
    'cancelar',
    'rechazo',
    'no voy',
    'no voy a poder',
  ].includes(normalized)) return { respuesta: 'no_trabaja', planningSpecific: true }
  return null
}

async function handlePlanificacionBotResponse(session: BotSession, input: string): Promise<string | null> {
  if (session.userType !== ('gastronomia' as any)) return null
  const parsed = parsePlanificacionResponse(input)
  if (!parsed) {
    const pending = await getPendingPlanificacionForEmpleado(session.userId)
    if (pending.length > 0) {
      const turno = pending[0]!
      return [
        `No entendí tu respuesta para el turno #${turno.id}.`,
        ``,
        `Respondé:`,
        `1 ✅ Confirmo`,
        `2 ❌ No puedo`,
      ].join('\n')
    }
    return null
  }

  console.log('[bot/gastronomia/planificacion] parsed', {
    empleadoId: session.userId,
    userName: session.userName,
    input,
    parsed,
  })

  const pending = await getPendingPlanificacionForEmpleado(session.userId)
  console.log('[bot/gastronomia/planificacion] pending', {
    empleadoId: session.userId,
    pendingIds: pending.map((item: any) => item.id),
    count: pending.length,
  })
  const turno = parsed.turnoId
    ? pending.find((item: any) => item.id === parsed.turnoId)
    : pending.length === 1
      ? pending[0]
      : null

  if (!turno) {
    if (parsed.turnoId) {
      return `No encontré un turno pendiente con ese número.\n\nRespondé *menú* para volver al inicio.`
    }
    if (pending.length > 1) {
      return [
        `📅 *Tenés más de un turno pendiente*`,
        ``,
        `Para confirmar, respondé con el número del turno:`,
        ``,
        ...pending.map((item: any) => `• Turno #${item.id}: ${item.fecha} ${item.horaEntrada}-${item.horaSalida}`),
        ``,
        `Ejemplo: *CONFIRMO ${pending[0].id}* o *NO ${pending[0].id}*`,
      ].join('\n')
    }
    if (parsed.planningSpecific) {
      return [
        `📅 *Planificación Docks*`,
        ``,
        `No tenés turnos pendientes para confirmar en este momento.`,
        `Si te llegó un mensaje viejo o hubo un cambio, avisale al encargado.`,
      ].join('\n')
    }
    return null
  }

  const updated = await responderPlanificacionGastronomia({
    turnoId: turno.id,
    empleadoId: session.userId,
    respuesta: parsed.respuesta,
  })
  console.log('[bot/gastronomia/planificacion] updated', {
    empleadoId: session.userId,
    turnoId: turno.id,
    respuesta: parsed.respuesta,
    updated: !!updated,
  })
  if (!updated) return `No pude registrar la respuesta. Probá de nuevo o avisale al encargado.`

  if (parsed.respuesta === 'confirmado') {
    return [
      `✅ *Turno confirmado*`,
      ``,
      `Gracias, ${turno.empleadoNombre}.`,
      `Quedó registrada tu confirmación para el turno #${turno.id}.`,
      ``,
      `📅 Día: ${turno.fecha}`,
      `🕐 Horario: ${turno.horaEntrada} a ${turno.horaSalida}`,
      ``,
      `Cuando llegues, fichá la entrada desde este mismo bot.`,
    ].join('\n')
  }

  return [
    `⚠️ *Disponibilidad registrada*`,
    ``,
    `${turno.empleadoNombre}, registramos que no podés cubrir el turno #${turno.id}.`,
    ``,
    `📅 Día: ${turno.fecha}`,
    `🕐 Horario: ${turno.horaEntrada} a ${turno.horaSalida}`,
    ``,
    `El encargado lo va a ver en Planificación para reorganizar el equipo.`,
  ].join('\n')
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function handleIncomingMessage(waNumber: string, rawMessage: string): Promise<string> {
  const message = rawMessage.trim()
  const normalized = normalizeWa(waNumber)

  // Obtener sesión existente
  let session = await getSession(normalized)
  let identifiedUser = null as Awaited<ReturnType<typeof identifyUser>>

  // Si un número quedó con una sesión vieja pero hoy corresponde a otra identidad
  // o capacidades (por ejemplo, dual/gastronomía), se reidentifica y regenera.
  if (session) {
    identifiedUser = await identifyUser(waNumber)
    const shouldRefresh =
      (session.userType === 'public' && !!identifiedUser) ||
      shouldRefreshIdentifiedSession(session, identifiedUser)
    if (shouldRefresh) {
      await deleteSession(normalized)
      session = null
    }
  }

  // Sin sesión → identificar usuario y crear
  if (!session) {
    const user = identifiedUser ?? await identifyUser(waNumber)

    if (!user) {
      // Usuario no registrado → menú comercial público
      session = await createSession({
        waNumber: normalized,
        userType: 'public',
        userId: 0,
        userName: 'Visitante',
      })

      // Check if this public user is an existing lead who received follow-ups
      const existingLead = await getLeadByWaId(normalized)
      if (existingLead && (existingLead.autoFollowupCount ?? 0) > 0) {
        await updateSession(normalized, {
          currentMenu: 'lead_respondio',
          contextData: { leadId: existingLead.id },
          menuHistory: [],
        })
        // Refresh session object
        session = (await getSession(normalized))!
        return buildLeadRespondioMenu(existingLead.nombre ?? 'ahi')
      }

      return buildPublicMainMenu()
    }

    session = await createSession({
      waNumber: normalized,
      userType: user.userType,
      userId: user.userId,
      userName: user.userName,
    })

    // For gastro employees, store sector context and show gastro menu
    if (user.userType === ('gastronomia' as any)) {
      const { sector, sheetsRow } = (user as any).contextData ?? {}
      await updateSession(normalized, { contextData: { sector, sheetsRow } })
      const maybePlanResponse = await handlePlanificacionBotResponse({
        ...session,
        userType: user.userType,
        userId: user.userId,
        userName: user.userName,
        contextData: { sector, sheetsRow },
      } as any, message)
      if (maybePlanResponse) return maybePlanResponse
      return buildGastronomiaMenu(sector ?? '', user.userName)
    }

    // For dual employees (mantenimiento + gastronomia), store contextData and show selector
    if (user.userType === 'employee' && (user as any).contextData?.puedeGastronomia) {
      const ctx = (user as any).contextData
      await updateSession(normalized, { currentMenu: 'empleado_modo_selector', contextData: ctx })
      return buildEmpleadoModoSelectorMenu(user.userName)
    }

    return buildMainMenu(session)
  }

  // Timeout → resetear y mostrar menú
  if (isSessionExpired(session)) {
    session = await resetSessionHome(session)
    // For public users, re-check if they are a lead with follow-ups
    if (session.userType === 'public') {
      const existingLead = await getLeadByWaId(normalized)
      if (existingLead && (existingLead.autoFollowupCount ?? 0) > 0) {
        await updateSession(normalized, {
          currentMenu: 'lead_respondio',
          contextData: { leadId: existingLead.id },
          menuHistory: [],
        })
        session = (await getSession(normalized))!
        return MSG_SESSION_EXPIRADA + buildLeadRespondioMenu(existingLead.nombre ?? 'ahi')
      }
    }
    return MSG_SESSION_EXPIRADA + await buildMainMenu(session)
  }

  // Actualizar actividad
  await updateSession(normalized, { lastActivityAt: new Date() })

  // ── Comandos globales ────────────────────────────────────────────────────────
  const msgLower = message.toLowerCase()
  const maybePlanResponse = await handlePlanificacionBotResponse(session, message)
  if (maybePlanResponse) return maybePlanResponse

  if (['menu', 'menú', 'inicio', 'start', 'hola', 'hi'].includes(msgLower)) {
    session = await resetSessionHome(session)
    return buildMenuDisplay(session, session.currentMenu)
  }
  if (msgLower === 'ayuda' || msgLower === 'help') {
    return buildHelpMessage(session.userType)
  }
  // Para usuarios públicos en el wizard, "cancelar" en cualquier paso vuelve al inicio
  if (session.userType === 'public' && session.currentMenu !== 'main' && msgLower === 'cancelar') {
    session = await resetSessionHome(session)
    return buildPublicMainMenu()
  }

  // ── Enrutamiento por menú activo ─────────────────────────────────────────────
  const result = await routeMessage(session, message)

  // null significa "volver" — el handler delegó el "back" al engine
  if (result === null) {
    const { session: backSession, previousMenu } = await navigateBack(session)
    return buildMenuDisplay(backSession, previousMenu)
  }

  return result
}

// ── Router central ─────────────────────────────────────────────────────────────

async function routeMessage(session: BotSession, input: string): Promise<string | null> {
  const { currentMenu, userType, contextData } = session

  // ── GASTRONOMÍA ───────────────────────────────────────────────────────────────
  if (userType === ('gastronomia' as any)) {
    return handleGastronomia(session, input)
  }

  // ── EMPLEADO ─────────────────────────────────────────────────────────────────
  if (userType === 'employee') {
    if (canInterruptEmployeeMenuWithAttendance(currentMenu) && isAttendanceShortcut(input)) {
      const attendanceSession = await navigateTo(session, 'asistencia', {})
      return handleAsistencia(attendanceSession, input)
    }

    // Selector mantenimiento / gastronomía para empleados duales
    if (currentMenu === 'empleado_modo_selector') {
      if (input === '1') {
        await updateSession(session.waNumber, { currentMenu: 'main', menuHistory: [] })
        const updated = { ...session, currentMenu: 'main' as any }
        return buildEmployeeMainMenu(updated)
      }
      if (input === '2') {
        const gastroSector = contextData?.gastroSector as string ?? ''
        if (gastroSector && gastroSector !== 'operativo') {
          await navigateTo(session, 'employee_gastro', { sector: gastroSector })
          return buildGastronomiaMenu(gastroSector, session.userName)
        }
        return `⚠️ No tenés un local de gastronomía asignado.\n\n${buildEmpleadoModoSelectorMenu(session.userName)}`
      }
      if (input === '3') {
        await navigateTo(session, 'dual_asistencia_selector', { gastroSector: contextData?.gastroSector ?? '' })
        return buildDualAttendanceSelectorMenu(session.userName, contextData?.gastroSector as string | undefined)
      }
      if (input === '0') return buildHelpMessage('employee')
      return buildEmpleadoModoSelectorMenu(session.userName)
    }

    // Menú principal empleado
    if (currentMenu === 'main') {
      if (isAttendanceShortcut(input)) {
        const attendanceSession = await navigateTo(session, 'asistencia', {})
        return handleAsistencia(attendanceSession, input)
      }
      if (input === '1') { await navigateTo(session, 'tarea_actual', {}); return buildTareaActual({ ...session, currentMenu: 'tarea_actual', contextData: {} }) }
      if (input === '2') { await navigateTo(session, 'tareas_lista', { page: 1 }); return buildTareasLista({ ...session, currentMenu: 'tareas_lista', contextData: { page: 1 } }) }
      if (input === '3') { await navigateTo(session, 'asistencia', {}); return buildAsistenciaMenu({ ...session, currentMenu: 'asistencia' }) }
      if (input === '4') { await navigateTo(session, 'rondas_lista', { page: 1 }); return buildRondasLista({ ...session, currentMenu: 'rondas_lista', contextData: { page: 1 } }) }
      if (input === '5' && contextData?.puedeGastronomia) {
        await navigateTo(session, 'empleado_modo_selector', { gastroSector: contextData?.gastroSector ?? '' })
        return buildEmpleadoModoSelectorMenu(session.userName)
      }
      if (input === '0') return buildHelpMessage('employee')
      return invalidMenuOption(await buildEmployeeMainMenu(session))
    }

    if (currentMenu === 'tarea_actual') return handleTareaActual(session, input)
    if (currentMenu === 'tareas_lista') return handleTareasLista(session, input)
    if (currentMenu === 'tarea_detalle') return handleTareaDetalle(session, input)
    if (currentMenu === 'tarea_confirmar_completar') return handleConfirmarCompletar(session, input)
    if (currentMenu === 'tarea_pausa_motivo') return handlePausaMotivo(session, input)
    if (currentMenu === 'tarea_pausa_motivo_libre') {
      // texto libre para el motivo de pausa
      return handlePausaMotivoLibre(session, input)
    }
    if (currentMenu === 'tarea_problema') return handleProblema(session, input)
    if (currentMenu === 'tarea_problema_libre') return handleProblemaLibre(session, input)
    if (currentMenu === 'tarea_nota_libre') return handleNotaLibre(session, input)

    if (currentMenu === 'asistencia') return handleAsistencia(session, input)
    if (currentMenu === 'dual_asistencia_selector') {
      if (input === '1') {
        await navigateTo(session, 'asistencia', {})
        return buildAsistenciaMenu({ ...session, currentMenu: 'asistencia' })
      }
      if (input === '2') {
        const gastroSector = contextData?.gastroSector as string ?? ''
        if (gastroSector && gastroSector !== 'operativo') {
          await navigateTo(session, 'employee_gastro', { sector: gastroSector })
          return buildGastronomiaMenu(gastroSector, session.userName)
        }
        return `⚠️ No tenés un local de gastronomía asignado.\n\n${buildDualAttendanceSelectorMenu(session.userName)}`
      }
      if (input === '0') return null
      return buildDualAttendanceSelectorMenu(session.userName, contextData?.gastroSector as string | undefined)
    }
    if (currentMenu === 'employee_gastro') {
      return handleGastronomia({ ...session, contextData: { ...session.contextData, sector: session.contextData?.sector ?? session.contextData?.gastroSector ?? '' } }, input)
    }

    if (currentMenu === 'rondas_lista') return handleRondasLista(session, input)
    if (currentMenu === 'ronda_detalle') return handleRondaDetalle(session, input)
    if (currentMenu === 'ronda_observacion') return handleRondaObservacion(session, input)
    if (currentMenu === 'ronda_observacion_libre') return handleRondaObservacionLibre(session, input)
    if (currentMenu === 'ronda_rechazo') return handleRondaRechazo(session, input)
  }

  // ── ADMIN ─────────────────────────────────────────────────────────────────────
  if (userType === 'admin') {

    if (currentMenu === 'main') {
      if (input === '1') {
        await navigateTo(session, 'admin_reclamos_home', {})
        return buildAdminReclamosMenu({ ...session, currentMenu: 'admin_reclamos_home', contextData: {} })
      }
      if (input === '2') {
        await navigateTo(session, 'admin_operacion_home', {})
        return buildAdminOperationMenu({ ...session, currentMenu: 'admin_operacion_home', contextData: {} })
      }
      if (input === '3') {
        await navigateTo(session, 'admin_rondas', { page: 1 })
        return buildAdminRondasMenu({ ...session, currentMenu: 'admin_rondas', contextData: { page: 1 } })
      }
      if (input === '4') {
        await navigateTo(session, 'admin_leads_sin_asignar', { page: 1 })
        return buildAdminLeadsSinAsignar({ ...session, currentMenu: 'admin_leads_sin_asignar', contextData: { page: 1 } })
      }
      if (input === '5') {
        await navigateTo(session, 'admin_gastro_sector', {})
        return buildAdminGastroSectorMenu()
      }
      if (input === '0') return buildHelpMessage('admin')
      return invalidMenuOption(await buildAdminMainMenu(session))
    }

    if (currentMenu === 'admin_gastro_sector') {
      const sectorMap: Record<string, string> = {
        '1': 'uno_grill', '2': 'brooklyn', '3': 'heladeria',
        '4': 'trento_cafe', '5': 'inflables', '6': 'encargados',
      }
      if (input === '0') return null
      const sector = sectorMap[input]
      if (!sector) return `⚠️ Opción inválida.\n\n${buildAdminGastroSectorMenu()}`
      await navigateTo(session, 'admin_gastro', { sector })
      return buildGastronomiaMenu(sector, session.userName)
    }

    if (currentMenu === 'admin_gastro') {
      return handleGastronomia({ ...session, contextData: { ...session.contextData, sector: session.contextData?.sector ?? '' } }, input)
    }

    if (currentMenu === 'admin_reclamos_home') {
      if (input === '1') {
        await navigateTo(session, 'admin_reclamos', { page: 1 })
        return buildReclamosPendientes({ ...session, currentMenu: 'admin_reclamos', contextData: { page: 1 } })
      }
      if (input === '2') {
        await navigateTo(session, 'admin_urgentes', { page: 1 })
        return buildReclamosPendientes({ ...session, currentMenu: 'admin_urgentes', contextData: { page: 1 } }, 'urgentes')
      }
      if (input === '3') {
        await navigateTo(session, 'admin_sin_asignar', { page: 1 })
        return buildReclamosPendientes({ ...session, currentMenu: 'admin_sin_asignar', contextData: { page: 1 } }, 'sin_asignar')
      }
      if (input === '4') {
        await navigateTo(session, 'admin_info', {})
        return buildSLAVencidos()
      }
      if (input === '0') return null
      return invalidMenuOption(buildAdminReclamosMenu(session))
    }

    if (currentMenu === 'admin_operacion_home') {
      if (input === '1') {
        await navigateTo(session, 'admin_info', {})
        return buildEstadoGeneral(session)
      }
      if (input === '2') {
        await navigateTo(session, 'admin_nueva_tarea_p1', { page: 1 })
        return buildNuevaTareaP1({ ...session, currentMenu: 'admin_nueva_tarea_p1', contextData: { page: 1 } })
      }
      if (input === '0') return null
      return invalidMenuOption(buildAdminOperationMenu(session))
    }

    if (currentMenu === 'admin_info') return null
    if (currentMenu === 'admin_nueva_tarea_p1')        return handleNuevaTareaP1(session, input)
    if (currentMenu === 'admin_nueva_tarea_p2')        return handleNuevaTareaP2(session, input)
    if (currentMenu === 'admin_nueva_tarea_p3')        return handleNuevaTareaP3(session, input)
    if (currentMenu === 'admin_nueva_tarea_confirmar') return handleNuevaTareaConfirmar(session, input)

    if (currentMenu === 'admin_reclamos')     return handleReclamosPendientes(session, input)
    if (currentMenu === 'admin_urgentes')     return handleReclamosPendientes(session, input, 'urgentes')
    if (currentMenu === 'admin_sin_asignar')  return handleReclamosPendientes(session, input, 'sin_asignar')
    if (currentMenu === 'admin_reclamo_detalle') return handleAdminReclamoDetalle(session, input)
    if (currentMenu === 'admin_asignar_empleado') return handleAsignarEmpleado(session, input)
    if (currentMenu === 'admin_asignar_confirmar') return handleAsignarConfirmar(session, input)
    if (currentMenu === 'admin_cambiar_prioridad') return handleCambiarPrioridad(session, input)
    if (currentMenu === 'admin_cancelar_reclamo') return handleCancelarReclamo(session, input)
    if (currentMenu === 'admin_rondas') return handleAdminRondas(session, input)
    if (currentMenu === 'admin_rondas_unassigned') return handleAdminRondasUnassigned(session, input)
    if (currentMenu === 'admin_ronda_detalle') return handleAdminRondaDetalle(session, input)
    if (currentMenu === 'admin_rondas_assign') return handleAdminRondasAssign(session, input)
    if (currentMenu === 'admin_rondas_create') return handleAdminRondasCreate(session, input)
    if (currentMenu === 'admin_rondas_create_custom') return handleAdminRondasCreateCustom(session, input)
    if (currentMenu === 'admin_rondas_create_location') return handleAdminRondasCreateLocation(session, input)
    if (currentMenu === 'admin_rondas_by_employee') return handleAdminRondasByEmployee(session, input)
    if (currentMenu === 'admin_leads_sin_asignar') return handleAdminLeadsSinAsignar(session, input)
    if (currentMenu === 'admin_lead_detalle') return handleAdminLeadDetalle(session, input)
    if (currentMenu === 'admin_lead_elegir_vendedor') return handleAdminLeadElegirVendedor(session, input)
    if (currentMenu === 'admin_lead_confirmar') return handleAdminLeadConfirmar(session, input)
    if (currentMenu === 'admin_bot_autorespuesta') return handleAdminBotAutorespuesta(session, input)
  }

  // ── VENTAS ────────────────────────────────────────────────────────────────────
  if (userType === 'sales') {

    if (currentMenu === 'main') {
      if (input === '1') { await navigateTo(session, 'sales_bandeja', { page: 1 }); return buildBandeja({ ...session, currentMenu: 'sales_bandeja', contextData: { page: 1 } }) }
      if (input === '2') { await navigateTo(session, 'sales_nuevo_lead_p1', { pendingText: true }); return buildNuevoLeadPaso1() }
      if (input === '3') { await navigateTo(session, 'sales_leads', { page: 1 }); return buildLeadsLista({ ...session, currentMenu: 'sales_leads', contextData: { page: 1 } }) }
      if (input === '0') return buildHelpMessage('sales')
      return invalidMenuOption(await buildSalesMainMenu(session))
    }

    if (currentMenu === 'sales_estado_leads') return null
    if (currentMenu === 'sales_bandeja') return handleBandeja(session, input)
    if (currentMenu === 'sales_leads') return handleLeadsLista(session, input)
    if (currentMenu === 'sales_lead_detalle') return handleLeadDetalle(session, input)
    if (currentMenu === 'sales_lead_nota') return handleLeadNota(session, input)
    if (currentMenu === 'sales_nuevo_lead_p1') return handleNuevoLeadPaso1(session, input)
    if (currentMenu === 'sales_nuevo_lead_p2') return handleNuevoLeadPaso2(session, input)
    if (currentMenu === 'sales_nuevo_lead_p3') return handleNuevoLeadPaso3(session, input)
    if (currentMenu === 'sales_nuevo_lead_p4') return handleNuevoLeadPaso4(session, input)
    if (currentMenu === 'sales_nuevo_lead_confirmar') return handleNuevoLeadConfirmar(session, input)
    if (currentMenu === 'sales_leads_libre') return handleLeadsLibre(session, input)
    if (currentMenu === 'sales_lead_libre_detalle') return handleLeadLibreDetalle(session, input)
  }

  // ── PÚBLICO (no registrado) ───────────────────────────────────────────────────
  if (userType === 'public') {
    if (currentMenu === 'lead_respondio') return handleLeadRespondio(session, input)
    if (currentMenu === 'lead_visita') return handleLeadVisita(session, input)
    if (currentMenu === 'lead_consulta') return handleLeadConsulta(session, input)
    if (currentMenu === 'main') return handlePublicMain(session, input)
    if (currentMenu === 'public_alquiler_p1') return handlePublicAlquilerP1(session, input)
    if (currentMenu === 'public_alquiler_p2') return handlePublicAlquilerP2(session, input)
    if (currentMenu === 'public_alquiler_p3') return handlePublicAlquilerP3(session, input)
    if (currentMenu === 'public_alquiler_p3_otro') return handlePublicAlquilerP3Otro(session, input)
    if (currentMenu === 'public_alquiler_p4') return handlePublicAlquilerP4(session, input)
    if (currentMenu === 'public_alquiler_p5') return handlePublicAlquilerP5(session, input)
    if (currentMenu === 'public_alquiler_p6') return handlePublicAlquilerP6(session, input)
    if (currentMenu === 'public_alquiler_p7') return handlePublicAlquilerP7(session, input)
    if (currentMenu === 'public_alquiler_confirmar') return handlePublicAlquilerConfirmar(session, input)
    if (currentMenu === 'public_visita_p1') return handlePublicVisitaP1(session, input)
    if (currentMenu === 'public_visita_p2') return handlePublicVisitaP2(session, input)
    if (currentMenu === 'public_visita_p3') return handlePublicVisitaP3(session, input)
    if (currentMenu === 'public_ubicacion') return handlePublicUbicacion(session, input)
    if (currentMenu === 'public_asesor_p1') return handlePublicAsesorP1(session, input)
    if (currentMenu === 'public_asesor_p2') return handlePublicAsesorP2(session, input)
    if (currentMenu === 'public_reclamo_p1')  return handlePublicReclamoP1(session, input)
    if (currentMenu === 'public_reclamo_p2')  return handlePublicReclamoP2(session, input)
    if (currentMenu === 'public_mensaje_p1')  return handlePublicMensajeP1(session, input)
    if (currentMenu === 'public_mensaje_p2')  return handlePublicMensajeP2(session, input)
  }

  // Menú desconocido → reset al principal
  await resetToMain(session)
  return buildMainMenu(session)
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function buildMainMenu(session: BotSession): Promise<string> {
  if (session.userType === 'employee') return buildEmployeeMainMenu(session)
  if (session.userType === 'admin')    return buildAdminMainMenu(session)
  if (session.userType === 'public')   return buildPublicMainMenu()
  if ((session.userType as any) === 'gastronomia') {
    return buildGastronomiaMenu(
      session.contextData?.sector as string ?? '',
      session.userName,
    )
  }
  return buildSalesMainMenu(session)
}

  async function buildMenuDisplay(session: BotSession, menuName: string): Promise<string> {
  // Reconstruir la vista del menú al que se volvió
  const { userType, contextData } = session

  if (menuName === 'main') return buildMainMenu(session)

    if (userType === 'employee') {
      if (menuName === 'empleado_modo_selector') return buildEmpleadoModoSelectorMenu(session.userName)
      if (menuName === 'tarea_actual')   return buildTareaActual(session)
      if (menuName === 'tareas_lista')   return buildTareasLista(session)
      if (menuName === 'tarea_detalle')  return buildTareaDetalle(session)
      if (menuName === 'asistencia')     return buildAsistenciaMenu(session)
      if (menuName === 'dual_asistencia_selector') return buildDualAttendanceSelectorMenu(session.userName, session.contextData?.gastroSector as string | undefined)
      if (menuName === 'employee_gastro') {
        const sector = session.contextData?.sector as string ?? session.contextData?.gastroSector as string ?? ''
        return buildGastronomiaMenu(sector, session.userName)
      }
      if (menuName === 'rondas_lista')   return buildRondasLista(session)
    }

  if (userType === 'admin') {
    if (menuName === 'admin_reclamos_home') return buildAdminReclamosMenu(session)
    if (menuName === 'admin_operacion_home') return buildAdminOperationMenu(session)
    if (menuName === 'admin_reclamos')     return buildReclamosPendientes(session)
    if (menuName === 'admin_urgentes')     return buildReclamosPendientes(session, 'urgentes')
    if (menuName === 'admin_sin_asignar')  return buildReclamosPendientes(session, 'sin_asignar')
    if (menuName === 'admin_reclamo_detalle') {
      const { reporteId } = session.contextData
      if (reporteId) {
        const { getReporteById } = await import('../db')
        const r = await getReporteById(reporteId as number)
        if (r) return buildAdminReclamoDetalle(r)
      }
    }
    if (menuName === 'admin_rondas') return buildAdminRondasMenu(session)
    if (menuName === 'admin_rondas_unassigned') return buildAdminRondasUnassigned(session)
    if (menuName === 'admin_leads_sin_asignar') return buildAdminLeadsSinAsignar(session)
    if (menuName === 'admin_lead_detalle') {
      const { leadId } = session.contextData
      if (leadId) {
        const { getLeadById } = await import('../db')
        const lead = await getLeadById(Number(leadId))
        if (lead) {
          const { buildAdminLeadDetalleDisplay } = await import('./menus/admin/leads')
          return buildAdminLeadDetalleDisplay(lead)
        }
      }
    }
    if (menuName === 'admin_bot_autorespuesta')  return buildAdminBotAutorespuesta()
    if (menuName === 'admin_nueva_tarea_p1')    return buildNuevaTareaP1(session)
    if (menuName === 'admin_nueva_tarea_p2')    return buildNuevaTareaP2(session.contextData.tareaEmpleadoNombre as string)
    if (menuName === 'admin_nueva_tarea_p3')    return buildNuevaTareaP3()
    if (menuName === 'admin_nueva_tarea_confirmar') return buildNuevaTareaConfirmar(session)
    if (menuName === 'admin_ronda_detalle') {
      const { rondaId } = session.contextData
      if (rondaId) {
        const { getRoundOccurrenceById } = await import('../db')
        const occurrence = await getRoundOccurrenceById(Number(rondaId))
        if (occurrence) return buildAdminRondaDetalle(occurrence)
      }
    }
  }

  if (userType === 'sales') {
    if (menuName === 'sales_bandeja')     return buildBandeja(session)
    if (menuName === 'sales_leads')       return buildLeadsLista(session)
    if (menuName === 'sales_leads_libre') return buildLeadsLibre(session)
    if (menuName === 'sales_estado_leads') return buildEstadoLeads(session)
  }

  if (userType === 'public') {
    if (menuName === 'lead_respondio') {
      const lead = await getLeadByWaId(session.waNumber)
      return buildLeadRespondioMenu(lead?.nombre ?? 'ahi')
    }
    if (menuName === 'public_alquiler_p1') return buildPublicAlquilerP1()
    if (menuName === 'public_alquiler_p2') return buildPublicAlquilerP2()
    if (menuName === 'public_alquiler_p3') return buildPublicAlquilerP3()
    if (menuName === 'public_alquiler_p4') return buildPublicAlquilerP4()
    if (menuName === 'public_alquiler_p5') return buildPublicAlquilerP5()
    if (menuName === 'public_alquiler_p6') return buildPublicAlquilerP6()
    if (menuName === 'public_alquiler_p7') return buildPublicAlquilerP7()
    if (menuName === 'public_alquiler_confirmar') return buildPublicAlquilerConfirmar(session.contextData as Record<string, any>)
    if (menuName === 'public_visita_p1') return buildPublicVisitaP1()
    if (menuName === 'public_visita_p2') return buildPublicVisitaP2()
    if (menuName === 'public_visita_p3') return buildPublicVisitaP3()
    if (menuName === 'public_ubicacion') return buildPublicUbicacion()
    if (menuName === 'public_asesor_p1') return buildPublicAsesorP1()
    if (menuName === 'public_asesor_p2') return buildPublicAsesorP2()
    if (menuName === 'public_reclamo_p1')  return buildPublicReclamoP1()
    if (menuName === 'public_reclamo_p2')  return buildPublicReclamoP2()
    if (menuName === 'public_mensaje_p1')  return buildPublicMensajeP1()
    if (menuName === 'public_mensaje_p2')  return buildPublicMensajeP2()
  }

  return buildMainMenu(session)
}

function invalidMenuOption(menuText: string): string {
  return `❓ *Opción no válida.* Ingresá el número de la opción:\n\n${menuText}`
}

function isAttendanceShortcut(input: string): boolean {
  const normalized = normalizeBotText(input)
  if (!normalized || /^\d+$/.test(normalized)) return false

  return [
    'asistencia',
    'marcacion',
    'marcacion asistencia',
    'registrar asistencia',
    'turno',
    'entrada',
    'registrar entrada',
    'marcar entrada',
    'ingreso',
    'entro',
    'llegue',
    'salida',
    'registrar salida',
    'marcar salida',
    'salgo',
    'me voy',
    'cierro turno',
    'termino turno',
    'inicio almuerzo',
    'iniciar almuerzo',
    'salgo a almorzar',
    'me voy a almorzar',
    'fin almuerzo',
    'volver de almuerzo',
    'volvi de almorzar',
    'termine almuerzo',
    'resumen del dia',
    'ver resumen',
    'resumen',
  ].some(pattern => normalized === pattern || normalized.includes(pattern))
}

function canInterruptEmployeeMenuWithAttendance(currentMenu: string): boolean {
  return [
    'main',
    'tarea_actual',
    'tareas_lista',
    'tarea_detalle',
    'asistencia',
    'dual_asistencia_selector',
    'rondas_lista',
    'ronda_detalle',
  ].includes(currentMenu)
}

function normalizeBotText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}
