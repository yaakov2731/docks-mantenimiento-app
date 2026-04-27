"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAsistenciaMenu = buildAsistenciaMenu;
exports.handleAsistencia = handleAsistencia;
const guards_1 = require("../../shared/guards");
const db_1 = require("../../../db");
const operational_task_assignment_1 = require("../../../operational-task-assignment");
// ─── Menú principal de asistencia ────────────────────────────────────────────
async function buildAsistenciaMenu(session) {
    const status = await (0, db_1.getEmpleadoAttendanceStatus)(session.userId);
    let estadoStr = '⭕ Sin turno activo';
    if (status?.onShift && status?.onLunch) {
        estadoStr = `🍽️ En almuerzo desde ${fmtHora(status.lunchStartedAt)}`;
    }
    else if (status?.onShift) {
        estadoStr = `✅ En turno desde ${fmtHora(status.lastEntryAt)}`;
        if (status.workedSecondsToday > 0) {
            estadoStr += ` (${(0, guards_1.fmtDuration)(status.workedSecondsToday)} trabajados hoy)`;
        }
    }
    return [
        `🕐 *Asistencia — ${session.userName}*`,
        guards_1.SEP,
        `Estado: ${estadoStr}`,
        guards_1.SEP,
        `1️⃣  📍 Registrar entrada`,
        `2️⃣  🏁 Registrar salida`,
        `3️⃣  🍽️ Inicio de almuerzo`,
        `4️⃣  ↩️  Fin de almuerzo`,
        `5️⃣  📊 Ver resumen del día`,
        guards_1.SEP,
        `0️⃣  Volver al menú principal`,
    ].join('\n');
}
async function handleAsistencia(session, input) {
    const opt = (0, guards_1.parseMenuOption)(input, 5);
    if (opt === null) {
        const command = parseAttendanceCommand(input);
        if (!command)
            return (0, guards_1.invalidOption)(await buildAsistenciaMenu(session));
        if (command === 'menu')
            return buildAsistenciaMenu(session);
        if (command === 'resumen')
            return buildResumenDia(session);
        return ejecutarAsistencia(session, command);
    }
    if (opt === 0)
        return null; // engine lo maneja como "volver"
    const accionMap = {
        1: 'entrada',
        2: 'salida',
        3: 'inicio_almuerzo',
        4: 'fin_almuerzo',
    };
    if (opt === 5) {
        return buildResumenDia(session);
    }
    const accion = accionMap[opt];
    if (!accion)
        return (0, guards_1.invalidOption)(await buildAsistenciaMenu(session));
    return ejecutarAsistencia(session, accion);
}
// ─── Ejecutar acción de asistencia ───────────────────────────────────────────
async function ejecutarAsistencia(session, accion) {
    console.log(`[bot/asistencia] action:start ${JSON.stringify({
        waNumber: session.waNumber,
        empleadoId: session.userId,
        userName: session.userName,
        accion,
    })}`);
    const result = await (0, db_1.registerEmpleadoAttendance)(session.userId, accion, 'whatsapp');
    if (!result.success) {
        console.log(`[bot/asistencia] action:blocked ${JSON.stringify({
            waNumber: session.waNumber,
            empleadoId: session.userId,
            userName: session.userName,
            accion,
            code: result.code,
            status: result.status,
        })}`);
        const mensajesError = {
            already_on_shift: 'Ya tenés un turno activo. Primero registrá la salida del turno anterior.',
            not_on_shift: 'Primero registrá la entrada.',
            already_on_lunch: 'Ya tenés el almuerzo iniciado.',
            not_on_lunch: 'No tenés almuerzo activo para finalizar.',
            on_lunch: 'Finalizá el almuerzo antes de registrar la salida.',
            ALREADY_ON_SHIFT: 'Ya tenés un turno activo. Primero registrá la salida del turno anterior.',
            NO_OPEN_SHIFT: 'No tenés un turno activo. Primero registrá la entrada.',
            ALREADY_ON_LUNCH: 'Ya tenés el almuerzo iniciado.',
            NOT_ON_LUNCH: 'No tenés almuerzo activo para finalizar.',
            LUNCH_NOT_FINISHED: 'Finalizá el almuerzo antes de registrar la salida.',
        };
        const msg = mensajesError[result.code] ?? 'No se pudo registrar la acción.';
        return [
            `⚠️ ${msg}`,
            guards_1.SEP,
            `0️⃣  Volver`,
        ].join('\n');
    }
    const status = result.status;
    console.log(`[bot/asistencia] action:success ${JSON.stringify({
        waNumber: session.waNumber,
        empleadoId: session.userId,
        userName: session.userName,
        accion,
        status,
    })}`);
    const ahora = new Date().toLocaleTimeString('es-AR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires',
    });
    // Auto-asignar tareas del pool al registrar entrada
    let tareasAsignadas = [];
    if (accion === 'entrada') {
        try {
            tareasAsignadas = await (0, operational_task_assignment_1.autoDistributePoolTasksOnEntry)(session.userId);
        }
        catch (err) {
            console.error('[bot/asistencia] auto-assign error:', err);
        }
    }
    const tareasLines = tareasAsignadas.length > 0
        ? [
            ``,
            `📋 *Se te asignaron ${tareasAsignadas.length} tarea${tareasAsignadas.length > 1 ? 's' : ''} del día:*`,
            ...tareasAsignadas.map(t => `  • ${t.titulo}${t.ubicacion ? ` — ${t.ubicacion}` : ''}`),
            ``,
            `Revisalas en *Mis tareas* y aceptalas para comenzar.`,
        ]
        : [];
    const mensajes = {
        entrada: [
            `✅ *Entrada registrada*`,
            ``,
            `Hola ${session.userName}! 👷`,
            `📍 Entrada a las *${ahora}*`,
            ...tareasLines,
            ``,
            `¡Buen turno!`,
        ],
        salida: [
            `👋 *Salida registrada*`,
            ``,
            `${session.userName}, salida a las *${ahora}*`,
            status?.workedSecondsToday
                ? `⏱️ Tiempo trabajado hoy: *${(0, guards_1.fmtDuration)(status.workedSecondsToday)}*`
                : '',
            ``,
            `¡Hasta la próxima!`,
        ],
        inicio_almuerzo: [
            `🍽️ *Almuerzo iniciado*`,
            ``,
            `Hora de corte: *${ahora}*`,
            `Acordate de marcar el fin de almuerzo al volver.`,
        ],
        fin_almuerzo: [
            `↩️  *Fin de almuerzo registrado*`,
            ``,
            `De vuelta al trabajo. Hora: *${ahora}*`,
            status?.todayLunchSeconds
                ? `Almuerzo duración: ${(0, guards_1.fmtDuration)(status.todayLunchSeconds)}`
                : '',
        ],
    };
    const lines = mensajes[accion].filter(Boolean);
    lines.push(``, `0️⃣  Volver`);
    return lines.join('\n');
}
// ─── Resumen del día ──────────────────────────────────────────────────────────
async function buildResumenDia(session) {
    const status = await (0, db_1.getEmpleadoAttendanceStatus)(session.userId);
    if (!status) {
        return `📊 No hay datos de asistencia para hoy.\n\n0️⃣  Volver`;
    }
    const lines = [
        `📊 *Resumen del día — ${session.userName}*`,
        guards_1.SEP,
    ];
    if (status.lastEntryAt)
        lines.push(`📍 Entrada: ${fmtHora(status.lastEntryAt)}`);
    if (status.lastExitAt)
        lines.push(`🏁 Salida: ${fmtHora(status.lastExitAt)}`);
    if (status.workedSecondsToday > 0)
        lines.push(`⏱️ Tiempo trabajado: *${(0, guards_1.fmtDuration)(status.workedSecondsToday)}*`);
    if (status.todayLunchSeconds > 0)
        lines.push(`🍽️ Almuerzo: ${(0, guards_1.fmtDuration)(status.todayLunchSeconds)}`);
    if (status.onShift && !status.lastExitAt)
        lines.push(``, `✅ Turno activo en este momento`);
    if (status.onLunch)
        lines.push(`🍽️ En almuerzo ahora`);
    lines.push(guards_1.SEP, `0️⃣  Volver`);
    return lines.join('\n');
}
// ─── Helper ───────────────────────────────────────────────────────────────────
function fmtHora(value) {
    if (!value)
        return '—';
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime()))
        return '—';
    return d.toLocaleTimeString('es-AR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires',
    });
}
function parseAttendanceCommand(input) {
    const normalized = normalizeAttendanceText(input);
    if (!normalized)
        return null;
    if (matchesAttendanceCommand(normalized, ['asistencia', 'marcacion', 'marcacion asistencia', 'registrar asistencia', 'turno'])) {
        return 'menu';
    }
    if (matchesAttendanceCommand(normalized, ['resumen', 'ver resumen', 'resumen del dia'])) {
        return 'resumen';
    }
    if (matchesAttendanceCommand(normalized, ['registrar entrada', 'marcar entrada', 'entrada', 'ingreso', 'entro', 'llegue'])) {
        return 'entrada';
    }
    if (matchesAttendanceCommand(normalized, ['registrar salida', 'marcar salida', 'salida', 'salgo', 'me voy', 'cierro turno', 'termino turno'])) {
        return 'salida';
    }
    if (matchesAttendanceCommand(normalized, ['inicio almuerzo', 'iniciar almuerzo', 'salgo a almorzar', 'me voy a almorzar'])) {
        return 'inicio_almuerzo';
    }
    if (matchesAttendanceCommand(normalized, ['fin almuerzo', 'volver de almuerzo', 'volvi de almorzar', 'termine almuerzo'])) {
        return 'fin_almuerzo';
    }
    return null;
}
function normalizeAttendanceText(input) {
    return input
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}
function matchesAttendanceCommand(input, patterns) {
    return patterns.some(pattern => input === pattern || input.includes(pattern));
}
