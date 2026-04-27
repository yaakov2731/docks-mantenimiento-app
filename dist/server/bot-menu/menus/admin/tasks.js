"use strict";
/**
 * Flujo: Asignar nueva tarea a empleado — bot administrativo
 *
 * admin_nueva_tarea_p1  → elegir empleado (lista paginada)
 * admin_nueva_tarea_p2  → descripción de la tarea (texto libre)
 * admin_nueva_tarea_p3  → prioridad
 * admin_nueva_tarea_confirmar → confirmar y crear
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildNuevaTareaP1 = buildNuevaTareaP1;
exports.handleNuevaTareaP1 = handleNuevaTareaP1;
exports.buildNuevaTareaP2 = buildNuevaTareaP2;
exports.handleNuevaTareaP2 = handleNuevaTareaP2;
exports.buildNuevaTareaP3 = buildNuevaTareaP3;
exports.handleNuevaTareaP3 = handleNuevaTareaP3;
exports.buildNuevaTareaConfirmar = buildNuevaTareaConfirmar;
exports.handleNuevaTareaConfirmar = handleNuevaTareaConfirmar;
const session_1 = require("../../session");
const guards_1 = require("../../shared/guards");
const db_1 = require("../../../db");
const PAGE_SIZE = 6;
const PRIO_MAP = {
    baja: '🟢 Baja',
    media: '🟡 Media',
    alta: '🟠 Alta',
    urgente: '🔴 Urgente',
};
// ─── Paso 1: elegir empleado ──────────────────────────────────────────────────
async function buildNuevaTareaP1(session) {
    const empleados = await (0, db_1.getEmpleados)();
    const page = session.contextData.page ?? 1;
    const paged = (0, guards_1.paginate)(empleados, page, PAGE_SIZE);
    const lines = [
        `📋 *Nueva tarea — Elegir empleado*`,
        guards_1.SEP,
    ];
    paged.items.forEach((e, i) => {
        const n = (page - 1) * PAGE_SIZE + i + 1;
        lines.push(`${n}️⃣  👷 ${e.nombre}${e.especialidad ? ` — ${e.especialidad}` : ''}`);
    });
    lines.push(guards_1.SEP);
    if (paged.hasPrev)
        lines.push(`8️⃣  ◀️ Anterior`);
    if (paged.hasNext)
        lines.push(`9️⃣  ▶️ Ver más`);
    lines.push(`0️⃣  Volver`);
    return lines.join('\n');
}
async function handleNuevaTareaP1(session, input) {
    if (input === '0')
        return null;
    const empleados = await (0, db_1.getEmpleados)();
    const page = session.contextData.page ?? 1;
    const paged = (0, guards_1.paginate)(empleados, page, PAGE_SIZE);
    if (input === '8' && paged.hasPrev) {
        await (0, session_1.navigateTo)(session, 'admin_nueva_tarea_p1', { page: page - 1 });
        return buildNuevaTareaP1({ ...session, contextData: { page: page - 1 } });
    }
    if (input === '9' && paged.hasNext) {
        await (0, session_1.navigateTo)(session, 'admin_nueva_tarea_p1', { page: page + 1 });
        return buildNuevaTareaP1({ ...session, contextData: { page: page + 1 } });
    }
    const n = parseInt(input, 10);
    const idx = (page - 1) * PAGE_SIZE + n - 1;
    const empleado = !isNaN(n) && n >= 1 ? empleados[idx] : null;
    if (!empleado) {
        return `❓ Opción no válida.\n\n${await buildNuevaTareaP1(session)}`;
    }
    await (0, session_1.navigateTo)(session, 'admin_nueva_tarea_p2', {
        pendingText: true,
        tareaEmpleadoId: empleado.id,
        tareaEmpleadoNombre: empleado.nombre,
        tareaEmpleadoWaId: empleado.waId ?? null,
    });
    return buildNuevaTareaP2(empleado.nombre);
}
// ─── Paso 2: descripción de la tarea ─────────────────────────────────────────
function buildNuevaTareaP2(empleadoNombre) {
    return [
        `📋 *Nueva tarea${empleadoNombre ? ` — ${empleadoNombre}` : ''}*`,
        guards_1.SEP,
        `¿Cuál es la tarea a realizar?`,
        `(ej: _Revisar iluminación piso 1_, _Limpiar depósito local 204_)`,
        guards_1.SEP,
        `0️⃣  Volver`,
    ].join('\n');
}
async function handleNuevaTareaP2(session, input) {
    if (input === '0')
        return null;
    if (input.trim().length < 4) {
        const nombre = session.contextData.tareaEmpleadoNombre;
        return `⚠️ Descripción muy corta.\n\n${buildNuevaTareaP2(nombre)}`;
    }
    await (0, session_1.navigateTo)(session, 'admin_nueva_tarea_p3', {
        tareaTitulo: input.trim(),
    });
    return buildNuevaTareaP3();
}
// ─── Paso 3: prioridad ────────────────────────────────────────────────────────
function buildNuevaTareaP3() {
    return [
        `📋 *Nueva tarea — Prioridad*`,
        guards_1.SEP,
        `1️⃣  🟢 Baja`,
        `2️⃣  🟡 Media`,
        `3️⃣  🟠 Alta`,
        `4️⃣  🔴 Urgente`,
        guards_1.SEP,
        `0️⃣  Volver`,
    ].join('\n');
}
async function handleNuevaTareaP3(session, input) {
    if (input === '0')
        return null;
    const prioMap = {
        '1': 'baja', '2': 'media', '3': 'alta', '4': 'urgente',
    };
    const prioridad = prioMap[input];
    if (!prioridad)
        return `❓ Opción no válida.\n\n${buildNuevaTareaP3()}`;
    await (0, session_1.navigateTo)(session, 'admin_nueva_tarea_confirmar', { tareaPrioridad: prioridad });
    return buildNuevaTareaConfirmar(session);
}
// ─── Confirmación ─────────────────────────────────────────────────────────────
function buildNuevaTareaConfirmar(session) {
    const ctx = session.contextData;
    return [
        `📋 *Confirmar tarea*`,
        guards_1.SEP,
        `👷 *Empleado:* ${ctx.tareaEmpleadoNombre ?? '—'}`,
        `📝 *Tarea:* ${ctx.tareaTitulo ?? '—'}`,
        `⚡ *Prioridad:* ${PRIO_MAP[ctx.tareaPrioridad] ?? ctx.tareaPrioridad}`,
        guards_1.SEP,
        `1️⃣  ✅ Confirmar y asignar`,
        `2️⃣  ❌ Cancelar`,
    ].join('\n');
}
async function handleNuevaTareaConfirmar(session, input) {
    if (input === '2' || input === '0')
        return null;
    if (input !== '1')
        return `❓ Opción no válida.\n\n${buildNuevaTareaConfirmar(session)}`;
    const ctx = session.contextData;
    try {
        const tareaId = await (0, db_1.crearTareaOperativaManual)({
            titulo: String(ctx.tareaTitulo),
            ubicacion: 'General',
            prioridad: ctx.tareaPrioridad,
            empleadoId: Number(ctx.tareaEmpleadoId),
            empleadoNombre: String(ctx.tareaEmpleadoNombre),
            empleadoWaId: ctx.tareaEmpleadoWaId ? String(ctx.tareaEmpleadoWaId) : null,
        });
        // Notificar al empleado
        if (ctx.tareaEmpleadoWaId) {
            await (0, db_1.enqueueBotMessage)(String(ctx.tareaEmpleadoWaId), [
                `📋 *Nueva tarea asignada*`,
                `🏢 Docks del Puerto`,
                guards_1.SEP,
                `📝 ${ctx.tareaTitulo}`,
                `⚡ Prioridad: ${PRIO_MAP[ctx.tareaPrioridad]}`,
                guards_1.SEP,
                `Respondé con *menú* para ver tus tareas.`,
            ].join('\n'));
        }
        await (0, session_1.navigateTo)(session, 'main', {});
        return [
            `✅ *¡Tarea asignada!*`,
            guards_1.SEP,
            `👷 ${ctx.tareaEmpleadoNombre} recibió la tarea *#${tareaId}*.`,
            ctx.tareaEmpleadoWaId ? `📱 Se le envió una notificación por WhatsApp.` : `⚠️ No tiene WhatsApp registrado.`,
            guards_1.SEP,
            `0️⃣  Volver al menú`,
        ].join('\n');
    }
    catch (e) {
        console.error('[bot/nueva_tarea]', e);
        return (0, guards_1.errorMsg)('No se pudo crear la tarea. Intentá nuevamente.');
    }
}
