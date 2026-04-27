"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEmployeeMainMenu = buildEmployeeMainMenu;
exports.buildAdminMainMenu = buildAdminMainMenu;
exports.buildAdminReclamosMenu = buildAdminReclamosMenu;
exports.buildAdminOperationMenu = buildAdminOperationMenu;
exports.buildSalesMainMenu = buildSalesMainMenu;
exports.buildHelpMessage = buildHelpMessage;
const guards_1 = require("../shared/guards");
const db_1 = require("../../db");
const leads_1 = require("./sales/leads");
// ─── Empleado ────────────────────────────────────────────────────────────────
function isEmployeeTaskClosed(task) {
    const estado = task.estado ?? '';
    return ['completado', 'cancelado', 'terminada', 'rechazada'].includes(estado);
}
function isPendingConfirmation(task) {
    return task.asignacionEstado === 'pendiente_confirmacion'
        || task.estado === 'pendiente_confirmacion';
}
function employeeTaskRank(task) {
    if (isPendingConfirmation(task))
        return 0;
    switch (task.estado) {
        case 'en_progreso': return 1;
        case 'pausado':
        case 'pausada': return 2;
        case 'pendiente': return 3;
        case 'pendiente_asignacion': return 4;
        default: return 5;
    }
}
function buildFeaturedTaskLabel(task) {
    const isOperation = task.ubicacion !== undefined || task.checklistObjetivo !== undefined || task.ordenAsignacion !== undefined;
    const kind = isOperation ? 'Op.' : 'Rec.';
    return `${kind} #${task.id} — ${task.titulo}`;
}
async function buildEmployeeMainMenu(session) {
    const [reclamos, operaciones] = await Promise.all([
        (0, db_1.getTareasEmpleado)(session.userId),
        (0, db_1.listOperationalTasksByEmployee)(session.userId),
    ]);
    const tareasActivas = [
        ...reclamos,
        ...operaciones.filter(t => !['terminada', 'cancelada', 'rechazada'].includes(t.estado)),
    ].filter(t => !isEmployeeTaskClosed(t));
    const pendingConfirmation = tareasActivas.filter(isPendingConfirmation).length;
    const inProgress = tareasActivas.filter(t => t.estado === 'en_progreso').length;
    const featuredTask = [...tareasActivas].sort((left, right) => employeeTaskRank(left) - employeeTaskRank(right))[0];
    const summaryLines = featuredTask
        ? [
            `🎯 Siguiente: ${buildFeaturedTaskLabel(featuredTask)}`,
            `📋 Tenés ${tareasActivas.length} tarea${tareasActivas.length === 1 ? '' : 's'} activa${tareasActivas.length === 1 ? '' : 's'} (${pendingConfirmation} por aceptar, ${inProgress} en curso)`,
        ]
        : [
            `✅ No tenés tareas activas ahora.`,
            `Podés revisar el historial o registrar asistencia.`,
        ];
    return [
        `👷 *${session.userName}* — Menú principal`,
        guards_1.SEP,
        ...summaryLines,
        guards_1.SEP,
        `1️⃣  🎯 Ver mi tarea actual`,
        `2️⃣  📋 Ver todas mis tareas`,
        `3️⃣  🕐 Registrar asistencia`,
        `4️⃣  🚻 Control de baños`,
        guards_1.SEP,
        `0️⃣  ❓ Ayuda`,
    ].join('\n');
}
// ─── Admin / Gerente ──────────────────────────────────────────────────────────
async function buildAdminMainMenu(session) {
    const [reportes, leadsLibres] = await Promise.all([
        (0, db_1.getReportes)(),
        (0, db_1.listUnassignedLeads)(),
    ]);
    const abiertos = reportes.filter(r => !['completado', 'cancelado'].includes(r.estado));
    const urgentes = abiertos.filter(r => r.prioridad === 'urgente' && !r.asignadoId);
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
    ].join('\n');
}
function buildAdminReclamosMenu(_session) {
    return [
        `📋 *Reclamos*`,
        `🏢 Docks del Puerto`,
        guards_1.SEP,
        `1️⃣  Ver pendientes`,
        `2️⃣  Urgentes sin asignar`,
        `3️⃣  Sin asignar`,
        `4️⃣  SLA vencidos`,
        guards_1.SEP,
        `0️⃣  Volver`,
    ].join('\n');
}
function buildAdminOperationMenu(_session) {
    return [
        `📊 *Operación diaria*`,
        `🏢 Docks del Puerto`,
        guards_1.SEP,
        `1️⃣  Estado general del día`,
        `2️⃣  Asignar tarea a empleado`,
        guards_1.SEP,
        `0️⃣  Volver`,
    ].join('\n');
}
// ─── Ventas ──────────────────────────────────────────────────────────────────
async function buildSalesMainMenu(session) {
    const { misNuevos, libres } = await (0, leads_1.getSalesBandejaCount)(session.userId);
    const summaryLine = (misNuevos || libres)
        ? [
            misNuevos ? `📞 ${misNuevos} para llamar` : null,
            libres ? `📋 ${libres} disponible${libres !== 1 ? 's' : ''}` : null,
        ].filter(Boolean).join(' | ')
        : `✅ Todo al día`;
    return [
        `🎯 *${session.userName}* — Panel ventas`,
        `🏢 Docks del Puerto`,
        guards_1.SEP,
        summaryLine,
        guards_1.SEP,
        `1️⃣  📥 Bandeja de entrada`,
        `2️⃣  ➕ Registrar nuevo lead`,
        `3️⃣  📋 Todos mis leads`,
        guards_1.SEP,
        `0️⃣  ❓ Ayuda`,
    ].join('\n');
}
// ─── Ayuda por tipo ──────────────────────────────────────────────────────────
function buildHelpMessage(userType) {
    const base = [
        `❓ *Ayuda — Docks del Puerto*`,
        guards_1.SEP,
        `• Ingresá el *número* de la opción que querés usar`,
        `• *0* siempre vuelve al menú anterior`,
        `• *menú* o *inicio* te trae al menú principal`,
        `• Si no respondés en 10 minutos, la sesión se reinicia`,
        guards_1.SEP,
    ];
    if (userType === 'employee') {
        base.push(`🎯 *Mi tarea actual:* aceptar, finalizar o pausar más rápido`, `📋 *Ver todas mis tareas:* lista completa por si necesitás elegir otra`, `🕐 *Asistencia:* registrar entrada, salida y almuerzo`, `🚻 *Control de baños:* confirmar rondas programadas`);
    }
    else if (userType === 'admin') {
        base.push(`📋 *Reclamos:* ver, asignar y gestionar reclamos`, `📊 *Estado:* resumen del día y métricas`, `⚠️  *SLA:* tareas que superaron el tiempo límite`, `🚻 *Rondas:* asignar, reasignar y liberar rondas de baños`);
    }
    else {
        base.push(`📋 *Leads:* ver y gestionar leads asignados`, `➕ *Nuevo lead:* registrar consulta de potencial locatario`);
    }
    base.push(guards_1.SEP, `0️⃣  Volver al menú principal`);
    return base.join('\n');
}
