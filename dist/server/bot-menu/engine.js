"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleIncomingMessage = handleIncomingMessage;
const session_1 = require("./session");
// ── Menús ─────────────────────────────────────────────────────────────────────
const main_1 = require("./menus/main");
// Empleado
const tareas_1 = require("./menus/employee/tareas");
const asistencia_1 = require("./menus/employee/asistencia");
const rondas_1 = require("./menus/employee/rondas");
// Admin
const reclamos_1 = require("./menus/admin/reclamos");
const rondas_2 = require("./menus/admin/rondas");
const leads_1 = require("./menus/admin/leads");
const tasks_1 = require("./menus/admin/tasks");
// Sales
const leads_2 = require("./menus/sales/leads");
// Público — lead response
const lead_response_1 = require("./menus/public/lead-response");
// Público (no registrados)
const comercial_1 = require("./menus/public/comercial");
// ── DB helpers para identificación ───────────────────────────────────────────
const db_1 = require("../db");
const MSG_NO_REGISTRADO = [
    `❌ *Tu número no está registrado en Docks del Puerto.*`,
    ``,
    `Contactá al administrador para que te den de alta.`,
].join('\n');
const MSG_SESSION_EXPIRADA = `⏰ *Sesión expirada por inactividad.*\n\n`;
// ── Identificación de usuario ──────────────────────────────────────────────────
function normalizeWa(waNumber) {
    return waNumber.replace(/\D/g, '');
}
async function identifyUser(waNumber) {
    const normalized = normalizeWa(waNumber);
    // 1. ¿Es usuario del panel con waId? (admin o sales — tiene precedencia sobre empleado)
    const users = await (0, db_1.getUsers)();
    const panelUser = users.find((u) => {
        if (!u.waId || !u.activo)
            return false;
        return normalizeWa(u.waId) === normalized;
    });
    if (panelUser) {
        if (panelUser.role !== 'admin' && panelUser.role !== 'sales')
            return null;
        const userType = panelUser.role === 'admin' ? 'admin' : 'sales';
        return { userType, userId: panelUser.id, userName: panelUser.name };
    }
    // 2. ¿Es empleado?
    const empleado = await (0, db_1.getEmpleadoByWaId)(waNumber);
    if (empleado) {
        if (empleado.puedeVender) {
            return { userType: 'sales', userId: empleado.id, userName: empleado.nombre };
        }
        return { userType: 'employee', userId: empleado.id, userName: empleado.nombre };
    }
    return null;
}
// ── Main entry point ──────────────────────────────────────────────────────────
async function handleIncomingMessage(waNumber, rawMessage) {
    const message = rawMessage.trim();
    const normalized = normalizeWa(waNumber);
    // Obtener sesión existente
    let session = await (0, session_1.getSession)(normalized);
    // Sin sesión → identificar usuario y crear
    if (!session) {
        const user = await identifyUser(waNumber);
        if (!user) {
            // Usuario no registrado → menú comercial público
            session = await (0, session_1.createSession)({
                waNumber: normalized,
                userType: 'public',
                userId: 0,
                userName: 'Visitante',
            });
            // Check if this public user is an existing lead who received follow-ups
            const existingLead = await (0, db_1.getLeadByWaId)(normalized);
            if (existingLead && (existingLead.autoFollowupCount ?? 0) > 0) {
                await (0, session_1.updateSession)(normalized, {
                    currentMenu: 'lead_respondio',
                    contextData: { leadId: existingLead.id },
                    menuHistory: [],
                });
                // Refresh session object
                session = (await (0, session_1.getSession)(normalized));
                return (0, lead_response_1.buildLeadRespondioMenu)(existingLead.nombre ?? 'ahi');
            }
            return (0, comercial_1.buildPublicMainMenu)();
        }
        session = await (0, session_1.createSession)({
            waNumber: normalized,
            userType: user.userType,
            userId: user.userId,
            userName: user.userName,
        });
        return buildMainMenu(session);
    }
    // Timeout → resetear y mostrar menú
    if ((0, session_1.isSessionExpired)(session)) {
        session = await (0, session_1.resetToMain)(session);
        // For public users, re-check if they are a lead with follow-ups
        if (session.userType === 'public') {
            const existingLead = await (0, db_1.getLeadByWaId)(normalized);
            if (existingLead && (existingLead.autoFollowupCount ?? 0) > 0) {
                await (0, session_1.updateSession)(normalized, {
                    currentMenu: 'lead_respondio',
                    contextData: { leadId: existingLead.id },
                    menuHistory: [],
                });
                session = (await (0, session_1.getSession)(normalized));
                return MSG_SESSION_EXPIRADA + (0, lead_response_1.buildLeadRespondioMenu)(existingLead.nombre ?? 'ahi');
            }
        }
        return MSG_SESSION_EXPIRADA + await buildMainMenu(session);
    }
    // Actualizar actividad
    await (0, session_1.updateSession)(normalized, { lastActivityAt: new Date() });
    // ── Comandos globales ────────────────────────────────────────────────────────
    const msgLower = message.toLowerCase();
    if (['menu', 'menú', 'inicio', 'start', 'hola', 'hi'].includes(msgLower)) {
        session = await (0, session_1.resetToMain)(session);
        return buildMainMenu(session);
    }
    if (msgLower === 'ayuda' || msgLower === 'help') {
        return (0, main_1.buildHelpMessage)(session.userType);
    }
    // Para usuarios públicos en el wizard, "cancelar" en cualquier paso vuelve al inicio
    if (session.userType === 'public' && session.currentMenu !== 'main' && msgLower === 'cancelar') {
        session = await (0, session_1.resetToMain)(session);
        return (0, comercial_1.buildPublicMainMenu)();
    }
    // ── Enrutamiento por menú activo ─────────────────────────────────────────────
    const result = await routeMessage(session, message);
    // null significa "volver" — el handler delegó el "back" al engine
    if (result === null) {
        const { session: backSession, previousMenu } = await (0, session_1.navigateBack)(session);
        return buildMenuDisplay(backSession, previousMenu);
    }
    return result;
}
// ── Router central ─────────────────────────────────────────────────────────────
async function routeMessage(session, input) {
    const { currentMenu, userType, contextData } = session;
    // ── EMPLEADO ─────────────────────────────────────────────────────────────────
    if (userType === 'employee') {
        // Menú principal empleado
        if (currentMenu === 'main') {
            if (isAttendanceShortcut(input)) {
                const attendanceSession = await (0, session_1.navigateTo)(session, 'asistencia', {});
                return (0, asistencia_1.handleAsistencia)(attendanceSession, input);
            }
            if (input === '1') {
                await (0, session_1.navigateTo)(session, 'tarea_actual', {});
                return (0, tareas_1.buildTareaActual)({ ...session, currentMenu: 'tarea_actual', contextData: {} });
            }
            if (input === '2') {
                await (0, session_1.navigateTo)(session, 'tareas_lista', { page: 1 });
                return (0, tareas_1.buildTareasLista)({ ...session, currentMenu: 'tareas_lista', contextData: { page: 1 } });
            }
            if (input === '3') {
                await (0, session_1.navigateTo)(session, 'asistencia', {});
                return (0, asistencia_1.buildAsistenciaMenu)({ ...session, currentMenu: 'asistencia' });
            }
            if (input === '4') {
                await (0, session_1.navigateTo)(session, 'rondas_lista', { page: 1 });
                return (0, rondas_1.buildRondasLista)({ ...session, currentMenu: 'rondas_lista', contextData: { page: 1 } });
            }
            if (input === '0')
                return (0, main_1.buildHelpMessage)('employee');
            return invalidMenuOption(await (0, main_1.buildEmployeeMainMenu)(session));
        }
        if (currentMenu === 'tarea_actual')
            return (0, tareas_1.handleTareaActual)(session, input);
        if (currentMenu === 'tareas_lista')
            return (0, tareas_1.handleTareasLista)(session, input);
        if (currentMenu === 'tarea_detalle')
            return (0, tareas_1.handleTareaDetalle)(session, input);
        if (currentMenu === 'tarea_confirmar_completar')
            return (0, tareas_1.handleConfirmarCompletar)(session, input);
        if (currentMenu === 'tarea_pausa_motivo')
            return (0, tareas_1.handlePausaMotivo)(session, input);
        if (currentMenu === 'tarea_pausa_motivo_libre') {
            // texto libre para el motivo de pausa
            return (0, tareas_1.handlePausaMotivoLibre)(session, input);
        }
        if (currentMenu === 'tarea_problema')
            return (0, tareas_1.handleProblema)(session, input);
        if (currentMenu === 'tarea_problema_libre')
            return (0, tareas_1.handleProblemaLibre)(session, input);
        if (currentMenu === 'tarea_nota_libre')
            return (0, tareas_1.handleNotaLibre)(session, input);
        if (currentMenu === 'asistencia')
            return (0, asistencia_1.handleAsistencia)(session, input);
        if (currentMenu === 'rondas_lista')
            return (0, rondas_1.handleRondasLista)(session, input);
        if (currentMenu === 'ronda_detalle')
            return (0, rondas_1.handleRondaDetalle)(session, input);
        if (currentMenu === 'ronda_observacion')
            return (0, rondas_1.handleRondaObservacion)(session, input);
        if (currentMenu === 'ronda_observacion_libre')
            return (0, rondas_1.handleRondaObservacionLibre)(session, input);
        if (currentMenu === 'ronda_rechazo')
            return (0, rondas_1.handleRondaRechazo)(session, input);
    }
    // ── ADMIN ─────────────────────────────────────────────────────────────────────
    if (userType === 'admin') {
        if (currentMenu === 'main') {
            if (input === '1') {
                await (0, session_1.navigateTo)(session, 'admin_reclamos_home', {});
                return (0, main_1.buildAdminReclamosMenu)({ ...session, currentMenu: 'admin_reclamos_home', contextData: {} });
            }
            if (input === '2') {
                await (0, session_1.navigateTo)(session, 'admin_operacion_home', {});
                return (0, main_1.buildAdminOperationMenu)({ ...session, currentMenu: 'admin_operacion_home', contextData: {} });
            }
            if (input === '3') {
                await (0, session_1.navigateTo)(session, 'admin_rondas', { page: 1 });
                return (0, rondas_2.buildAdminRondasMenu)({ ...session, currentMenu: 'admin_rondas', contextData: { page: 1 } });
            }
            if (input === '4') {
                await (0, session_1.navigateTo)(session, 'admin_leads_sin_asignar', { page: 1 });
                return (0, leads_1.buildAdminLeadsSinAsignar)({ ...session, currentMenu: 'admin_leads_sin_asignar', contextData: { page: 1 } });
            }
            if (input === '0')
                return (0, main_1.buildHelpMessage)('admin');
            return invalidMenuOption(await (0, main_1.buildAdminMainMenu)(session));
        }
        if (currentMenu === 'admin_reclamos_home') {
            if (input === '1') {
                await (0, session_1.navigateTo)(session, 'admin_reclamos', { page: 1 });
                return (0, reclamos_1.buildReclamosPendientes)({ ...session, currentMenu: 'admin_reclamos', contextData: { page: 1 } });
            }
            if (input === '2') {
                await (0, session_1.navigateTo)(session, 'admin_urgentes', { page: 1 });
                return (0, reclamos_1.buildReclamosPendientes)({ ...session, currentMenu: 'admin_urgentes', contextData: { page: 1 } }, 'urgentes');
            }
            if (input === '3') {
                await (0, session_1.navigateTo)(session, 'admin_sin_asignar', { page: 1 });
                return (0, reclamos_1.buildReclamosPendientes)({ ...session, currentMenu: 'admin_sin_asignar', contextData: { page: 1 } }, 'sin_asignar');
            }
            if (input === '4') {
                await (0, session_1.navigateTo)(session, 'admin_info', {});
                return (0, reclamos_1.buildSLAVencidos)();
            }
            if (input === '0')
                return null;
            return invalidMenuOption((0, main_1.buildAdminReclamosMenu)(session));
        }
        if (currentMenu === 'admin_operacion_home') {
            if (input === '1') {
                await (0, session_1.navigateTo)(session, 'admin_info', {});
                return (0, reclamos_1.buildEstadoGeneral)(session);
            }
            if (input === '2') {
                await (0, session_1.navigateTo)(session, 'admin_nueva_tarea_p1', { page: 1 });
                return (0, tasks_1.buildNuevaTareaP1)({ ...session, currentMenu: 'admin_nueva_tarea_p1', contextData: { page: 1 } });
            }
            if (input === '0')
                return null;
            return invalidMenuOption((0, main_1.buildAdminOperationMenu)(session));
        }
        if (currentMenu === 'admin_info')
            return null;
        if (currentMenu === 'admin_nueva_tarea_p1')
            return (0, tasks_1.handleNuevaTareaP1)(session, input);
        if (currentMenu === 'admin_nueva_tarea_p2')
            return (0, tasks_1.handleNuevaTareaP2)(session, input);
        if (currentMenu === 'admin_nueva_tarea_p3')
            return (0, tasks_1.handleNuevaTareaP3)(session, input);
        if (currentMenu === 'admin_nueva_tarea_confirmar')
            return (0, tasks_1.handleNuevaTareaConfirmar)(session, input);
        if (currentMenu === 'admin_reclamos')
            return (0, reclamos_1.handleReclamosPendientes)(session, input);
        if (currentMenu === 'admin_urgentes')
            return (0, reclamos_1.handleReclamosPendientes)(session, input, 'urgentes');
        if (currentMenu === 'admin_sin_asignar')
            return (0, reclamos_1.handleReclamosPendientes)(session, input, 'sin_asignar');
        if (currentMenu === 'admin_reclamo_detalle')
            return (0, reclamos_1.handleAdminReclamoDetalle)(session, input);
        if (currentMenu === 'admin_asignar_empleado')
            return (0, reclamos_1.handleAsignarEmpleado)(session, input);
        if (currentMenu === 'admin_asignar_confirmar')
            return (0, reclamos_1.handleAsignarConfirmar)(session, input);
        if (currentMenu === 'admin_cambiar_prioridad')
            return (0, reclamos_1.handleCambiarPrioridad)(session, input);
        if (currentMenu === 'admin_cancelar_reclamo')
            return (0, reclamos_1.handleCancelarReclamo)(session, input);
        if (currentMenu === 'admin_rondas')
            return (0, rondas_2.handleAdminRondas)(session, input);
        if (currentMenu === 'admin_rondas_unassigned')
            return (0, rondas_2.handleAdminRondasUnassigned)(session, input);
        if (currentMenu === 'admin_ronda_detalle')
            return (0, rondas_2.handleAdminRondaDetalle)(session, input);
        if (currentMenu === 'admin_rondas_assign')
            return (0, rondas_2.handleAdminRondasAssign)(session, input);
        if (currentMenu === 'admin_rondas_create')
            return (0, rondas_2.handleAdminRondasCreate)(session, input);
        if (currentMenu === 'admin_rondas_create_custom')
            return (0, rondas_2.handleAdminRondasCreateCustom)(session, input);
        if (currentMenu === 'admin_rondas_create_location')
            return (0, rondas_2.handleAdminRondasCreateLocation)(session, input);
        if (currentMenu === 'admin_rondas_by_employee')
            return (0, rondas_2.handleAdminRondasByEmployee)(session, input);
        if (currentMenu === 'admin_leads_sin_asignar')
            return (0, leads_1.handleAdminLeadsSinAsignar)(session, input);
        if (currentMenu === 'admin_lead_detalle')
            return (0, leads_1.handleAdminLeadDetalle)(session, input);
        if (currentMenu === 'admin_lead_elegir_vendedor')
            return (0, leads_1.handleAdminLeadElegirVendedor)(session, input);
        if (currentMenu === 'admin_lead_confirmar')
            return (0, leads_1.handleAdminLeadConfirmar)(session, input);
        if (currentMenu === 'admin_bot_autorespuesta')
            return (0, leads_1.handleAdminBotAutorespuesta)(session, input);
    }
    // ── VENTAS ────────────────────────────────────────────────────────────────────
    if (userType === 'sales') {
        if (currentMenu === 'main') {
            if (input === '1') {
                await (0, session_1.navigateTo)(session, 'sales_bandeja', { page: 1 });
                return (0, leads_2.buildBandeja)({ ...session, currentMenu: 'sales_bandeja', contextData: { page: 1 } });
            }
            if (input === '2') {
                await (0, session_1.navigateTo)(session, 'sales_nuevo_lead_p1', { pendingText: true });
                return (0, leads_2.buildNuevoLeadPaso1)();
            }
            if (input === '3') {
                await (0, session_1.navigateTo)(session, 'sales_leads', { page: 1 });
                return (0, leads_2.buildLeadsLista)({ ...session, currentMenu: 'sales_leads', contextData: { page: 1 } });
            }
            if (input === '0')
                return (0, main_1.buildHelpMessage)('sales');
            return invalidMenuOption(await (0, main_1.buildSalesMainMenu)(session));
        }
        if (currentMenu === 'sales_estado_leads')
            return null;
        if (currentMenu === 'sales_bandeja')
            return (0, leads_2.handleBandeja)(session, input);
        if (currentMenu === 'sales_leads')
            return (0, leads_2.handleLeadsLista)(session, input);
        if (currentMenu === 'sales_lead_detalle')
            return (0, leads_2.handleLeadDetalle)(session, input);
        if (currentMenu === 'sales_lead_nota')
            return (0, leads_2.handleLeadNota)(session, input);
        if (currentMenu === 'sales_nuevo_lead_p1')
            return (0, leads_2.handleNuevoLeadPaso1)(session, input);
        if (currentMenu === 'sales_nuevo_lead_p2')
            return (0, leads_2.handleNuevoLeadPaso2)(session, input);
        if (currentMenu === 'sales_nuevo_lead_p3')
            return (0, leads_2.handleNuevoLeadPaso3)(session, input);
        if (currentMenu === 'sales_nuevo_lead_p4')
            return (0, leads_2.handleNuevoLeadPaso4)(session, input);
        if (currentMenu === 'sales_nuevo_lead_confirmar')
            return (0, leads_2.handleNuevoLeadConfirmar)(session, input);
        if (currentMenu === 'sales_leads_libre')
            return (0, leads_2.handleLeadsLibre)(session, input);
        if (currentMenu === 'sales_lead_libre_detalle')
            return (0, leads_2.handleLeadLibreDetalle)(session, input);
    }
    // ── PÚBLICO (no registrado) ───────────────────────────────────────────────────
    if (userType === 'public') {
        if (currentMenu === 'lead_respondio')
            return (0, lead_response_1.handleLeadRespondio)(session, input);
        if (currentMenu === 'lead_visita')
            return (0, lead_response_1.handleLeadVisita)(session, input);
        if (currentMenu === 'lead_consulta')
            return (0, lead_response_1.handleLeadConsulta)(session, input);
        if (currentMenu === 'main')
            return (0, comercial_1.handlePublicMain)(session, input);
        if (currentMenu === 'public_alquiler_p1')
            return (0, comercial_1.handlePublicAlquilerP1)(session, input);
        if (currentMenu === 'public_alquiler_p2')
            return (0, comercial_1.handlePublicAlquilerP2)(session, input);
        if (currentMenu === 'public_alquiler_p3')
            return (0, comercial_1.handlePublicAlquilerP3)(session, input);
        if (currentMenu === 'public_alquiler_p3_otro')
            return (0, comercial_1.handlePublicAlquilerP3Otro)(session, input);
        if (currentMenu === 'public_alquiler_p4')
            return (0, comercial_1.handlePublicAlquilerP4)(session, input);
        if (currentMenu === 'public_alquiler_p5')
            return (0, comercial_1.handlePublicAlquilerP5)(session, input);
        if (currentMenu === 'public_alquiler_p6')
            return (0, comercial_1.handlePublicAlquilerP6)(session, input);
        if (currentMenu === 'public_alquiler_p7')
            return (0, comercial_1.handlePublicAlquilerP7)(session, input);
        if (currentMenu === 'public_alquiler_confirmar')
            return (0, comercial_1.handlePublicAlquilerConfirmar)(session, input);
        if (currentMenu === 'public_visita_p1')
            return (0, comercial_1.handlePublicVisitaP1)(session, input);
        if (currentMenu === 'public_visita_p2')
            return (0, comercial_1.handlePublicVisitaP2)(session, input);
        if (currentMenu === 'public_visita_p3')
            return (0, comercial_1.handlePublicVisitaP3)(session, input);
        if (currentMenu === 'public_ubicacion')
            return (0, comercial_1.handlePublicUbicacion)(session, input);
        if (currentMenu === 'public_asesor_p1')
            return (0, comercial_1.handlePublicAsesorP1)(session, input);
        if (currentMenu === 'public_asesor_p2')
            return (0, comercial_1.handlePublicAsesorP2)(session, input);
        if (currentMenu === 'public_reclamo_p1')
            return (0, comercial_1.handlePublicReclamoP1)(session, input);
        if (currentMenu === 'public_reclamo_p2')
            return (0, comercial_1.handlePublicReclamoP2)(session, input);
        if (currentMenu === 'public_mensaje_p1')
            return (0, comercial_1.handlePublicMensajeP1)(session, input);
        if (currentMenu === 'public_mensaje_p2')
            return (0, comercial_1.handlePublicMensajeP2)(session, input);
    }
    // Menú desconocido → reset al principal
    await (0, session_1.resetToMain)(session);
    return buildMainMenu(session);
}
// ── Helpers ────────────────────────────────────────────────────────────────────
async function buildMainMenu(session) {
    if (session.userType === 'employee')
        return (0, main_1.buildEmployeeMainMenu)(session);
    if (session.userType === 'admin')
        return (0, main_1.buildAdminMainMenu)(session);
    if (session.userType === 'public')
        return (0, comercial_1.buildPublicMainMenu)();
    return (0, main_1.buildSalesMainMenu)(session);
}
async function buildMenuDisplay(session, menuName) {
    // Reconstruir la vista del menú al que se volvió
    const { userType, contextData } = session;
    if (menuName === 'main')
        return buildMainMenu(session);
    if (userType === 'employee') {
        if (menuName === 'tarea_actual')
            return (0, tareas_1.buildTareaActual)(session);
        if (menuName === 'tareas_lista')
            return (0, tareas_1.buildTareasLista)(session);
        if (menuName === 'tarea_detalle')
            return (0, tareas_1.buildTareaDetalle)(session);
        if (menuName === 'asistencia')
            return (0, asistencia_1.buildAsistenciaMenu)(session);
        if (menuName === 'rondas_lista')
            return (0, rondas_1.buildRondasLista)(session);
    }
    if (userType === 'admin') {
        if (menuName === 'admin_reclamos_home')
            return (0, main_1.buildAdminReclamosMenu)(session);
        if (menuName === 'admin_operacion_home')
            return (0, main_1.buildAdminOperationMenu)(session);
        if (menuName === 'admin_reclamos')
            return (0, reclamos_1.buildReclamosPendientes)(session);
        if (menuName === 'admin_urgentes')
            return (0, reclamos_1.buildReclamosPendientes)(session, 'urgentes');
        if (menuName === 'admin_sin_asignar')
            return (0, reclamos_1.buildReclamosPendientes)(session, 'sin_asignar');
        if (menuName === 'admin_reclamo_detalle') {
            const { reporteId } = session.contextData;
            if (reporteId) {
                const { getReporteById } = await Promise.resolve().then(() => __importStar(require('../db')));
                const r = await getReporteById(reporteId);
                if (r)
                    return (0, reclamos_1.buildAdminReclamoDetalle)(r);
            }
        }
        if (menuName === 'admin_rondas')
            return (0, rondas_2.buildAdminRondasMenu)(session);
        if (menuName === 'admin_rondas_unassigned')
            return (0, rondas_2.buildAdminRondasUnassigned)(session);
        if (menuName === 'admin_leads_sin_asignar')
            return (0, leads_1.buildAdminLeadsSinAsignar)(session);
        if (menuName === 'admin_lead_detalle') {
            const { leadId } = session.contextData;
            if (leadId) {
                const { getLeadById } = await Promise.resolve().then(() => __importStar(require('../db')));
                const lead = await getLeadById(Number(leadId));
                if (lead) {
                    const { buildAdminLeadDetalleDisplay } = await Promise.resolve().then(() => __importStar(require('./menus/admin/leads')));
                    return buildAdminLeadDetalleDisplay(lead);
                }
            }
        }
        if (menuName === 'admin_bot_autorespuesta')
            return (0, leads_1.buildAdminBotAutorespuesta)();
        if (menuName === 'admin_nueva_tarea_p1')
            return (0, tasks_1.buildNuevaTareaP1)(session);
        if (menuName === 'admin_nueva_tarea_p2')
            return (0, tasks_1.buildNuevaTareaP2)(session.contextData.tareaEmpleadoNombre);
        if (menuName === 'admin_nueva_tarea_p3')
            return (0, tasks_1.buildNuevaTareaP3)();
        if (menuName === 'admin_nueva_tarea_confirmar')
            return (0, tasks_1.buildNuevaTareaConfirmar)(session);
        if (menuName === 'admin_ronda_detalle') {
            const { rondaId } = session.contextData;
            if (rondaId) {
                const { getRoundOccurrenceById } = await Promise.resolve().then(() => __importStar(require('../db')));
                const occurrence = await getRoundOccurrenceById(Number(rondaId));
                if (occurrence)
                    return (0, rondas_2.buildAdminRondaDetalle)(occurrence);
            }
        }
    }
    if (userType === 'sales') {
        if (menuName === 'sales_bandeja')
            return (0, leads_2.buildBandeja)(session);
        if (menuName === 'sales_leads')
            return (0, leads_2.buildLeadsLista)(session);
        if (menuName === 'sales_leads_libre')
            return (0, leads_2.buildLeadsLibre)(session);
        if (menuName === 'sales_estado_leads')
            return (0, leads_2.buildEstadoLeads)(session);
    }
    if (userType === 'public') {
        if (menuName === 'lead_respondio') {
            const lead = await (0, db_1.getLeadByWaId)(session.waNumber);
            return (0, lead_response_1.buildLeadRespondioMenu)(lead?.nombre ?? 'ahi');
        }
        if (menuName === 'public_alquiler_p1')
            return (0, comercial_1.buildPublicAlquilerP1)();
        if (menuName === 'public_alquiler_p2')
            return (0, comercial_1.buildPublicAlquilerP2)();
        if (menuName === 'public_alquiler_p3')
            return (0, comercial_1.buildPublicAlquilerP3)();
        if (menuName === 'public_alquiler_p4')
            return (0, comercial_1.buildPublicAlquilerP4)();
        if (menuName === 'public_alquiler_p5')
            return (0, comercial_1.buildPublicAlquilerP5)();
        if (menuName === 'public_alquiler_p6')
            return (0, comercial_1.buildPublicAlquilerP6)();
        if (menuName === 'public_alquiler_p7')
            return (0, comercial_1.buildPublicAlquilerP7)();
        if (menuName === 'public_alquiler_confirmar')
            return (0, comercial_1.buildPublicAlquilerConfirmar)(session.contextData);
        if (menuName === 'public_visita_p1')
            return (0, comercial_1.buildPublicVisitaP1)();
        if (menuName === 'public_visita_p2')
            return (0, comercial_1.buildPublicVisitaP2)();
        if (menuName === 'public_visita_p3')
            return (0, comercial_1.buildPublicVisitaP3)();
        if (menuName === 'public_ubicacion')
            return (0, comercial_1.buildPublicUbicacion)();
        if (menuName === 'public_asesor_p1')
            return (0, comercial_1.buildPublicAsesorP1)();
        if (menuName === 'public_asesor_p2')
            return (0, comercial_1.buildPublicAsesorP2)();
        if (menuName === 'public_reclamo_p1')
            return (0, comercial_1.buildPublicReclamoP1)();
        if (menuName === 'public_reclamo_p2')
            return (0, comercial_1.buildPublicReclamoP2)();
        if (menuName === 'public_mensaje_p1')
            return (0, comercial_1.buildPublicMensajeP1)();
        if (menuName === 'public_mensaje_p2')
            return (0, comercial_1.buildPublicMensajeP2)();
    }
    return buildMainMenu(session);
}
function invalidMenuOption(menuText) {
    return `❓ *Opción no válida.* Ingresá el número de la opción:\n\n${menuText}`;
}
function isAttendanceShortcut(input) {
    const normalized = normalizeBotText(input);
    if (!normalized || /^\d+$/.test(normalized))
        return false;
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
    ].some(pattern => normalized === pattern || normalized.includes(pattern));
}
function normalizeBotText(input) {
    return input
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}
