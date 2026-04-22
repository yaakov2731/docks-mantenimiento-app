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
  getSession, createSession, navigateBack, resetToMain,
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

// Sales
import {
  buildLeadsLista, handleLeadsLista,
  handleLeadDetalle, handleLeadNota,
  buildNuevoLeadPaso1, handleNuevoLeadPaso1,
  handleNuevoLeadPaso2, handleNuevoLeadPaso3,
  handleNuevoLeadPaso4, handleNuevoLeadConfirmar,
  buildEstadoLeads,
} from './menus/sales/leads'

// Público (no registrados)
import {
  buildPublicMainMenu, handlePublicMain,
  buildPublicAlquilerP1, handlePublicAlquilerP1,
  buildPublicAlquilerP2, handlePublicAlquilerP2,
  buildPublicReclamoP1, handlePublicReclamoP1,
  buildPublicReclamoP2, handlePublicReclamoP2,
  buildPublicMensajeP1, handlePublicMensajeP1,
  buildPublicMensajeP2, handlePublicMensajeP2,
} from './menus/public/comercial'

// ── DB helpers para identificación ───────────────────────────────────────────
import { getEmpleadoByWaId, getUsers } from '../db'

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
    const userType: UserType = panelUser.role === 'admin' ? 'admin' : 'sales'
    return { userType, userId: panelUser.id, userName: panelUser.name }
  }

  // 2. ¿Es empleado?
  const empleado = await getEmpleadoByWaId(waNumber)
  if (empleado) {
    return { userType: 'employee', userId: empleado.id, userName: empleado.nombre }
  }

  return null
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function handleIncomingMessage(waNumber: string, rawMessage: string): Promise<string> {
  const message = rawMessage.trim()
  const normalized = normalizeWa(waNumber)

  // Obtener sesión existente
  let session = await getSession(normalized)

  // Sin sesión → identificar usuario y crear
  if (!session) {
    const user = await identifyUser(waNumber)

    if (!user) {
      // Usuario no registrado → menú comercial público
      session = await createSession({
        waNumber: normalized,
        userType: 'public',
        userId: 0,
        userName: 'Visitante',
      })
      return buildPublicMainMenu()
    }

    session = await createSession({
      waNumber: normalized,
      userType: user.userType,
      userId: user.userId,
      userName: user.userName,
    })
    return buildMainMenu(session)
  }

  // Timeout → resetear y mostrar menú
  if (isSessionExpired(session)) {
    session = await resetToMain(session)
    return MSG_SESSION_EXPIRADA + await buildMainMenu(session)
  }

  // Actualizar actividad
  await updateSession(normalized, { lastActivityAt: new Date() })

  // ── Comandos globales ────────────────────────────────────────────────────────
  const msgLower = message.toLowerCase()
  if (['menu', 'menú', 'inicio', 'start', 'hola', 'hi'].includes(msgLower)) {
    session = await resetToMain(session)
    return buildMainMenu(session)
  }
  if (msgLower === 'ayuda' || msgLower === 'help') {
    return buildHelpMessage(session.userType)
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

  // ── EMPLEADO ─────────────────────────────────────────────────────────────────
  if (userType === 'employee') {

    // Menú principal empleado
    if (currentMenu === 'main') {
      if (input === '1') { await navigateTo(session, 'tareas_lista', { page: 1 }); return buildTareasLista({ ...session, currentMenu: 'tareas_lista', contextData: { page: 1 } }) }
      if (input === '2') { await navigateTo(session, 'asistencia', {}); return buildAsistenciaMenu({ ...session, currentMenu: 'asistencia' }) }
      if (input === '3') { await navigateTo(session, 'rondas_lista', { page: 1 }); return buildRondasLista({ ...session, currentMenu: 'rondas_lista', contextData: { page: 1 } }) }
      if (input === '0') return buildHelpMessage('employee')
      return invalidMenuOption(await buildEmployeeMainMenu(session))
    }

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
      if (input === '0') return buildHelpMessage('admin')
      return invalidMenuOption(await buildAdminMainMenu(session))
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
  }

  // ── VENTAS ────────────────────────────────────────────────────────────────────
  if (userType === 'sales') {

    if (currentMenu === 'main') {
      if (input === '1') { await navigateTo(session, 'sales_leads', { page: 1 }); return buildLeadsLista({ ...session, currentMenu: 'sales_leads', contextData: { page: 1 } }) }
      if (input === '2') { await navigateTo(session, 'sales_nuevo_lead_p1', { pendingText: true }); return buildNuevoLeadPaso1() }
      if (input === '3') { return buildEstadoLeads(session) }
      if (input === '0') return buildHelpMessage('sales')
      return invalidMenuOption(buildSalesMainMenu(session))
    }

    if (currentMenu === 'sales_leads') return handleLeadsLista(session, input)
    if (currentMenu === 'sales_lead_detalle') return handleLeadDetalle(session, input)
    if (currentMenu === 'sales_lead_nota') return handleLeadNota(session, input)
    if (currentMenu === 'sales_nuevo_lead_p1') return handleNuevoLeadPaso1(session, input)
    if (currentMenu === 'sales_nuevo_lead_p2') return handleNuevoLeadPaso2(session, input)
    if (currentMenu === 'sales_nuevo_lead_p3') return handleNuevoLeadPaso3(session, input)
    if (currentMenu === 'sales_nuevo_lead_p4') return handleNuevoLeadPaso4(session, input)
    if (currentMenu === 'sales_nuevo_lead_confirmar') return handleNuevoLeadConfirmar(session, input)
  }

  // ── PÚBLICO (no registrado) ───────────────────────────────────────────────────
  if (userType === 'public') {
    if (currentMenu === 'main') return handlePublicMain(session, input)
    if (currentMenu === 'public_alquiler_p1') return handlePublicAlquilerP1(session, input)
    if (currentMenu === 'public_alquiler_p2') return handlePublicAlquilerP2(session, input)
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
  return buildSalesMainMenu(session)
}

async function buildMenuDisplay(session: BotSession, menuName: string): Promise<string> {
  // Reconstruir la vista del menú al que se volvió
  const { userType, contextData } = session

  if (menuName === 'main') return buildMainMenu(session)

  if (userType === 'employee') {
    if (menuName === 'tareas_lista')   return buildTareasLista(session)
    if (menuName === 'tarea_detalle')  return buildTareaDetalle(session)
    if (menuName === 'asistencia')     return buildAsistenciaMenu(session)
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
    if (menuName === 'sales_leads') return buildLeadsLista(session)
  }

  if (userType === 'public') {
    if (menuName === 'public_alquiler_p1') return buildPublicAlquilerP1()
    if (menuName === 'public_alquiler_p2') return buildPublicAlquilerP2()
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
