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
exports.getAllTareasActivas = getAllTareasActivas;
exports.buildTareaActual = buildTareaActual;
exports.handleTareaActual = handleTareaActual;
exports.buildTareasLista = buildTareasLista;
exports.handleTareasLista = handleTareasLista;
exports.buildTareaDetalle = buildTareaDetalle;
exports.handleTareaDetalle = handleTareaDetalle;
exports.handleConfirmarCompletar = handleConfirmarCompletar;
exports.handlePausaMotivo = handlePausaMotivo;
exports.handlePausaMotivoLibre = handlePausaMotivoLibre;
exports.handleProblema = handleProblema;
exports.handleProblemaLibre = handleProblemaLibre;
exports.handleNotaLibre = handleNotaLibre;
/**
 * Flujo completo de Mis Tareas para empleados.
 * Menús: tarea_actual → tareas_lista → tarea_detalle → tarea_confirmar_completar | tarea_pausa_motivo | tarea_problema
 */
const session_1 = require("../../session");
const guards_1 = require("../../shared/guards");
const db_1 = require("../../../db");
const service_1 = require("../../../tasks/service");
const roundDb = __importStar(require("../../../db"));
const notification_1 = require("../../../_core/notification");
const tasksService = (0, service_1.createOperationalTasksService)(roundDb);
const PAGE_SIZE = 5;
async function getAllTareasActivas(empleadoId) {
    const [reclamos, operaciones] = await Promise.all([
        (0, db_1.getTareasEmpleado)(empleadoId),
        (0, db_1.listOperationalTasksByEmployee)(empleadoId),
    ]);
    const ops = operaciones.filter(t => !['terminada', 'cancelada', 'rechazada'].includes(t.estado));
    // Unificar formato
    const unified = [
        ...reclamos.map(r => ({
            id: r.id,
            origen: 'reclamo',
            titulo: r.titulo,
            local: r.local,
            prioridad: r.prioridad,
            estado: r.estado,
            asignacionEstado: r.asignacionEstado,
            tiempoSeg: r.trabajoAcumuladoSegundos ?? 0,
        })),
        ...ops.map(t => ({
            id: t.id,
            origen: 'operacion',
            titulo: t.titulo,
            local: t.ubicacion ?? 'Operación',
            prioridad: t.prioridad,
            estado: normalizeEstado(t.estado),
            asignacionEstado: deriveAsignacion(t.estado),
            tiempoSeg: t.tiempoTrabajadoSegundos ?? t.trabajoAcumuladoSegundos ?? 0,
        })),
    ];
    // Ordenar: pendiente_confirmacion primero, luego en_progreso, pausado, pendiente
    return unified.sort((a, b) => rankTarea(a) - rankTarea(b));
}
async function getCurrentTask(empleadoId) {
    const tareas = await getAllTareasActivas(empleadoId);
    return tareas[0] ?? null;
}
function normalizeEstado(estado) {
    switch (estado) {
        case 'pendiente_asignacion':
        case 'pendiente_confirmacion': return 'pendiente';
        case 'pausada': return 'pausado';
        case 'terminada': return 'completado';
        case 'rechazada':
        case 'cancelada': return 'cancelado';
        default: return estado;
    }
}
function deriveAsignacion(estado) {
    if (estado === 'pendiente_confirmacion')
        return 'pendiente_confirmacion';
    return 'aceptada';
}
function rankTarea(t) {
    if (t.asignacionEstado === 'pendiente_confirmacion')
        return 0;
    switch (t.estado) {
        case 'en_progreso': return 1;
        case 'pausado': return 2;
        case 'pendiente': return 3;
        default: return 4;
    }
}
function buildMainOptionsFooter() {
    return [
        guards_1.SEP,
        `1️⃣  🎯 Ver mi tarea actual`,
        `2️⃣  📋 Ver todas mis tareas`,
        `3️⃣  🕐 Registrar asistencia`,
        `4️⃣  🚻 Control de baños`,
    ];
}
function buildOperationalTaskAcceptanceBlocked(task, menu) {
    return [
        `⚠️ *No pude aceptar la tarea #${task.id}.*`,
        `Ya tenés otra tarea operativa en curso. Terminá o pausá esa primero y después volvé a intentarlo.`,
        '',
        menu,
    ].join('\n');
}
function isOperationalTaskConflict(error) {
    return error instanceof Error && error.message === 'Employee already has an active operational task';
}
// ─── TAREA ACTUAL ────────────────────────────────────────────────────────────
async function buildTareaActual(session) {
    const tarea = await getCurrentTask(session.userId);
    if (!tarea) {
        return [
            `🎯 *Tu tarea actual*`,
            guards_1.SEP,
            `✅ No tenés una tarea activa ahora.`,
            `Podés revisar todo tu listado o seguir con otra gestión.`,
            guards_1.SEP,
            `1️⃣  📋 Ver todas mis tareas`,
            `2️⃣  🕐 Registrar asistencia`,
            `3️⃣  🚻 Ver rondas`,
            `0️⃣  Volver`,
        ].join('\n');
    }
    if (tarea.origen === 'operacion') {
        const task = await (0, db_1.getOperationalTaskById)(tarea.id);
        if (!task)
            return (0, guards_1.errorMsg)('No se encontró la tarea actual.');
        return buildOperacionalActual(task);
    }
    const reporte = await (0, db_1.getReporteById)(tarea.id);
    if (!reporte)
        return (0, guards_1.errorMsg)('No se encontró la tarea actual.');
    return buildReclamoActual(reporte);
}
async function handleTareaActual(session, input) {
    const tarea = await getCurrentTask(session.userId);
    if (!tarea) {
        if (input === '0')
            return null;
        if (input === '1') {
            await (0, session_1.navigateTo)(session, 'tareas_lista', { page: 1 });
            return buildTareasLista({ ...session, currentMenu: 'tareas_lista', contextData: { page: 1 } });
        }
        if (input === '2') {
            await (0, session_1.navigateTo)(session, 'asistencia', {});
            const { buildAsistenciaMenu } = await Promise.resolve().then(() => __importStar(require('./asistencia')));
            return buildAsistenciaMenu({ ...session, currentMenu: 'asistencia', contextData: {} });
        }
        if (input === '3') {
            await (0, session_1.navigateTo)(session, 'rondas_lista', { page: 1 });
            const { buildRondasLista } = await Promise.resolve().then(() => __importStar(require('./rondas')));
            return buildRondasLista({ ...session, currentMenu: 'rondas_lista', contextData: { page: 1 } });
        }
        return (0, guards_1.invalidOption)(await buildTareaActual(session));
    }
    if (input === '0')
        return null;
    if (input === '4') {
        await (0, session_1.navigateTo)(session, 'tareas_lista', { page: 1 });
        return buildTareasLista({ ...session, currentMenu: 'tareas_lista', contextData: { page: 1 } });
    }
    if (tarea.origen === 'operacion') {
        const task = await (0, db_1.getOperationalTaskById)(tarea.id);
        if (!task)
            return (0, guards_1.errorMsg)('No se encontró la tarea actual.');
        try {
            return await handleOperacionalActual(session, task, input);
        }
        catch (e) {
            return (0, guards_1.errorMsg)(`Ocurrió un error al procesar la tarea. Escribí "menú" para volver al inicio.`);
        }
    }
    const reporte = await (0, db_1.getReporteById)(tarea.id);
    if (!reporte)
        return (0, guards_1.errorMsg)('No se encontró la tarea actual.');
    try {
        return await handleReclamoActual(session, reporte, input);
    }
    catch (e) {
        return (0, guards_1.errorMsg)(`Ocurrió un error al procesar la tarea. Escribí "menú" para volver al inicio.`);
    }
}
function buildReclamoActual(reporte) {
    const pendConf = reporte.asignacionEstado === 'pendiente_confirmacion';
    const tiempo = reporte.trabajoAcumuladoSegundos ?? 0;
    const lines = [
        `🎯 *Tu tarea actual*`,
        guards_1.SEP,
        `📌 Rec. #${reporte.id} — ${reporte.titulo}`,
        `📍 ${reporte.local} (planta ${reporte.planta})`,
        `${(0, guards_1.prioEmoji)(reporte.prioridad)} Prioridad: *${reporte.prioridad.toUpperCase()}*`,
        tiempo > 0 ? `⏱️ Tiempo trabajado: ${(0, guards_1.fmtDuration)(tiempo)}` : '',
        `📝 ${reporte.descripcion}`,
        guards_1.SEP,
    ].filter(Boolean);
    if (pendConf) {
        lines.push(`Estado: ⚠️ Pendiente de confirmación`, `1️⃣  ✅ Aceptar e iniciar`, `2️⃣  ❌ No puedo tomarla`, `3️⃣  📄 Ver detalle completo`, `4️⃣  📋 Ver todas mis tareas`, `0️⃣  Volver`);
        return lines.join('\n');
    }
    if (reporte.estado === 'pausado') {
        lines.push(`Estado: ⏸️ Pausada`, `1️⃣  ▶️ Retomar tarea`, `2️⃣  ✅ Finalizar tarea`, `3️⃣  📝 Agregar nota`, `4️⃣  📋 Ver todas mis tareas`, `0️⃣  Volver`);
        return lines.join('\n');
    }
    if (reporte.estado === 'en_progreso') {
        lines.push(`Estado: ▶️ En progreso`, `1️⃣  ✅ Finalizar tarea`, `2️⃣  ⏸️ Pausar tarea`, `3️⃣  📝 Agregar nota`, `4️⃣  📋 Ver todas mis tareas`, `0️⃣  Volver`);
        return lines.join('\n');
    }
    lines.push(`Estado: ${(0, guards_1.estadoEmoji)(reporte.estado)} ${reporte.estado}`, `1️⃣  ▶️ Iniciar tarea`, `2️⃣  📄 Ver detalle completo`, `4️⃣  📋 Ver todas mis tareas`, `0️⃣  Volver`);
    return lines.join('\n');
}
function buildOperacionalActual(task) {
    const pendConf = task.estado === 'pendiente_confirmacion';
    const tiempo = task.tiempoTrabajadoSegundos ?? task.trabajoAcumuladoSegundos ?? 0;
    const lines = [
        `🎯 *Tu tarea actual*`,
        guards_1.SEP,
        `📌 Op. #${task.id} — ${task.titulo}`,
        `📍 ${task.ubicacion ?? 'Sin ubicación'}`,
        `${(0, guards_1.prioEmoji)(task.prioridad)} Prioridad: *${task.prioridad.toUpperCase()}*`,
        tiempo > 0 ? `⏱️ Tiempo trabajado: ${(0, guards_1.fmtDuration)(tiempo)}` : '',
        `📝 ${task.descripcion}`,
        task.checklistObjetivo ? `📋 Checklist: ${task.checklistObjetivo}` : '',
        guards_1.SEP,
    ].filter(Boolean);
    if (pendConf) {
        lines.push(`Estado: ⚠️ Pendiente de confirmación`, `1️⃣  ✅ Aceptar e iniciar`, `2️⃣  ❌ No puedo tomarla`, `3️⃣  📄 Ver detalle completo`, `4️⃣  📋 Ver todas mis tareas`, `0️⃣  Volver`);
        return lines.join('\n');
    }
    if (task.estado === 'pausada') {
        lines.push(`Estado: ⏸️ Pausada`, `1️⃣  ▶️ Retomar tarea`, `2️⃣  ✅ Finalizar tarea`, `3️⃣  📝 Agregar nota`, `4️⃣  📋 Ver todas mis tareas`, `0️⃣  Volver`);
        return lines.join('\n');
    }
    lines.push(`Estado: ${(0, guards_1.estadoEmoji)(normalizeEstado(task.estado))} ${task.estado}`, `1️⃣  ✅ Finalizar tarea`, `2️⃣  ⏸️ Pausar tarea`, `3️⃣  📝 Agregar nota`, `4️⃣  📋 Ver todas mis tareas`, `0️⃣  Volver`);
    return lines.join('\n');
}
async function handleReclamoActual(session, reporte, input) {
    const pendConf = reporte.asignacionEstado === 'pendiente_confirmacion';
    if (pendConf) {
        if (input === '1')
            return acceptCurrentReclamo(session, reporte);
        if (input === '2')
            return rejectCurrentReclamo(session, reporte);
        if (input === '3') {
            await (0, session_1.navigateTo)(session, 'tarea_detalle', { tareaId: reporte.id, origen: 'reclamo' });
            return buildTareaDetalle({ ...session, currentMenu: 'tarea_detalle', contextData: { tareaId: reporte.id, origen: 'reclamo' } });
        }
        return (0, guards_1.invalidOption)(buildReclamoActual(reporte));
    }
    if (reporte.estado === 'pausado') {
        if (input === '1')
            return resumeCurrentReclamo(session, reporte);
        if (input === '2')
            return completeCurrentTask(session, reporte.id, 'reclamo');
        if (input === '3') {
            await (0, session_1.navigateTo)(session, 'tarea_nota_libre', { tareaId: reporte.id, origen: 'reclamo', pendingText: true });
            return `📝 Escribí la nota que querés agregar:`;
        }
        return (0, guards_1.invalidOption)(buildReclamoActual(reporte));
    }
    if (reporte.estado === 'en_progreso') {
        if (input === '1')
            return completeCurrentTask(session, reporte.id, 'reclamo');
        if (input === '2') {
            await (0, session_1.navigateTo)(session, 'tarea_pausa_motivo', { tareaId: reporte.id, origen: 'reclamo' });
            return buildPausaMotivo();
        }
        if (input === '3') {
            await (0, session_1.navigateTo)(session, 'tarea_nota_libre', { tareaId: reporte.id, origen: 'reclamo', pendingText: true });
            return `📝 Escribí la nota que querés agregar:`;
        }
        return (0, guards_1.invalidOption)(buildReclamoActual(reporte));
    }
    if (input === '1')
        return startCurrentReclamo(session, reporte);
    if (input === '2') {
        await (0, session_1.navigateTo)(session, 'tarea_detalle', { tareaId: reporte.id, origen: 'reclamo' });
        return buildTareaDetalle({ ...session, currentMenu: 'tarea_detalle', contextData: { tareaId: reporte.id, origen: 'reclamo' } });
    }
    return (0, guards_1.invalidOption)(buildReclamoActual(reporte));
}
async function handleOperacionalActual(session, task, input) {
    if (task.estado === 'pendiente_confirmacion') {
        if (input === '1') {
            try {
                await tasksService.acceptTask({ taskId: task.id, empleadoId: session.userId });
            }
            catch (error) {
                if (isOperationalTaskConflict(error)) {
                    return buildOperationalTaskAcceptanceBlocked(task, buildOperacionalActual(task));
                }
                // Estado cambió desde que se mostró el menú (ya aceptada, cancelada, etc.)
                await (0, session_1.navigateBack)(session);
                return [
                    `⚠️ No se pudo aceptar la tarea #${task.id}.`,
                    `Es posible que el estado haya cambiado. Revisá tu lista de tareas.`,
                    ...buildMainOptionsFooter(),
                ].join('\n');
            }
            await (0, session_1.navigateBack)(session);
            return [
                `✅ *Tarea #${task.id} aceptada.*`,
                `La dejamos en marcha para que sigas rápido.`,
                ...buildMainOptionsFooter(),
            ].join('\n');
        }
        if (input === '2') {
            try {
                await tasksService.rejectTask({ taskId: task.id, empleadoId: session.userId, note: 'Empleado no puede tomar la tarea' });
            }
            catch {
                await (0, session_1.navigateBack)(session);
                return [
                    `⚠️ No se pudo rechazar la tarea #${task.id}. Es posible que el estado haya cambiado.`,
                    ...buildMainOptionsFooter(),
                ].join('\n');
            }
            await (0, session_1.navigateBack)(session);
            return [
                `❌ *Tarea #${task.id} rechazada.*`,
                `Quedó liberada para reasignación.`,
                ...buildMainOptionsFooter(),
            ].join('\n');
        }
        if (input === '3') {
            await (0, session_1.navigateTo)(session, 'tarea_detalle', { tareaId: task.id, origen: 'operacion' });
            return buildTareaDetalle({ ...session, currentMenu: 'tarea_detalle', contextData: { tareaId: task.id, origen: 'operacion' } });
        }
        return (0, guards_1.invalidOption)(buildOperacionalActual(task));
    }
    if (task.estado === 'pausada') {
        if (input === '1') {
            await tasksService.resumeTask({ taskId: task.id, empleadoId: session.userId });
            await (0, session_1.navigateBack)(session);
            return [
                `▶️ *Tarea #${task.id} retomada.*`,
                `Volvió a quedar como tu tarea principal.`,
                ...buildMainOptionsFooter(),
            ].join('\n');
        }
        if (input === '2')
            return completeCurrentTask(session, task.id, 'operacion');
        if (input === '3') {
            await (0, session_1.navigateTo)(session, 'tarea_nota_libre', { tareaId: task.id, origen: 'operacion', pendingText: true });
            return `📝 Escribí la nota que querés agregar:`;
        }
        return (0, guards_1.invalidOption)(buildOperacionalActual(task));
    }
    if (input === '1')
        return completeCurrentTask(session, task.id, 'operacion');
    if (input === '2') {
        await (0, session_1.navigateTo)(session, 'tarea_pausa_motivo', { tareaId: task.id, origen: 'operacion' });
        return buildPausaMotivo();
    }
    if (input === '3') {
        await (0, session_1.navigateTo)(session, 'tarea_nota_libre', { tareaId: task.id, origen: 'operacion', pendingText: true });
        return `📝 Escribí la nota que querés agregar:`;
    }
    return (0, guards_1.invalidOption)(buildOperacionalActual(task));
}
async function acceptCurrentReclamo(session, reporte) {
    await (0, db_1.iniciarTrabajoReporte)(reporte.id);
    await (0, db_1.actualizarReporte)(reporte.id, {
        asignacionEstado: 'aceptada',
        asignacionRespondidaAt: new Date(),
    });
    await (0, db_1.crearActualizacion)({
        reporteId: reporte.id,
        usuarioNombre: session.userName,
        tipo: 'timer',
        descripcion: `${session.userName} aceptó la tarea vía WhatsApp`,
        estadoAnterior: reporte.estado,
        estadoNuevo: 'en_progreso',
    });
    await (0, session_1.navigateBack)(session);
    return [
        `✅ *Tarea #${reporte.id} aceptada.*`,
        `Ya quedó iniciada para que sigas sin pasos extra.`,
        ...buildMainOptionsFooter(),
    ].join('\n');
}
async function rejectCurrentReclamo(session, reporte) {
    await (0, db_1.actualizarReporte)(reporte.id, {
        estado: 'pendiente',
        asignacionEstado: 'rechazada',
        asignadoA: null,
        asignadoId: null,
        asignacionRespondidaAt: new Date(),
        trabajoIniciadoAt: null,
    });
    await (0, db_1.crearActualizacion)({
        reporteId: reporte.id,
        usuarioNombre: session.userName,
        tipo: 'asignacion',
        descripcion: `${session.userName} indicó que no puede tomar la tarea. Liberada para reasignación.`,
        estadoAnterior: reporte.estado,
        estadoNuevo: 'pendiente',
    });
    (0, notification_1.notifyOwner)({
        title: `Tarea rechazada — Reclamo #${reporte.id}`,
        content: `${session.userName} no puede tomarla. Disponible para reasignar.`,
    }).catch(console.error);
    await (0, session_1.navigateBack)(session);
    return [
        `❌ *Tarea #${reporte.id} rechazada.*`,
        `El encargado ya puede reasignarla.`,
        ...buildMainOptionsFooter(),
    ].join('\n');
}
async function startCurrentReclamo(session, reporte) {
    await (0, db_1.iniciarTrabajoReporte)(reporte.id);
    await (0, db_1.crearActualizacion)({
        reporteId: reporte.id,
        usuarioNombre: session.userName,
        tipo: 'timer',
        descripcion: `${session.userName} inició la tarea vía WhatsApp`,
        estadoAnterior: reporte.estado,
        estadoNuevo: 'en_progreso',
    });
    await (0, session_1.navigateBack)(session);
    return [
        `▶️ *Tarea #${reporte.id} iniciada.*`,
        `La dejamos corriendo como tu tarea principal.`,
        ...buildMainOptionsFooter(),
    ].join('\n');
}
async function resumeCurrentReclamo(session, reporte) {
    await (0, db_1.iniciarTrabajoReporte)(reporte.id);
    await (0, db_1.crearActualizacion)({
        reporteId: reporte.id,
        usuarioNombre: session.userName,
        tipo: 'timer',
        descripcion: `${session.userName} retomó la tarea vía WhatsApp`,
        estadoAnterior: 'pausado',
        estadoNuevo: 'en_progreso',
    });
    await (0, session_1.navigateBack)(session);
    return [
        `▶️ *Tarea #${reporte.id} retomada.*`,
        `Volvió a quedar como tu tarea principal.`,
        ...buildMainOptionsFooter(),
    ].join('\n');
}
async function completeCurrentTask(session, tareaId, origen) {
    if (origen === 'operacion') {
        let result;
        try {
            result = await tasksService.finishTask({ taskId: tareaId, empleadoId: session.userId });
        }
        catch {
            await (0, session_1.navigateBack)(session);
            return [
                `⚠️ No se pudo completar la tarea #${tareaId}. Puede que el estado haya cambiado.`,
                ...buildMainOptionsFooter(),
            ].join('\n');
        }
        const tiempo = (0, guards_1.fmtDuration)(result.task.tiempoTrabajadoSegundos ?? result.task.trabajoAcumuladoSegundos ?? 0);
        await (0, session_1.navigateBack)(session);
        return [
            `🏁 *Operación #${tareaId} completada.*`,
            `⏱️ Tiempo total: *${tiempo}*`,
            ...buildMainOptionsFooter(),
        ].join('\n');
    }
    const updated = await (0, db_1.completarTrabajoReporte)(tareaId);
    const tiempo = (0, guards_1.fmtDuration)(updated?.trabajoAcumuladoSegundos ?? 0);
    await (0, db_1.crearActualizacion)({
        reporteId: tareaId,
        usuarioNombre: session.userName,
        tipo: 'completado',
        descripcion: `${session.userName} completó la tarea vía WhatsApp. Tiempo: ${tiempo}`,
        estadoAnterior: 'en_progreso',
        estadoNuevo: 'completado',
    });
    (0, notification_1.notifyOwner)({
        title: `Tarea completada — Reclamo #${tareaId}`,
        content: `${session.userName}. Tiempo total: ${tiempo}`,
    }).catch(console.error);
    await (0, session_1.navigateBack)(session);
    return [
        `🏁 *Reclamo #${tareaId} completado.*`,
        `⏱️ Tiempo total: *${tiempo}*`,
        ...buildMainOptionsFooter(),
    ].join('\n');
}
// ─── LISTA DE TAREAS ─────────────────────────────────────────────────────────
async function buildTareasLista(session) {
    const tareas = await getAllTareasActivas(session.userId);
    const page = session.contextData.page ?? 1;
    const paged = (0, guards_1.paginate)(tareas, page, PAGE_SIZE);
    if (tareas.length === 0) {
        return [
            `📋 *Tus tareas*`,
            guards_1.SEP,
            `✅ No tenés tareas pendientes por ahora.`,
            guards_1.SEP,
            `0️⃣  Volver al menú principal`,
        ].join('\n');
    }
    const lines = [
        `📋 *Tus tareas* (${tareas.length} activa${tareas.length > 1 ? 's' : ''})`,
        guards_1.SEP,
    ];
    paged.items.forEach((t, i) => {
        const num = i + 1;
        const pendConf = t.asignacionEstado === 'pendiente_confirmacion';
        const estadoStr = pendConf
            ? '⚠️ Pendiente de confirmación'
            : `${(0, guards_1.estadoEmoji)(t.estado)} ${t.estado.replace('_', ' ')}${t.tiempoSeg > 0 ? ` | ${(0, guards_1.fmtDuration)(t.tiempoSeg)}` : ''}`;
        lines.push(`${num}️⃣  ${(0, guards_1.prioEmoji)(t.prioridad)} ${t.origen === 'operacion' ? 'Op.' : 'Rec.'} #${t.id} — ${t.titulo}`, `   📍 ${t.local} | ${estadoStr}`);
    });
    lines.push(guards_1.SEP);
    if (paged.hasPrev)
        lines.push(`8️⃣  ◀️ Página anterior`);
    if (paged.hasNext)
        lines.push(`9️⃣  ▶️ Ver más`);
    lines.push(`0️⃣  Volver`);
    return lines.join('\n');
}
async function handleTareasLista(session, input) {
    const tareas = await getAllTareasActivas(session.userId);
    const page = session.contextData.page ?? 1;
    const paged = (0, guards_1.paginate)(tareas, page, PAGE_SIZE);
    if (input === '8' && paged.hasPrev) {
        await (0, session_1.navigateTo)(session, 'tareas_lista', { page: page - 1 });
        const updated = { ...session, contextData: { ...session.contextData, page: page - 1 } };
        return buildTareasLista(updated);
    }
    if (input === '9' && paged.hasNext) {
        await (0, session_1.navigateTo)(session, 'tareas_lista', { page: page + 1 });
        const updated = { ...session, contextData: { ...session.contextData, page: page + 1 } };
        return buildTareasLista(updated);
    }
    const opt = (0, guards_1.parseMenuOption)(input, paged.items.length);
    if (!opt || opt === 0) {
        if (input === '0')
            return null; // volver al engine
        return (0, guards_1.invalidOption)(await buildTareasLista(session));
    }
    const globalIndex = (page - 1) * PAGE_SIZE + opt - 1;
    const tarea = tareas[globalIndex];
    if (!tarea)
        return (0, guards_1.invalidOption)(await buildTareasLista(session));
    await (0, session_1.navigateTo)(session, 'tarea_detalle', {
        tareaId: tarea.id,
        origen: tarea.origen,
        page: 1,
    });
    const updated = { ...session, currentMenu: 'tarea_detalle', contextData: { tareaId: tarea.id, origen: tarea.origen } };
    return buildTareaDetalle(updated);
}
// ─── DETALLE DE TAREA ────────────────────────────────────────────────────────
async function buildTareaDetalle(session) {
    const { tareaId, origen } = session.contextData;
    if (!tareaId)
        return (0, guards_1.errorMsg)('No se encontró la tarea.');
    if (origen === 'operacion') {
        const task = await (0, db_1.getOperationalTaskById)(tareaId);
        if (!task)
            return (0, guards_1.errorMsg)('Tarea no encontrada.');
        return buildOperacionalDetalle(task);
    }
    const reporte = await (0, db_1.getReporteById)(tareaId);
    if (!reporte)
        return (0, guards_1.errorMsg)('Tarea no encontrada.');
    return buildReclamoDetalle(reporte);
}
function buildReclamoDetalle(r) {
    const pendConf = r.asignacionEstado === 'pendiente_confirmacion';
    const tiempo = r.trabajoAcumuladoSegundos ?? 0;
    const lines = [
        `📌 *Reclamo #${r.id}*`,
        guards_1.SEP,
        `🔧 ${r.titulo}`,
        `📍 ${r.local} (planta ${r.planta})`,
        `${(0, guards_1.prioEmoji)(r.prioridad)} Prioridad: *${r.prioridad.toUpperCase()}*`,
        `📝 ${r.descripcion}`,
        tiempo > 0 ? `⏱️ Tiempo trabajado: ${(0, guards_1.fmtDuration)(tiempo)}` : '',
        guards_1.SEP,
    ].filter(Boolean);
    if (pendConf) {
        lines.push(`¿Podés tomar esta tarea?`, `1️⃣  ✅ Sí, acepto`, `2️⃣  ❌ No puedo tomarla`, `0️⃣  Volver`);
    }
    else if (r.estado === 'pausado') {
        lines.push(`Estado: ⏸️ Pausada | ${(0, guards_1.fmtDuration)(tiempo)} acumulados`, guards_1.SEP, `1️⃣  ▶️ Retomar tarea`, `2️⃣  ✅ Completar tarea`, `3️⃣  📝 Agregar nota`, `0️⃣  Volver`);
    }
    else if (r.estado === 'en_progreso') {
        lines.push(`Estado: ▶️ En progreso`, guards_1.SEP, `1️⃣  ✅ Completar tarea`, `2️⃣  ⏸️ Pausar tarea`, `3️⃣  📝 Reportar problema / nota`, `4️⃣  📄 Ver descripción completa`, `0️⃣  Volver`);
    }
    else {
        lines.push(`Estado: ${(0, guards_1.estadoEmoji)(r.estado)} ${r.estado}`, guards_1.SEP, `1️⃣  ▶️ Iniciar tarea`, `2️⃣  📝 Agregar nota`, `0️⃣  Volver`);
    }
    return lines.join('\n');
}
function buildOperacionalDetalle(t) {
    const pendConf = t.estado === 'pendiente_confirmacion';
    const tiempo = (t.tiempoTrabajadoSegundos ?? t.trabajoAcumuladoSegundos ?? 0);
    const lines = [
        `📌 *Operación #${t.id}*`,
        guards_1.SEP,
        `🔧 ${t.titulo}`,
        `📍 ${t.ubicacion ?? 'Sin ubicación'}`,
        `${(0, guards_1.prioEmoji)(t.prioridad)} Prioridad: *${t.prioridad.toUpperCase()}*`,
        `📝 ${t.descripcion}`,
        t.checklistObjetivo ? `📋 Checklist: ${t.checklistObjetivo}` : '',
        tiempo > 0 ? `⏱️ Tiempo trabajado: ${(0, guards_1.fmtDuration)(tiempo)}` : '',
        guards_1.SEP,
    ].filter(Boolean);
    if (pendConf) {
        lines.push(`¿Podés tomar esta tarea?`, `1️⃣  ✅ Sí, acepto`, `2️⃣  ❌ No puedo tomarla`, `0️⃣  Volver`);
    }
    else if (t.estado === 'pausada') {
        lines.push(`Estado: ⏸️ Pausada`, guards_1.SEP, `1️⃣  ▶️ Retomar tarea`, `2️⃣  ✅ Completar tarea`, `3️⃣  📝 Agregar nota`, `0️⃣  Volver`);
    }
    else {
        lines.push(`Estado: ${(0, guards_1.estadoEmoji)(normalizeEstado(t.estado))} ${t.estado}`, guards_1.SEP, `1️⃣  ✅ Completar tarea`, `2️⃣  ⏸️ Pausar tarea`, `3️⃣  📝 Reportar problema / nota`, `0️⃣  Volver`);
    }
    return lines.join('\n');
}
// ─── ACCIONES SOBRE TAREA ────────────────────────────────────────────────────
async function handleTareaDetalle(session, input) {
    const { tareaId, origen } = session.contextData;
    if (!tareaId)
        return (0, guards_1.errorMsg)('No se encontró la tarea.');
    try {
        if (origen === 'operacion') {
            return await handleOperacionalDetalle(session, tareaId, input);
        }
        return await handleReclamoDetalle(session, tareaId, input);
    }
    catch (e) {
        return (0, guards_1.errorMsg)(`Ocurrió un error al procesar la tarea. Escribí "menú" para volver al inicio.`);
    }
}
async function handleReclamoDetalle(session, reporteId, input) {
    const reporte = await (0, db_1.getReporteById)(reporteId);
    if (!reporte)
        return (0, guards_1.errorMsg)('Reclamo no encontrado.');
    const pendConf = reporte.asignacionEstado === 'pendiente_confirmacion';
    if (pendConf) {
        if (input === '1')
            return handleReclamoAceptar(session, reporte);
        if (input === '2')
            return handleReclamoRechazar(session, reporte);
        return (0, guards_1.invalidOption)(buildReclamoDetalle(reporte));
    }
    if (reporte.estado === 'pausado') {
        if (input === '1')
            return handleReclamoRetomar(session, reporte);
        if (input === '2') {
            await (0, session_1.navigateTo)(session, 'tarea_confirmar_completar', { tareaId: reporteId, origen: 'reclamo' });
            return buildConfirmarCompletar(reporte.titulo);
        }
        if (input === '3') {
            await (0, session_1.navigateTo)(session, 'tarea_nota_libre', { tareaId: reporteId, origen: 'reclamo', pendingText: true });
            return `📝 Escribí la nota que querés agregar a la tarea:`;
        }
        return (0, guards_1.invalidOption)(buildReclamoDetalle(reporte));
    }
    if (reporte.estado === 'en_progreso') {
        if (input === '1') {
            await (0, session_1.navigateTo)(session, 'tarea_confirmar_completar', { tareaId: reporteId, origen: 'reclamo' });
            return buildConfirmarCompletar(reporte.titulo);
        }
        if (input === '2') {
            await (0, session_1.navigateTo)(session, 'tarea_pausa_motivo', { tareaId: reporteId, origen: 'reclamo' });
            return buildPausaMotivo();
        }
        if (input === '3') {
            await (0, session_1.navigateTo)(session, 'tarea_problema', { tareaId: reporteId, origen: 'reclamo' });
            return buildProblemaMenu();
        }
        if (input === '4') {
            return `📝 *Descripción completa:*\n\n${reporte.descripcion}\n\n${guards_1.SEP}\n0️⃣  Volver`;
        }
        return (0, guards_1.invalidOption)(buildReclamoDetalle(reporte));
    }
    // pendiente / otros
    if (input === '1')
        return handleReclamoIniciar(session, reporte);
    if (input === '2') {
        await (0, session_1.navigateTo)(session, 'tarea_nota_libre', { tareaId: reporteId, origen: 'reclamo', pendingText: true });
        return `📝 Escribí la nota que querés agregar:`;
    }
    return (0, guards_1.invalidOption)(buildReclamoDetalle(reporte));
}
async function handleOperacionalDetalle(session, taskId, input) {
    const task = await (0, db_1.getOperationalTaskById)(taskId);
    if (!task)
        return (0, guards_1.errorMsg)('Tarea no encontrada.');
    const pendConf = task.estado === 'pendiente_confirmacion';
    if (pendConf) {
        if (input === '1') {
            try {
                await tasksService.acceptTask({ taskId, empleadoId: session.userId });
            }
            catch (error) {
                if (isOperationalTaskConflict(error)) {
                    return buildOperationalTaskAcceptanceBlocked(task, buildOperacionalDetalle(task));
                }
                await (0, session_1.navigateBack)(session);
                return `⚠️ No se pudo aceptar la tarea #${taskId}. Es posible que el estado haya cambiado. Revisá tu lista.\n\n0️⃣  Volver a mis tareas`;
            }
            await (0, session_1.navigateBack)(session);
            return `✅ *Tarea #${taskId} aceptada.*\nRegistramos el inicio de tu trabajo.\n\n0️⃣  Volver a mis tareas`;
        }
        if (input === '2') {
            try {
                await tasksService.rejectTask({ taskId, empleadoId: session.userId, note: 'Empleado no puede tomar la tarea' });
            }
            catch {
                await (0, session_1.navigateBack)(session);
                return `⚠️ No se pudo rechazar la tarea #${taskId}. Es posible que el estado haya cambiado.\n\n0️⃣  Volver a mis tareas`;
            }
            await (0, session_1.navigateBack)(session);
            return `❌ Tarea rechazada. Quedó disponible para reasignar.\n\n0️⃣  Volver a mis tareas`;
        }
        return (0, guards_1.invalidOption)(buildOperacionalDetalle(task));
    }
    if (task.estado === 'pausada') {
        if (input === '1') {
            await tasksService.resumeTask({ taskId, empleadoId: session.userId });
            await (0, session_1.navigateBack)(session);
            return `▶️ *Tarea #${taskId} retomada.*\n\n0️⃣  Volver a mis tareas`;
        }
        if (input === '2') {
            await (0, session_1.navigateTo)(session, 'tarea_confirmar_completar', { tareaId: taskId, origen: 'operacion' });
            return buildConfirmarCompletar(task.titulo);
        }
        if (input === '3') {
            await (0, session_1.navigateTo)(session, 'tarea_nota_libre', { tareaId: taskId, origen: 'operacion', pendingText: true });
            return `📝 Escribí la nota que querés agregar:`;
        }
        return (0, guards_1.invalidOption)(buildOperacionalDetalle(task));
    }
    if (input === '1') {
        await (0, session_1.navigateTo)(session, 'tarea_confirmar_completar', { tareaId: taskId, origen: 'operacion' });
        return buildConfirmarCompletar(task.titulo);
    }
    if (input === '2') {
        await (0, session_1.navigateTo)(session, 'tarea_pausa_motivo', { tareaId: taskId, origen: 'operacion' });
        return buildPausaMotivo();
    }
    if (input === '3') {
        await (0, session_1.navigateTo)(session, 'tarea_problema', { tareaId: taskId, origen: 'operacion' });
        return buildProblemaMenu();
    }
    return (0, guards_1.invalidOption)(buildOperacionalDetalle(task));
}
// ─── SUB-FLUJO: Aceptar / rechazar / iniciar reclamo ─────────────────────────
async function handleReclamoAceptar(session, reporte) {
    await (0, db_1.iniciarTrabajoReporte)(reporte.id);
    await (0, db_1.actualizarReporte)(reporte.id, {
        asignacionEstado: 'aceptada',
        asignacionRespondidaAt: new Date(),
    });
    await (0, db_1.crearActualizacion)({
        reporteId: reporte.id,
        usuarioNombre: session.userName,
        tipo: 'timer',
        descripcion: `${session.userName} aceptó la tarea vía WhatsApp`,
        estadoAnterior: reporte.estado,
        estadoNuevo: 'en_progreso',
    });
    await (0, session_1.navigateBack)(session);
    return [
        `✅ *Tarea #${reporte.id} aceptada.*`,
        ``,
        `▶️ Registramos el inicio de tu trabajo en:`,
        `📍 *${reporte.titulo}* — ${reporte.local}`,
        ``,
        `Avisá cuando termines o necesites pausar.`,
        ``,
        `0️⃣  Volver a mis tareas`,
    ].join('\n');
}
async function handleReclamoRechazar(session, reporte) {
    await (0, db_1.actualizarReporte)(reporte.id, {
        estado: 'pendiente',
        asignacionEstado: 'rechazada',
        asignadoA: null,
        asignadoId: null,
        asignacionRespondidaAt: new Date(),
        trabajoIniciadoAt: null,
    });
    await (0, db_1.crearActualizacion)({
        reporteId: reporte.id,
        usuarioNombre: session.userName,
        tipo: 'asignacion',
        descripcion: `${session.userName} indicó que no puede tomar la tarea. Liberada para reasignación.`,
        estadoAnterior: reporte.estado,
        estadoNuevo: 'pendiente',
    });
    (0, notification_1.notifyOwner)({
        title: `Tarea rechazada — Reclamo #${reporte.id}`,
        content: `${session.userName} no puede tomarla. Disponible para reasignar.`,
    }).catch(console.error);
    await (0, session_1.navigateBack)(session);
    return `❌ *Tarea rechazada.*\nEl encargado fue notificado para reasignarla.\n\n0️⃣  Volver a mis tareas`;
}
async function handleReclamoIniciar(session, reporte) {
    await (0, db_1.iniciarTrabajoReporte)(reporte.id);
    await (0, db_1.crearActualizacion)({
        reporteId: reporte.id,
        usuarioNombre: session.userName,
        tipo: 'timer',
        descripcion: `${session.userName} inició la tarea vía WhatsApp`,
        estadoAnterior: reporte.estado,
        estadoNuevo: 'en_progreso',
    });
    await (0, session_1.navigateBack)(session);
    return `▶️ *Tarea #${reporte.id} iniciada.*\nRegistramos el comienzo de tu trabajo.\n\n0️⃣  Volver a mis tareas`;
}
async function handleReclamoRetomar(session, reporte) {
    await (0, db_1.iniciarTrabajoReporte)(reporte.id);
    await (0, db_1.crearActualizacion)({
        reporteId: reporte.id,
        usuarioNombre: session.userName,
        tipo: 'timer',
        descripcion: `${session.userName} retomó la tarea vía WhatsApp`,
        estadoAnterior: 'pausado',
        estadoNuevo: 'en_progreso',
    });
    await (0, session_1.navigateBack)(session);
    return `▶️ *Tarea #${reporte.id} retomada.*\n\n0️⃣  Volver a mis tareas`;
}
// ─── SUB-FLUJO: Confirmar completar ──────────────────────────────────────────
function buildConfirmarCompletar(titulo) {
    return [
        `¿Confirmás que la tarea está completada?`,
        guards_1.SEP,
        `🔧 ${titulo}`,
        guards_1.SEP,
        `1️⃣  ✅ Sí, completar`,
        `2️⃣  ❌ Cancelar`,
    ].join('\n');
}
async function handleConfirmarCompletar(session, input) {
    const { tareaId, origen } = session.contextData;
    if (!tareaId)
        return (0, guards_1.errorMsg)('No se encontró la tarea.');
    if (input === '2') {
        await (0, session_1.navigateBack)(session);
        return await buildTareaDetalle({ ...session, currentMenu: 'tarea_detalle' });
    }
    if (input !== '1') {
        const titulo = origen === 'operacion'
            ? (await (0, db_1.getOperationalTaskById)(tareaId))?.titulo ?? 'Tarea'
            : (await (0, db_1.getReporteById)(tareaId))?.titulo ?? 'Tarea';
        return (0, guards_1.invalidOption)(buildConfirmarCompletar(titulo));
    }
    if (origen === 'operacion') {
        let result;
        try {
            result = await tasksService.finishTask({ taskId: tareaId, empleadoId: session.userId });
        }
        catch {
            await (0, session_1.navigateTo)(session, 'tareas_lista', { page: 1 });
            return `⚠️ No se pudo completar la tarea #${tareaId}. Puede que el estado haya cambiado.\n\n0️⃣  Volver a mis tareas`;
        }
        const tiempo = (0, guards_1.fmtDuration)(result.task.tiempoTrabajadoSegundos ?? result.task.trabajoAcumuladoSegundos ?? 0);
        await (0, session_1.navigateTo)(session, 'tareas_lista', { page: 1 });
        return [
            `🏁 *Operación #${tareaId} completada.*`,
            `⏱️ Tiempo total: *${tiempo}*`,
            ``,
            `¡Buen trabajo!`,
            ``,
            `0️⃣  Volver a mis tareas`,
        ].join('\n');
    }
    // reclamo
    const updated = await (0, db_1.completarTrabajoReporte)(tareaId);
    const tiempo = (0, guards_1.fmtDuration)(updated?.trabajoAcumuladoSegundos ?? 0);
    await (0, db_1.crearActualizacion)({
        reporteId: tareaId,
        usuarioNombre: session.userName,
        tipo: 'completado',
        descripcion: `${session.userName} completó la tarea vía WhatsApp. Tiempo: ${tiempo}`,
        estadoAnterior: 'en_progreso',
        estadoNuevo: 'completado',
    });
    (0, notification_1.notifyOwner)({
        title: `Tarea completada — Reclamo #${tareaId}`,
        content: `${session.userName}. Tiempo total: ${tiempo}`,
    }).catch(console.error);
    await (0, session_1.navigateTo)(session, 'tareas_lista', { page: 1 });
    return [
        `🏁 *Reclamo #${tareaId} completado.*`,
        `⏱️ Tiempo total: *${tiempo}*`,
        ``,
        `¡Buen trabajo!`,
        ``,
        `0️⃣  Volver a mis tareas`,
    ].join('\n');
}
// ─── SUB-FLUJO: Pausa con motivo ─────────────────────────────────────────────
function buildPausaMotivo() {
    return [
        `⏸️ *¿Por qué pausás la tarea?*`,
        guards_1.SEP,
        `1️⃣  🔩 Espero materiales / herramientas`,
        `2️⃣  🍽️ Corte de almuerzo`,
        `3️⃣  👥 Requiere más personal`,
        `4️⃣  🚪 Sin acceso al local`,
        `5️⃣  ✏️ Otro motivo (escribir)`,
        `0️⃣  Cancelar`,
    ].join('\n');
}
const MOTIVOS_PAUSA = {
    '1': 'Espera de materiales / herramientas',
    '2': 'Corte de almuerzo',
    '3': 'Requiere más personal',
    '4': 'Sin acceso al local',
};
async function handlePausaMotivo(session, input) {
    const { tareaId, origen } = session.contextData;
    if (!tareaId)
        return (0, guards_1.errorMsg)('No se encontró la tarea.');
    if (input === '5') {
        await (0, session_1.navigateTo)(session, 'tarea_pausa_motivo_libre', { ...session.contextData, pendingText: true });
        return `✏️ Escribí el motivo de la pausa brevemente:`;
    }
    const motivo = MOTIVOS_PAUSA[input];
    if (!motivo) {
        if (input === '0') {
            await (0, session_1.navigateBack)(session);
            return await buildTareaDetalle({ ...session, currentMenu: 'tarea_detalle' });
        }
        return (0, guards_1.invalidOption)(buildPausaMotivo());
    }
    return ejecutarPausa(session, tareaId, origen, motivo);
}
async function handlePausaMotivoLibre(session, texto) {
    const { tareaId, origen } = session.contextData;
    if (!tareaId)
        return (0, guards_1.errorMsg)('No se encontró la tarea.');
    return ejecutarPausa(session, tareaId, origen, texto.substring(0, 200));
}
async function ejecutarPausa(session, tareaId, origen, motivo) {
    if (origen === 'operacion') {
        try {
            await tasksService.pauseTask({ taskId: tareaId, empleadoId: session.userId });
        }
        catch {
            await (0, session_1.navigateTo)(session, 'tareas_lista', { page: 1 });
            return `⚠️ No se pudo pausar la tarea #${tareaId}. Puede que el estado haya cambiado.\n\n0️⃣  Volver a mis tareas`;
        }
    }
    else {
        await (0, db_1.pausarTrabajoReporte)(tareaId);
        await (0, db_1.crearActualizacion)({
            reporteId: tareaId,
            usuarioNombre: session.userName,
            tipo: 'timer',
            descripcion: `${session.userName} pausó la tarea. Motivo: ${motivo}`,
            estadoAnterior: 'en_progreso',
            estadoNuevo: 'pausado',
        });
    }
    await (0, session_1.navigateTo)(session, 'tareas_lista', { page: 1 });
    return [
        `⏸️ *Tarea #${tareaId} pausada.*`,
        `📝 Motivo: ${motivo}`,
        ``,
        `Avisá cuando puedas retomar.`,
        ``,
        `0️⃣  Volver a mis tareas`,
    ].join('\n');
}
// ─── SUB-FLUJO: Reportar problema / nota ─────────────────────────────────────
function buildProblemaMenu() {
    return [
        `📝 *¿Qué querés reportar?*`,
        guards_1.SEP,
        `1️⃣  🔩 Problema con materiales`,
        `2️⃣  👥 Necesito ayuda de otro empleado`,
        `3️⃣  🚪 Acceso bloqueado al local`,
        `4️⃣  ⚡ Problema eléctrico / técnico adicional`,
        `5️⃣  ✏️ Otro (escribir nota)`,
        `0️⃣  Cancelar`,
    ].join('\n');
}
const PROBLEMAS = {
    '1': 'Problema con materiales',
    '2': 'Necesita ayuda de otro empleado',
    '3': 'Acceso bloqueado al local',
    '4': 'Problema eléctrico / técnico adicional',
};
async function handleProblema(session, input) {
    const { tareaId, origen } = session.contextData;
    if (!tareaId)
        return (0, guards_1.errorMsg)('No se encontró la tarea.');
    if (input === '5') {
        await (0, session_1.navigateTo)(session, 'tarea_problema_libre', { ...session.contextData, pendingText: true });
        return `✏️ Escribí tu nota o reporte brevemente:`;
    }
    const problema = PROBLEMAS[input];
    if (!problema) {
        if (input === '0') {
            await (0, session_1.navigateBack)(session);
            return await buildTareaDetalle({ ...session, currentMenu: 'tarea_detalle' });
        }
        return (0, guards_1.invalidOption)(buildProblemaMenu());
    }
    return registrarNota(session, tareaId, origen, problema, true);
}
async function handleProblemaLibre(session, texto) {
    const { tareaId, origen } = session.contextData;
    if (!tareaId)
        return (0, guards_1.errorMsg)('No se encontró la tarea.');
    return registrarNota(session, tareaId, origen, texto.substring(0, 500), false);
}
async function handleNotaLibre(session, texto) {
    const { tareaId, origen } = session.contextData;
    if (!tareaId)
        return (0, guards_1.errorMsg)('No se encontró la tarea.');
    return registrarNota(session, tareaId, origen, texto.substring(0, 500), false);
}
async function registrarNota(session, tareaId, origen, nota, notificarAdmin) {
    if (origen === 'operacion') {
        const { addOperationalTaskEvent } = await Promise.resolve().then(() => __importStar(require('../../../db')));
        await addOperationalTaskEvent({
            tareaId,
            tipo: 'admin_update',
            actorTipo: 'employee',
            actorId: session.userId,
            actorNombre: session.userName,
            descripcion: nota,
            metadata: { source: 'whatsapp_menu' },
        });
    }
    else {
        await (0, db_1.crearActualizacion)({
            reporteId: tareaId,
            usuarioNombre: session.userName,
            tipo: 'progreso',
            descripcion: nota,
        });
        if (notificarAdmin) {
            (0, notification_1.notifyOwner)({
                title: `Reporte de problema — Reclamo #${tareaId}`,
                content: `${session.userName}: ${nota}`,
            }).catch(console.error);
        }
    }
    await (0, session_1.navigateTo)(session, 'tareas_lista', { page: 1 });
    return [
        `📝 *Nota registrada.*`,
        ``,
        `"${nota}"`,
        ``,
        notificarAdmin ? `⚠️ Se notificó al encargado.` : ``,
        ``,
        `0️⃣  Volver a mis tareas`,
    ].filter(l => l !== '').join('\n');
}
