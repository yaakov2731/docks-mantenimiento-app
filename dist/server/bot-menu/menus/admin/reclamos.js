"use strict";
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
exports.buildReclamosPendientes = buildReclamosPendientes;
exports.handleReclamosPendientes = handleReclamosPendientes;
exports.buildAdminReclamoDetalle = buildAdminReclamoDetalle;
exports.handleAdminReclamoDetalle = handleAdminReclamoDetalle;
exports.handleAsignarEmpleado = handleAsignarEmpleado;
exports.handleAsignarConfirmar = handleAsignarConfirmar;
exports.handleCambiarPrioridad = handleCambiarPrioridad;
exports.handleCancelarReclamo = handleCancelarReclamo;
exports.buildEstadoGeneral = buildEstadoGeneral;
exports.buildEstadoRondas = buildEstadoRondas;
exports.buildSLAVencidos = buildSLAVencidos;
/**
 * Flujo de Reclamos para administradores/gerentes.
 * admin_reclamos → admin_reclamo_detalle → admin_asignar_empleado → admin_asignar_confirmar
 */
const session_1 = require("../../session");
const guards_1 = require("../../shared/guards");
const db_1 = require("../../../db");
const reporte_assignment_1 = require("../../../reporte-assignment");
const PAGE_SIZE = 5;
// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtFechaRelativa(date) {
    if (!date)
        return '—';
    const d = date instanceof Date ? date : new Date(Number(date) * 1000);
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 2)
        return 'ahora';
    if (mins < 60)
        return `hace ${mins}m`;
    const hs = Math.floor(mins / 60);
    if (hs < 24)
        return `hace ${hs}h`;
    return `hace ${Math.floor(hs / 24)}d`;
}
function serializeReclamo(r) {
    return {
        id: r.id,
        titulo: r.titulo,
        local: r.local,
        planta: r.planta,
        prioridad: r.prioridad,
        estado: r.estado,
        asignacionEstado: r.asignacionEstado,
        asignadoA: r.asignadoA ?? null,
        asignadoId: r.asignadoId ?? null,
        descripcion: r.descripcion,
        locatario: r.locatario,
        createdAt: r.createdAt,
        sla: (0, db_1.calcularSLA)(r.prioridad, r.createdAt),
    };
}
async function getReclamosPendientes() {
    const reportes = await (0, db_1.getReportes)();
    return reportes
        .filter(r => !['completado', 'cancelado'].includes(r.estado))
        .map(serializeReclamo)
        .sort((a, b) => {
        // urgente primero, luego sin asignar, luego por antigüedad
        const prank = { urgente: 4, alta: 3, media: 2, baja: 1 };
        const pd = (prank[b.prioridad] ?? 0) - (prank[a.prioridad] ?? 0);
        if (pd !== 0)
            return pd;
        if (!a.asignadoId && b.asignadoId)
            return -1;
        if (a.asignadoId && !b.asignadoId)
            return 1;
        return 0;
    });
}
// ─── Lista reclamos pendientes ────────────────────────────────────────────────
async function buildReclamosPendientes(session, filtro) {
    let todos = await getReclamosPendientes();
    if (filtro === 'urgentes')
        todos = todos.filter(r => r.prioridad === 'urgente' && !r.asignadoId);
    if (filtro === 'sin_asignar')
        todos = todos.filter(r => !r.asignadoId);
    const page = session.contextData.page ?? 1;
    const paged = (0, guards_1.paginate)(todos, page, PAGE_SIZE);
    if (todos.length === 0) {
        const msg = filtro === 'urgentes' ? '✅ No hay urgentes sin asignar.'
            : filtro === 'sin_asignar' ? '✅ No hay reclamos sin asignar.'
                : '✅ No hay reclamos pendientes.';
        return `📋 *Reclamos*\n${guards_1.SEP}\n${msg}\n${guards_1.SEP}\n0️⃣  Volver`;
    }
    const titulo = filtro === 'urgentes'
        ? `🔴 *Urgentes sin asignar* (${todos.length})`
        : filtro === 'sin_asignar'
            ? `👷 *Sin asignar* (${todos.length})`
            : `📋 *Reclamos pendientes* (${todos.length})`;
    const lines = [titulo, guards_1.SEP];
    paged.items.forEach((r, i) => {
        const n = (page - 1) * PAGE_SIZE + i + 1;
        const asign = r.asignadoA ? `👷 ${r.asignadoA}` : `⚠️ Sin asignar`;
        const slaStr = r.sla.vencida ? ` 🚨 SLA VENCIDO` : r.sla.enRiesgo ? ` ⚠️ SLA en riesgo` : '';
        lines.push(`${n}️⃣  ${(0, guards_1.prioEmoji)(r.prioridad)} #${r.id} — ${r.titulo}${slaStr}`, `   📍 ${r.local} | ${asign} | ${fmtFechaRelativa(r.createdAt)}`);
    });
    lines.push(guards_1.SEP);
    if (paged.hasPrev)
        lines.push(`8️⃣  ◀️ Anterior`);
    if (paged.hasNext)
        lines.push(`9️⃣  ▶️ Ver más`);
    lines.push(`0️⃣  Volver`);
    return lines.join('\n');
}
async function handleReclamosPendientes(session, input, filtro) {
    let todos = await getReclamosPendientes();
    if (filtro === 'urgentes')
        todos = todos.filter(r => r.prioridad === 'urgente' && !r.asignadoId);
    if (filtro === 'sin_asignar')
        todos = todos.filter(r => !r.asignadoId);
    const page = session.contextData.page ?? 1;
    const paged = (0, guards_1.paginate)(todos, page, PAGE_SIZE);
    if (input === '8' && paged.hasPrev) {
        const ctx = { ...session.contextData, page: page - 1, filtroReclamos: filtro };
        await (0, session_1.navigateTo)(session, session.currentMenu, ctx);
        return buildReclamosPendientes({ ...session, contextData: ctx }, filtro);
    }
    if (input === '9' && paged.hasNext) {
        const ctx = { ...session.contextData, page: page + 1, filtroReclamos: filtro };
        await (0, session_1.navigateTo)(session, session.currentMenu, ctx);
        return buildReclamosPendientes({ ...session, contextData: ctx }, filtro);
    }
    if (input === '0')
        return null;
    const opt = (0, guards_1.parseMenuOption)(input, paged.items.length);
    if (!opt)
        return (0, guards_1.invalidOption)(await buildReclamosPendientes(session, filtro));
    const reclamo = paged.items[opt - 1];
    await (0, session_1.navigateTo)(session, 'admin_reclamo_detalle', {
        reporteId: reclamo.id,
        prevMenu: session.currentMenu,
    });
    return buildAdminReclamoDetalle(reclamo);
}
// ─── Detalle reclamo (admin) ──────────────────────────────────────────────────
function buildAdminReclamoDetalle(r) {
    const asign = r.asignadoA
        ? `👷 ${r.asignadoA} (${r.asignacionEstado})`
        : `⚠️ Sin asignar`;
    const slaStr = r.sla.vencida
        ? `🚨 *VENCIDO* (${r.sla.elapsedMins} min)`
        : r.sla.enRiesgo
            ? `⚠️ En riesgo — ${r.sla.minRestantes} min restantes`
            : `✅ OK — ${r.sla.minRestantes} min restantes`;
    const lines = [
        `📌 *Reclamo #${r.id}* — ${r.prioridad.toUpperCase()}`,
        guards_1.SEP,
        `📍 ${r.local} (planta ${r.planta})`,
        `🔧 ${r.titulo}`,
        `📝 ${r.descripcion.substring(0, 120)}${r.descripcion.length > 120 ? '...' : ''}`,
        `👤 Locatario: ${r.locatario}`,
        `📅 Creado: ${fmtFechaRelativa(r.createdAt)}`,
        `⏱️ SLA: ${slaStr}`,
        guards_1.SEP,
        `Asignación: ${asign}`,
        guards_1.SEP,
        `1️⃣  👷 Asignar a empleado`,
        `2️⃣  ⚡ Cambiar prioridad`,
        `3️⃣  📄 Ver descripción completa`,
        `4️⃣  ❌ Cancelar reclamo`,
        `0️⃣  Volver`,
    ];
    return lines.join('\n');
}
async function handleAdminReclamoDetalle(session, input) {
    const { reporteId } = session.contextData;
    if (!reporteId)
        return (0, guards_1.errorMsg)('No se encontró el reclamo.');
    const reporte = await (0, db_1.getReporteById)(reporteId);
    if (!reporte)
        return (0, guards_1.errorMsg)('Reclamo no encontrado.');
    const r = serializeReclamo(reporte);
    if (input === '1') {
        await (0, session_1.navigateTo)(session, 'admin_asignar_empleado', { reporteId });
        return buildAsignarEmpleado(r);
    }
    if (input === '2') {
        await (0, session_1.navigateTo)(session, 'admin_cambiar_prioridad', { reporteId });
        return buildCambiarPrioridad(r);
    }
    if (input === '3') {
        return `📝 *Descripción completa #${r.id}:*\n\n${r.descripcion}\n\n${guards_1.SEP}\n0️⃣  Volver`;
    }
    if (input === '4') {
        await (0, session_1.navigateTo)(session, 'admin_cancelar_reclamo', { reporteId });
        return (0, guards_1.confirmMsg)(`¿Cancelar reclamo #${r.id}?\n📍 ${r.titulo}`, 'Sí, cancelar');
    }
    if (input === '0')
        return null;
    return (0, guards_1.invalidOption)(buildAdminReclamoDetalle(r));
}
// ─── Asignar empleado ─────────────────────────────────────────────────────────
async function buildAsignarEmpleado(reclamo) {
    const { getEmpleados } = await Promise.resolve().then(() => __importStar(require('../../../db')));
    const empleados = (await getEmpleados()).filter((e) => e.activo);
    if (empleados.length === 0) {
        return `⚠️ No hay empleados activos registrados.\n\n0️⃣  Volver`;
    }
    const lines = [
        `👷 *Asignar Reclamo #${reclamo.id}*`,
        `🔧 ${reclamo.titulo}`,
        guards_1.SEP,
        `Empleados disponibles:`,
    ];
    empleados.slice(0, 8).forEach((e, i) => {
        lines.push(`${i + 1}️⃣  ${e.nombre}${e.especialidad ? ` — ${e.especialidad}` : ''}`);
    });
    lines.push(guards_1.SEP, `0️⃣  Cancelar`);
    return lines.join('\n');
}
async function handleAsignarEmpleado(session, input) {
    const { reporteId } = session.contextData;
    if (!reporteId)
        return (0, guards_1.errorMsg)('No se encontró el reclamo.');
    const { getEmpleados } = await Promise.resolve().then(() => __importStar(require('../../../db')));
    const empleados = (await getEmpleados()).filter((e) => e.activo).slice(0, 8);
    if (input === '0')
        return null;
    const opt = (0, guards_1.parseMenuOption)(input, empleados.length);
    if (!opt) {
        const reporte = await (0, db_1.getReporteById)(reporteId);
        if (!reporte)
            return (0, guards_1.errorMsg)('Reclamo no encontrado.');
        return (0, guards_1.invalidOption)(await buildAsignarEmpleado(serializeReclamo(reporte)));
    }
    const empleado = empleados[opt - 1];
    if (!empleado)
        return (0, guards_1.errorMsg)('Empleado no encontrado.');
    await (0, session_1.navigateTo)(session, 'admin_asignar_confirmar', {
        reporteId,
        empleadoId: empleado.id,
        empleadoNombre: empleado.nombre,
    });
    return (0, guards_1.confirmMsg)(`¿Asignar a *${empleado.nombre}*?\n\nReclamo #${reporteId}`, `Sí, asignar a ${empleado.nombre}`);
}
async function handleAsignarConfirmar(session, input) {
    const { reporteId, empleadoId, empleadoNombre } = session.contextData;
    if (!reporteId || !empleadoId)
        return (0, guards_1.errorMsg)('Datos incompletos.');
    if (input === '2') {
        await (0, session_1.navigateBack)(session);
        return null;
    }
    if (input !== '1') {
        return (0, guards_1.invalidOption)((0, guards_1.confirmMsg)(`¿Asignar a *${empleadoNombre}*?\n\nReclamo #${reporteId}`, `Sí, asignar`));
    }
    try {
        await (0, reporte_assignment_1.assignReporteToEmployee)({
            reporteId: reporteId,
            empleadoId: empleadoId,
            empleadoNombre: empleadoNombre,
            actor: { id: session.userId, name: session.userName },
        });
        await (0, session_1.navigateTo)(session, 'admin_reclamos', { page: 1 });
        return [
            `✅ *Reclamo #${reporteId} asignado.*`,
            ``,
            `👷 Asignado a: *${empleadoNombre}*`,
            `Se envió notificación al empleado por WhatsApp.`,
            ``,
            `0️⃣  Volver a reclamos`,
        ].join('\n');
    }
    catch (e) {
        return (0, guards_1.errorMsg)(e?.message ?? 'No se pudo asignar el reclamo.');
    }
}
// ─── Cambiar prioridad ────────────────────────────────────────────────────────
function buildCambiarPrioridad(r) {
    return [
        `⚡ *Cambiar prioridad — Reclamo #${r.id}*`,
        `Prioridad actual: ${(0, guards_1.prioEmoji)(r.prioridad)} ${r.prioridad.toUpperCase()}`,
        guards_1.SEP,
        `1️⃣  🟢 Baja`,
        `2️⃣  🟡 Media`,
        `3️⃣  🟠 Alta`,
        `4️⃣  🔴 Urgente`,
        `0️⃣  Cancelar`,
    ].join('\n');
}
const PRIORIDADES_MAP = { '1': 'baja', '2': 'media', '3': 'alta', '4': 'urgente' };
async function handleCambiarPrioridad(session, input) {
    const { reporteId } = session.contextData;
    if (!reporteId)
        return (0, guards_1.errorMsg)('No se encontró el reclamo.');
    if (input === '0')
        return null;
    const prioridad = PRIORIDADES_MAP[input];
    if (!prioridad) {
        const reporte = await (0, db_1.getReporteById)(reporteId);
        if (!reporte)
            return (0, guards_1.errorMsg)('Reclamo no encontrado.');
        return (0, guards_1.invalidOption)(buildCambiarPrioridad(serializeReclamo(reporte)));
    }
    const { actualizarReporte, crearActualizacion } = await Promise.resolve().then(() => __importStar(require('../../../db')));
    await actualizarReporte(reporteId, { prioridad });
    await crearActualizacion({
        reporteId,
        usuarioNombre: session.userName,
        tipo: 'estado',
        descripcion: `${session.userName} cambió la prioridad a ${prioridad}`,
    });
    await (0, session_1.navigateTo)(session, 'admin_reclamos', { page: 1 });
    return `✅ Prioridad actualizada a *${prioridad.toUpperCase()}*.\n\n0️⃣  Volver`;
}
// ─── Cancelar reclamo ─────────────────────────────────────────────────────────
async function handleCancelarReclamo(session, input) {
    const { reporteId } = session.contextData;
    if (!reporteId)
        return (0, guards_1.errorMsg)('No se encontró el reclamo.');
    if (input === '2')
        return null;
    if (input !== '1')
        return (0, guards_1.invalidOption)((0, guards_1.confirmMsg)(`¿Cancelar reclamo #${reporteId}?`));
    const { actualizarReporte, crearActualizacion } = await Promise.resolve().then(() => __importStar(require('../../../db')));
    await actualizarReporte(reporteId, { estado: 'cancelado' });
    await crearActualizacion({
        reporteId,
        usuarioNombre: session.userName,
        tipo: 'estado',
        descripcion: `${session.userName} canceló el reclamo`,
        estadoNuevo: 'cancelado',
    });
    await (0, session_1.navigateTo)(session, 'admin_reclamos', { page: 1 });
    return `✅ Reclamo #${reporteId} cancelado.\n\n0️⃣  Volver`;
}
// ─── Estado general del día ───────────────────────────────────────────────────
async function buildEstadoGeneral(session) {
    const [reportes, botStatus, pendingMsgs, tareasOverview] = await Promise.all([
        (0, db_1.getReportes)(),
        (0, db_1.getBotConnectionStatus)(),
        (0, db_1.getPendingBotMessages)(),
        (0, db_1.getOperationalTasksOverview)(),
    ]);
    const vencidos = reportes.filter(r => {
        if (['completado', 'cancelado'].includes(r.estado))
            return false;
        return (0, db_1.calcularSLA)(r.prioridad, r.createdAt).vencida;
    });
    const abiertos = reportes.filter(r => !['completado', 'cancelado'].includes(r.estado));
    const completadosHoy = reportes.filter(r => {
        if (r.estado !== 'completado' || !r.completadoAt)
            return false;
        const hoy = new Date();
        const d = r.completadoAt instanceof Date ? r.completadoAt : new Date(Number(r.completadoAt) * 1000);
        return d.toDateString() === hoy.toDateString();
    });
    const urgentesLibres = abiertos.filter(r => r.prioridad === 'urgente' && !r.asignadoId);
    const enProgreso = abiertos.filter(r => r.estado === 'en_progreso');
    const sinAsignar = abiertos.filter(r => !r.asignadoId);
    const botStr = botStatus.connected
        ? `🟢 Conectado`
        : `🔴 Desconectado (${botStatus.minutesSince ?? '?'} min sin responder)`;
    const today = new Date().toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long',
        timeZone: 'America/Argentina/Buenos_Aires',
    });
    // Resumen por empleado (solo los que tienen algo hoy)
    const empleadosLines = tareasOverview.porEmpleado
        .filter(e => e.activas + e.pausadas + e.pendientes + e.terminadasHoy > 0)
        .map(e => {
        const parts = [];
        if (e.activas > 0)
            parts.push(`▶️${e.activas}`);
        if (e.pausadas > 0)
            parts.push(`⏸️${e.pausadas}`);
        if (e.pendientes > 0)
            parts.push(`⏳${e.pendientes}`);
        if (e.terminadasHoy > 0)
            parts.push(`✅${e.terminadasHoy}`);
        return `  👷 ${e.empleadoNombre}: ${parts.join(' ')}`;
    });
    return [
        `📊 *Estado general — Docks del Puerto*`,
        `📅 ${today}`,
        guards_1.SEP,
        `📋 *Reclamos abiertos: ${abiertos.length}*`,
        `  ▶️ En progreso: ${enProgreso.length}`,
        `  ⚠️  Sin asignar: ${sinAsignar.length}`,
        `  🔴 Urgentes sin asignar: ${urgentesLibres.length}`,
        `  🚨 SLA vencidos: ${vencidos.length}`,
        `  ✅ Completados hoy: ${completadosHoy.length}`,
        guards_1.SEP,
        `📋 *Tareas operativas: ${tareasOverview.total}*`,
        `  ▶️ En progreso: ${tareasOverview.activas}`,
        `  ⏸️ Pausadas: ${tareasOverview.pausadas}`,
        `  ⏳ Sin aceptar: ${tareasOverview.pendientesConfirmacion}`,
        `  ✅ Finalizadas hoy: ${tareasOverview.terminadasHoy}`,
        tareasOverview.rechazadasHoy > 0 ? `  ❌ Rechazadas hoy: ${tareasOverview.rechazadasHoy}` : '',
        ...empleadosLines,
        guards_1.SEP,
        `🤖 Bot WhatsApp: ${botStr}`,
        pendingMsgs.length > 0 ? `  📨 Mensajes en cola: ${pendingMsgs.length}` : '',
        guards_1.SEP,
        `0️⃣  Volver al menú principal`,
    ].filter(Boolean).join('\n');
}
// ─── Rondas de baños (admin) ──────────────────────────────────────────────────
async function buildEstadoRondas() {
    try {
        const { createClient } = await Promise.resolve().then(() => __importStar(require('@libsql/client')));
        const { drizzle } = await Promise.resolve().then(() => __importStar(require('drizzle-orm/libsql')));
        const { eq, and } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
        const schema = await Promise.resolve().then(() => __importStar(require('../../../../drizzle/schema')));
        const { readEnv } = await Promise.resolve().then(() => __importStar(require('../../../_core/env')));
        const cl = createClient({ url: readEnv('TURSO_URL'), authToken: readEnv('TURSO_TOKEN') });
        const db = drizzle(cl, { schema });
        const hoy = new Date().toISOString().split('T')[0];
        const rondas = await db.select().from(schema.rondasOcurrencia)
            .where(eq(schema.rondasOcurrencia.fechaOperativa, hoy));
        const total = rondas.length;
        const cumplidas = rondas.filter(r => r.estado === 'cumplido').length;
        const conObs = rondas.filter(r => r.estado === 'cumplido_con_observacion').length;
        const vencidas = rondas.filter(r => r.estado === 'vencido').length;
        const pendientes = rondas.filter(r => r.estado === 'pendiente').length;
        return [
            `🚻 *Estado rondas de baños — Hoy*`,
            guards_1.SEP,
            `Total programadas: ${total}`,
            `✅ Cumplidas: ${cumplidas}`,
            `⚠️  Con observación: ${conObs}`,
            `❌ Vencidas: ${vencidas}`,
            `⏳ Pendientes: ${pendientes}`,
            guards_1.SEP,
            `0️⃣  Volver al menú principal`,
        ].join('\n');
    }
    catch {
        return `🚻 No se pudo obtener el estado de rondas.\n\n0️⃣  Volver`;
    }
}
// ─── SLA vencidos ─────────────────────────────────────────────────────────────
async function buildSLAVencidos() {
    const vencidos = await (0, db_1.getReportesVencidos)();
    if (vencidos.length === 0) {
        return `✅ *No hay reclamos con SLA vencido.*\n\n0️⃣  Volver`;
    }
    const lines = [
        `🚨 *Reclamos con SLA vencido* (${vencidos.length})`,
        guards_1.SEP,
    ];
    vencidos.slice(0, 8).forEach((r, i) => {
        const asign = r.asignadoA ? `${r.asignadoA}` : 'Sin asignar';
        lines.push(`${i + 1}️⃣  ${(0, guards_1.prioEmoji)(r.prioridad)} #${r.id} — ${r.titulo}`, `   ⏱️ ${r.sla.elapsedMins} min vencido | ${asign}`);
    });
    lines.push(guards_1.SEP, `0️⃣  Volver`);
    return lines.join('\n');
}
