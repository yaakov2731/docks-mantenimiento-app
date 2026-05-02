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
/**
 * REST API para el bot de WhatsApp.
 * Autenticación: header X-Bot-Api-Key
 */
const express_1 = require("express");
const crypto_1 = require("crypto");
const roundDb = __importStar(require("./db"));
const db_1 = require("./db");
const intent_parser_1 = require("./messages/intent-parser");
const engine_1 = require("./bot-menu/engine");
const notification_1 = require("./_core/notification");
const env_1 = require("./_core/env");
const _botApiKey = (0, env_1.readEnv)('BOT_API_KEY');
if (!_botApiKey)
    throw new Error('BOT_API_KEY env var is required');
const BOT_API_KEY = _botApiKey;
const service_1 = require("./rounds/service");
const service_2 = require("./tasks/service");
const reporte_assignment_1 = require("./reporte-assignment");
const operational_task_assignment_1 = require("./operational-task-assignment");
const botRouter = (0, express_1.Router)();
const roundsService = (0, service_1.createRoundsService)(roundDb);
const tasksService = (0, service_2.createOperationalTasksService)(roundDb);
const RESPUESTAS_EMPLEADO = ['recibida', 'no_puede', 'ocupado', 'franco'];
const PRIORIDADES = ['baja', 'media', 'alta', 'urgente'];
const CATEGORIAS = ['electrico', 'plomeria', 'estructura', 'limpieza', 'seguridad', 'climatizacion', 'otro'];
const PLANTAS = ['baja', 'alta'];
function formatDuration(seconds) {
    const safe = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    if (hours > 0)
        return `${hours}h ${minutes}m`;
    if (minutes > 0)
        return `${minutes}m`;
    return `${safe}s`;
}
function formatDateTime(value) {
    if (!value)
        return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function buildTaskPayload(reporte, tiempoTrabajadoSegundos) {
    if (isOperationalTaskRecord(reporte)) {
        return buildOperationalTaskPayload(reporte, tiempoTrabajadoSegundos);
    }
    const total = tiempoTrabajadoSegundos ?? (0, db_1.getReporteTiempoTrabajadoSegundos)(reporte);
    return {
        id: reporte.id,
        origen: 'reclamo',
        titulo: reporte.titulo,
        local: reporte.local,
        planta: reporte.planta,
        prioridad: reporte.prioridad,
        estado: reporte.estado,
        asignacionEstado: reporte.asignacionEstado,
        descripcion: reporte.descripcion,
        tiempoTrabajadoSegundos: total,
        tiempoTrabajado: formatDuration(total),
    };
}
function isOperationalTaskRecord(task) {
    return Boolean(task &&
        (typeof task?.ubicacion === 'string' ||
            typeof task?.tipoTrabajo === 'string' ||
            ['pendiente_asignacion', 'pendiente_confirmacion', 'pausada', 'terminada', 'rechazada'].includes(task?.estado)));
}
function normalizeOperationalTaskState(estado) {
    switch (estado) {
        case 'pendiente_asignacion':
        case 'pendiente_confirmacion':
            return 'pendiente';
        case 'pausada':
            return 'pausado';
        case 'terminada':
            return 'completado';
        case 'rechazada':
        case 'cancelada':
            return 'cancelado';
        default:
            return estado ?? 'pendiente';
    }
}
function deriveOperationalAssignmentState(task) {
    if (task?.estado === 'pendiente_confirmacion')
        return 'pendiente_confirmacion';
    if (task?.estado === 'rechazada')
        return 'rechazada';
    if (task?.estado === 'cancelada')
        return 'cancelada';
    if (task?.estado === 'pendiente_asignacion')
        return 'pendiente';
    return 'aceptada';
}
function buildOperationalTaskPayload(task, tiempoTrabajadoSegundos) {
    const total = Number(tiempoTrabajadoSegundos ?? task?.tiempoTrabajadoSegundos ?? task?.trabajoAcumuladoSegundos ?? 0);
    const nextReview = formatDateTime(task?.proximaRevisionAt);
    return {
        id: task.id,
        origen: 'operacion',
        titulo: task.titulo,
        local: task.ubicacion ?? task.local ?? 'Tarea operativa',
        planta: task.planta ?? '',
        prioridad: task.prioridad,
        estado: normalizeOperationalTaskState(task.estado),
        asignacionEstado: deriveOperationalAssignmentState(task),
        descripcion: task.descripcion,
        orden: Number(task?.ordenAsignacion ?? task?.orden ?? 0),
        checklistObjetivo: task?.checklistObjetivo ?? null,
        recurrenteCadaHoras: task?.recurrenteCadaHoras ?? null,
        proximaRevisionAt: nextReview,
        ultimaRevisionAt: formatDateTime(task?.ultimaRevisionAt),
        dueNow: nextReview ? new Date(nextReview).getTime() <= Date.now() : true,
        tiempoTrabajadoSegundos: total,
        tiempoTrabajado: formatDuration(total),
    };
}
function buildAttendancePayload(status) {
    return {
        onShift: !!status?.onShift,
        onLunch: !!status?.onLunch,
        lastAction: status?.lastAction ?? null,
        lastActionAt: status?.lastActionAt ?? null,
        lastChannel: status?.lastChannel ?? null,
        lastEntryAt: status?.lastEntryAt ?? null,
        lastExitAt: status?.lastExitAt ?? null,
        lunchStartedAt: status?.lunchStartedAt ?? null,
        lastLunchStartAt: status?.lastLunchStartAt ?? null,
        lastLunchEndAt: status?.lastLunchEndAt ?? null,
        workedSecondsToday: status?.workedSecondsToday ?? 0,
        workedTimeToday: formatDuration(status?.workedSecondsToday ?? 0),
        grossWorkedSecondsToday: status?.grossWorkedSecondsToday ?? 0,
        grossWorkedTimeToday: formatDuration(status?.grossWorkedSecondsToday ?? 0),
        todayLunchSeconds: status?.todayLunchSeconds ?? 0,
        todayLunchTime: formatDuration(status?.todayLunchSeconds ?? 0),
        currentShiftSeconds: status?.currentShiftSeconds ?? 0,
        currentShiftTime: formatDuration(status?.currentShiftSeconds ?? 0),
        currentLunchSeconds: status?.currentLunchSeconds ?? 0,
        currentLunchTime: formatDuration(status?.currentLunchSeconds ?? 0),
        todayEntries: status?.todayEntries ?? 0,
        todayLunchStarts: status?.todayLunchStarts ?? 0,
        todayLunchEnds: status?.todayLunchEnds ?? 0,
        todayExits: status?.todayExits ?? 0,
    };
}
function authBot(req, res, next) {
    const key = req.headers['x-bot-api-key'];
    if (!key || typeof key !== 'string' || key.length !== BOT_API_KEY.length) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const match = (0, crypto_1.timingSafeEqual)(Buffer.from(key), Buffer.from(BOT_API_KEY));
    if (!match)
        return res.status(401).json({ error: 'Unauthorized' });
    next();
}
const MAX_TEXT = 500;
const MAX_NOMBRE = 120;
const MAX_WA = 20;
function clamp(value, max) {
    return value ? value.slice(0, max) : value;
}
function parseId(value) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0)
        return null;
    return parsed;
}
function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function normalizeOptionalText(value) {
    const normalized = normalizeText(value);
    return normalized.length > 0 ? normalized : undefined;
}
function normalizeWaNumber(value) {
    return typeof value === 'string' ? value.replace(/\D/g, '') : '';
}
async function getAdminBotUsers() {
    const users = await (0, db_1.getUsers)();
    return users.filter((user) => user.role === 'admin' && !!normalizeWaNumber(user.waId));
}
async function getPrimaryAdminBotUser() {
    const admins = await getAdminBotUsers();
    return admins[0] ?? null;
}
async function getAdminBotUserById(adminId) {
    const admins = await getAdminBotUsers();
    return admins.find((admin) => admin.id === adminId) ?? null;
}
async function getAdminBotUserByWaNumber(waNumber) {
    const normalized = normalizeWaNumber(waNumber);
    const admins = await getAdminBotUsers();
    return admins.find((admin) => normalizeWaNumber(admin.waId) === normalized) ?? null;
}
function adminReportPriorityRank(prioridad) {
    switch (prioridad) {
        case 'urgente': return 4;
        case 'alta': return 3;
        case 'media': return 2;
        case 'baja': return 1;
        default: return 0;
    }
}
function isOpenComplaint(reporte) {
    return reporte && !['completado', 'cancelado'].includes(reporte.estado);
}
function sortAdminPendingReports(left, right) {
    return (adminReportPriorityRank(right.prioridad) - adminReportPriorityRank(left.prioridad) ||
        new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime() ||
        Number(right.id ?? 0) - Number(left.id ?? 0));
}
async function listAdminPendingReports() {
    const reportes = await (0, db_1.getReportes)();
    return reportes.filter(isOpenComplaint).sort(sortAdminPendingReports);
}
function buildAdminMenu() {
    return [
        '1. Ver pendientes',
        '2. Asignar último reclamo',
        '3. Buscar reclamo por número',
        '4. Ayuda',
    ];
}
function buildAdminComplaintAlertMessage(reporte) {
    return [
        `Nuevo reclamo #${reporte.id}`,
        `Local: ${reporte.local}`,
        `Prioridad: ${reporte.prioridad}`,
        `Motivo: ${reporte.titulo}`,
        `Locatario: ${reporte.locatario}`,
        '',
        ...buildAdminMenu(),
    ].join('\n');
}
function serializeAdminReport(reporte) {
    return {
        id: reporte.id,
        titulo: reporte.titulo,
        locatario: reporte.locatario,
        local: reporte.local,
        planta: reporte.planta,
        prioridad: reporte.prioridad,
        estado: reporte.estado,
        asignacionEstado: reporte.asignacionEstado,
        asignadoA: reporte.asignadoA ?? null,
        descripcion: reporte.descripcion,
        createdAt: formatDateTime(reporte.createdAt),
    };
}
function isValidPrioridad(value) {
    return PRIORIDADES.includes(value);
}
function isValidCategoria(value) {
    return CATEGORIAS.includes(value);
}
function isValidPlanta(value) {
    return PLANTAS.includes(value);
}
function parseOptionalBodyId(value) {
    if (value === null || value === undefined || value === '')
        return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0)
        return null;
    return parsed;
}
function buildRechazoDescription(respuesta) {
    if (respuesta === 'franco')
        return 'Empleado indicó que está de franco. Tarea liberada para reasignación.';
    if (respuesta === 'ocupado')
        return 'Empleado indicó que está ocupado. Tarea liberada para reasignación.';
    return 'Empleado indicó que no puede tomar la tarea. Tarea liberada para reasignación.';
}
function mapOperationalTaskError(res, error) {
    const message = error?.message ?? 'No se pudo actualizar la tarea operativa';
    if (message.includes('already has active') || message.includes('already has an active')) {
        return res.status(409).json({ error: message });
    }
    if (message.includes('not found'))
        return res.status(404).json({ error: message });
    if (message.includes('does not belong') || message.includes('awaiting confirmation') || message.includes('cannot be finished')) {
        return res.status(400).json({ error: message });
    }
    return res.status(400).json({ error: message });
}
function botPriorityRank(prioridad) {
    switch (prioridad) {
        case 'urgente': return 4;
        case 'alta': return 3;
        case 'media': return 2;
        case 'baja': return 1;
        default: return 0;
    }
}
function botTaskRank(task) {
    if (task.asignacionEstado === 'pendiente_confirmacion')
        return 0;
    switch (task.estado) {
        case 'en_progreso': return 1;
        case 'pausado': return 2;
        case 'pendiente': return 3;
        default: return 4;
    }
}
function sortBotTasks(left, right) {
    return (botTaskRank(left) - botTaskRank(right) ||
        botPriorityRank(right.prioridad) - botPriorityRank(left.prioridad) ||
        Number(left.orden ?? 0) - Number(right.orden ?? 0) ||
        Number(left.id ?? 0) - Number(right.id ?? 0));
}
function buildEmpleadoCounters(tareas) {
    const activas = tareas.filter(task => !['completado', 'cancelado'].includes(task.estado));
    const reclamos = activas.filter(task => task.origen !== 'operacion');
    const operaciones = activas.filter(task => task.origen === 'operacion');
    return {
        pendientesConfirmacion: activas.filter(task => task.asignacionEstado === 'pendiente_confirmacion').length,
        enCurso: activas.filter(task => task.estado === 'en_progreso').length,
        pausadas: activas.filter(task => task.estado === 'pausado').length,
        pendientes: activas.filter(task => task.estado === 'pendiente').length,
        activas: activas.length,
        reclamosActivos: reclamos.length,
        operacionesActivas: operaciones.length,
        reclamosPendientesConfirmacion: reclamos.filter(task => task.asignacionEstado === 'pendiente_confirmacion').length,
        operacionesPendientesConfirmacion: operaciones.filter(task => task.asignacionEstado === 'pendiente_confirmacion').length,
    };
}
async function resolveOperationalTaskAssignment(taskId, empleadoId) {
    const task = await (0, db_1.getOperationalTaskById)(taskId);
    if (!task)
        throw new Error('Operational task not found');
    const effectiveEmployeeId = Number.isFinite(Number(empleadoId)) && Number(empleadoId) > 0
        ? Number(empleadoId)
        : Number(task.empleadoId);
    if (!Number.isFinite(effectiveEmployeeId) || effectiveEmployeeId <= 0) {
        throw new Error('Operational task has no assigned employee');
    }
    return { task, empleadoId: effectiveEmployeeId };
}
async function startOperationalTaskCompatibility(params) {
    const { task, empleadoId } = await resolveOperationalTaskAssignment(params.taskId, params.empleadoId);
    if (task.empleadoId !== empleadoId) {
        throw new Error('Operational task does not belong to employee');
    }
    if (task.estado === 'pendiente_confirmacion') {
        return tasksService.acceptTask({ taskId: params.taskId, empleadoId });
    }
    if (task.estado === 'pausada') {
        return tasksService.resumeTask({ taskId: params.taskId, empleadoId });
    }
    return (0, db_1.getOperationalTaskById)(params.taskId);
}
botRouter.get('/admin/identificar/:waNumber', authBot, async (req, res) => {
    try {
        const admin = await getAdminBotUserByWaNumber(req.params.waNumber);
        if (!admin)
            return res.json({ found: false });
        return res.json({
            found: true,
            admin: {
                id: admin.id,
                name: admin.name,
                role: admin.role,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ error: error?.message ?? 'No se pudo identificar al admin' });
    }
});
botRouter.get('/admin/:id/resumen', authBot, async (req, res) => {
    try {
        const adminId = parseId(req.params.id);
        if (!adminId)
            return res.status(400).json({ error: 'id de admin inválido' });
        const admin = await getAdminBotUserById(adminId);
        if (!admin)
            return res.status(404).json({ error: 'Admin no encontrado' });
        const pendingReports = await listAdminPendingReports();
        const latestPending = pendingReports[0] ?? null;
        return res.json({
            admin: {
                id: admin.id,
                name: admin.name,
                role: admin.role,
            },
            counters: {
                pending: pendingReports.length,
                urgent: pendingReports.filter((item) => item.prioridad === 'urgente').length,
                unassigned: pendingReports.filter((item) => !item.asignadoId).length,
            },
            latestPending: latestPending ? serializeAdminReport(latestPending) : null,
            menu: buildAdminMenu(),
        });
    }
    catch (error) {
        return res.status(500).json({ error: error?.message ?? 'No se pudo cargar el resumen admin' });
    }
});
botRouter.get('/admin/:id/reclamos', authBot, async (req, res) => {
    try {
        const adminId = parseId(req.params.id);
        if (!adminId)
            return res.status(400).json({ error: 'id de admin inválido' });
        const admin = await getAdminBotUserById(adminId);
        if (!admin)
            return res.status(404).json({ error: 'Admin no encontrado' });
        const pendingReports = await listAdminPendingReports();
        return res.json({
            reclamos: pendingReports.map(serializeAdminReport),
            menu: buildAdminMenu(),
        });
    }
    catch (error) {
        return res.status(500).json({ error: error?.message ?? 'No se pudo listar reclamos pendientes' });
    }
});
botRouter.get('/admin/:id/reporte/:reporteId', authBot, async (req, res) => {
    try {
        const adminId = parseId(req.params.id);
        const reporteId = parseId(req.params.reporteId);
        if (!adminId || !reporteId)
            return res.status(400).json({ error: 'adminId y reporteId son requeridos' });
        const admin = await getAdminBotUserById(adminId);
        if (!admin)
            return res.status(404).json({ error: 'Admin no encontrado' });
        const reporte = await (0, db_1.getReporteById)(reporteId);
        if (!reporte)
            return res.status(404).json({ error: 'Reclamo no encontrado' });
        return res.json({
            reporte: serializeAdminReport(reporte),
            menu: buildAdminMenu(),
        });
    }
    catch (error) {
        return res.status(500).json({ error: error?.message ?? 'No se pudo obtener el reclamo' });
    }
});
botRouter.post('/admin/:id/reporte/:reporteId/asignar', authBot, async (req, res) => {
    try {
        const adminId = parseId(req.params.id);
        const reporteId = parseId(req.params.reporteId);
        const empleadoId = Number(req.body?.empleadoId);
        if (!adminId || !reporteId || !Number.isFinite(empleadoId)) {
            return res.status(400).json({ error: 'adminId, reporteId y empleadoId son requeridos' });
        }
        const admin = await getAdminBotUserById(adminId);
        if (!admin)
            return res.status(404).json({ error: 'Admin no encontrado' });
        const empleado = await (0, db_1.getEmpleadoById)(empleadoId);
        if (!empleado)
            return res.status(404).json({ error: 'Empleado no encontrado' });
        await (0, reporte_assignment_1.assignReporteToEmployee)({
            reporteId,
            empleadoId,
            empleadoNombre: empleado.nombre,
            actor: {
                id: admin.id,
                name: admin.name,
            },
        });
        return res.json({
            success: true,
            reporteId,
            empleado: {
                id: empleado.id,
                nombre: empleado.nombre,
            },
        });
    }
    catch (error) {
        const message = error?.message ?? 'No se pudo asignar el reclamo';
        if (message.includes('no encontrado'))
            return res.status(404).json({ error: message });
        return res.status(500).json({ error: message });
    }
});
botRouter.post('/admin/:id/ronda/:occurrenceId/asignar', authBot, async (req, res) => {
    try {
        const adminId = parseId(req.params.id);
        const occurrenceId = parseId(req.params.occurrenceId);
        const empleadoId = Number(req.body?.empleadoId);
        if (!adminId || !occurrenceId || !Number.isFinite(empleadoId)) {
            return res.status(400).json({ error: 'adminId, occurrenceId y empleadoId son requeridos' });
        }
        const admin = await getAdminBotUserById(adminId);
        if (!admin)
            return res.status(404).json({ error: 'Admin no encontrado' });
        const empleado = await (0, db_1.getEmpleadoById)(empleadoId);
        if (!empleado)
            return res.status(404).json({ error: 'Empleado no encontrado' });
        const occurrence = await roundsService.assignOccurrence({
            occurrenceId,
            empleadoId,
            actor: {
                id: admin.id,
                name: admin.name,
            },
        });
        return res.json({ success: true, occurrence });
    }
    catch (error) {
        const message = error?.message ?? 'No se pudo asignar la ronda';
        if (message.includes('not found') || message.includes('no encontrado')) {
            return res.status(404).json({ error: message });
        }
        return res.status(400).json({ error: message });
    }
});
botRouter.post('/admin/:id/ronda/:occurrenceId/liberar', authBot, async (req, res) => {
    try {
        const adminId = parseId(req.params.id);
        const occurrenceId = parseId(req.params.occurrenceId);
        if (!adminId || !occurrenceId) {
            return res.status(400).json({ error: 'adminId y occurrenceId son requeridos' });
        }
        const admin = await getAdminBotUserById(adminId);
        if (!admin)
            return res.status(404).json({ error: 'Admin no encontrado' });
        const occurrence = await roundsService.releaseOccurrence({
            occurrenceId,
            actor: {
                id: admin.id,
                name: admin.name,
            },
        });
        return res.json({ success: true, occurrence });
    }
    catch (error) {
        const message = error?.message ?? 'No se pudo liberar la ronda';
        if (message.includes('not found') || message.includes('no encontrado')) {
            return res.status(404).json({ error: message });
        }
        return res.status(400).json({ error: message });
    }
});
botRouter.post('/rondas/ocurrencia/:id/responder', authBot, async (req, res) => {
    try {
        const occurrenceId = Number(req.params.id);
        const { empleadoId, opcion, nota } = req.body;
        if (!Number.isFinite(occurrenceId) || !Number.isFinite(Number(empleadoId))) {
            return res.status(400).json({ error: 'occurrenceId y empleadoId son requeridos' });
        }
        if (!['1', '2', '3'].includes(opcion)) {
            return res.status(400).json({ error: 'opcion inválida' });
        }
        const occurrence = await roundsService.registerWhatsappReply({
            occurrenceId,
            empleadoId: Number(empleadoId),
            option: opcion,
            note: typeof nota === 'string' ? nota : undefined,
        });
        return res.json({ success: true, occurrence });
    }
    catch (e) {
        const message = e?.message ?? 'No se pudo registrar la respuesta';
        if (message.includes('not found'))
            return res.status(404).json({ error: message });
        if (message.includes('does not belong') || message.includes('no longer pending') || message.includes('Unsupported')) {
            return res.status(400).json({ error: message });
        }
        return res.status(500).json({ error: message });
    }
});
botRouter.post('/tarea-operativa/:id/aceptar', authBot, async (req, res) => {
    try {
        const taskId = Number(req.params.id);
        const empleadoId = Number(req.body.empleadoId);
        if (!Number.isFinite(taskId) || !Number.isFinite(empleadoId)) {
            return res.status(400).json({ error: 'taskId y empleadoId son requeridos' });
        }
        const task = await tasksService.acceptTask({ taskId, empleadoId });
        return res.json({ success: true, task });
    }
    catch (error) {
        return mapOperationalTaskError(res, error);
    }
});
botRouter.post('/tarea-operativa/:id/pausar', authBot, async (req, res) => {
    try {
        const taskId = Number(req.params.id);
        const empleadoId = Number(req.body.empleadoId);
        if (!Number.isFinite(taskId) || !Number.isFinite(empleadoId)) {
            return res.status(400).json({ error: 'taskId y empleadoId son requeridos' });
        }
        const task = await tasksService.pauseTask({ taskId, empleadoId });
        return res.json({ success: true, task });
    }
    catch (error) {
        return mapOperationalTaskError(res, error);
    }
});
botRouter.post('/tarea-operativa/:id/terminar', authBot, async (req, res) => {
    try {
        const taskId = Number(req.params.id);
        const empleadoId = Number(req.body.empleadoId);
        const nota = typeof req.body.nota === 'string' ? req.body.nota : undefined;
        if (!Number.isFinite(taskId) || !Number.isFinite(empleadoId)) {
            return res.status(400).json({ error: 'taskId y empleadoId son requeridos' });
        }
        const result = await tasksService.finishTask({ taskId, empleadoId, note: nota });
        return res.json({ success: true, task: result.task, nextTask: result.nextTask });
    }
    catch (error) {
        return mapOperationalTaskError(res, error);
    }
});
botRouter.post('/tarea-operativa/:id/rechazar', authBot, async (req, res) => {
    try {
        const taskId = Number(req.params.id);
        const empleadoId = Number(req.body.empleadoId);
        const nota = typeof req.body.nota === 'string' ? req.body.nota : undefined;
        if (!Number.isFinite(taskId) || !Number.isFinite(empleadoId)) {
            return res.status(400).json({ error: 'taskId y empleadoId son requeridos' });
        }
        const task = await tasksService.rejectTask({ taskId, empleadoId, note: nota });
        return res.json({ success: true, task });
    }
    catch (error) {
        return mapOperationalTaskError(res, error);
    }
});
botRouter.post('/tarea-operativa/:id/cancelar', authBot, async (req, res) => {
    try {
        const taskId = Number(req.params.id);
        const empleadoId = Number(req.body.empleadoId);
        const nota = typeof req.body.nota === 'string' ? req.body.nota : undefined;
        if (!Number.isFinite(taskId) || !Number.isFinite(empleadoId)) {
            return res.status(400).json({ error: 'taskId y empleadoId son requeridos' });
        }
        const task = await tasksService.cancelTask({ taskId, empleadoId, note: nota });
        return res.json({ success: true, task });
    }
    catch (error) {
        return mapOperationalTaskError(res, error);
    }
});
botRouter.post('/rondas/ocurrencia/:id/iniciar', authBot, async (req, res) => {
    try {
        const occurrenceId = Number(req.params.id);
        const empleadoId = Number(req.body.empleadoId);
        if (!Number.isFinite(occurrenceId) || !Number.isFinite(empleadoId)) {
            return res.status(400).json({ error: 'occurrenceId y empleadoId son requeridos' });
        }
        const occurrence = await roundsService.startOccurrence({ occurrenceId, empleadoId });
        return res.json({ success: true, occurrence });
    }
    catch (error) {
        const message = error?.message ?? 'No se pudo iniciar la ronda';
        if (message.includes('not found'))
            return res.status(404).json({ error: message });
        return res.status(400).json({ error: message });
    }
});
botRouter.post('/rondas/ocurrencia/:id/pausar', authBot, async (req, res) => {
    try {
        const occurrenceId = Number(req.params.id);
        const empleadoId = Number(req.body.empleadoId);
        if (!Number.isFinite(occurrenceId) || !Number.isFinite(empleadoId)) {
            return res.status(400).json({ error: 'occurrenceId y empleadoId son requeridos' });
        }
        const occurrence = await roundsService.pauseOccurrence({ occurrenceId, empleadoId });
        return res.json({ success: true, occurrence });
    }
    catch (error) {
        const message = error?.message ?? 'No se pudo pausar la ronda';
        if (message.includes('not found'))
            return res.status(404).json({ error: message });
        return res.status(400).json({ error: message });
    }
});
botRouter.post('/rondas/ocurrencia/:id/finalizar', authBot, async (req, res) => {
    try {
        const occurrenceId = Number(req.params.id);
        const empleadoId = Number(req.body.empleadoId);
        const nota = typeof req.body.nota === 'string' ? req.body.nota : undefined;
        if (!Number.isFinite(occurrenceId) || !Number.isFinite(empleadoId)) {
            return res.status(400).json({ error: 'occurrenceId y empleadoId son requeridos' });
        }
        const occurrence = await roundsService.finishOccurrence({ occurrenceId, empleadoId, note: nota });
        return res.json({ success: true, occurrence });
    }
    catch (error) {
        const message = error?.message ?? 'No se pudo finalizar la ronda';
        if (message.includes('not found'))
            return res.status(404).json({ error: message });
        return res.status(400).json({ error: message });
    }
});
botRouter.post('/rondas/ocurrencia/:id/observar', authBot, async (req, res) => {
    try {
        const occurrenceId = Number(req.params.id);
        const empleadoId = Number(req.body.empleadoId);
        const nota = typeof req.body.nota === 'string' ? req.body.nota : undefined;
        if (!Number.isFinite(occurrenceId) || !Number.isFinite(empleadoId)) {
            return res.status(400).json({ error: 'occurrenceId y empleadoId son requeridos' });
        }
        const occurrence = await roundsService.reportObservation({ occurrenceId, empleadoId, note: nota });
        return res.json({ success: true, occurrence });
    }
    catch (error) {
        const message = error?.message ?? 'No se pudo registrar la observacion';
        if (message.includes('not found'))
            return res.status(404).json({ error: message });
        return res.status(400).json({ error: message });
    }
});
botRouter.post('/rondas/ocurrencia/:id/no-pude', authBot, async (req, res) => {
    try {
        const occurrenceId = Number(req.params.id);
        const empleadoId = Number(req.body.empleadoId);
        const nota = typeof req.body.nota === 'string' ? req.body.nota : undefined;
        if (!Number.isFinite(occurrenceId) || !Number.isFinite(empleadoId)) {
            return res.status(400).json({ error: 'occurrenceId y empleadoId son requeridos' });
        }
        const occurrence = await roundsService.markUnableToComplete({ occurrenceId, empleadoId, note: nota });
        return res.json({ success: true, occurrence });
    }
    catch (error) {
        const message = error?.message ?? 'No se pudo marcar la ronda como no realizada';
        if (message.includes('not found'))
            return res.status(404).json({ error: message });
        return res.status(400).json({ error: message });
    }
});
// Legacy compatibility for the currently deployed WhatsApp bot.
botRouter.post('/operacion/:id/respuesta', authBot, async (req, res) => {
    try {
        const taskId = parseId(req.params.id);
        if (!taskId)
            return res.status(400).json({ error: 'id de tarea inválido' });
        const respuesta = normalizeText(req.body?.respuesta).toLowerCase();
        const empleadoNombre = normalizeOptionalText(req.body?.empleadoNombre);
        const { empleadoId } = await resolveOperationalTaskAssignment(taskId, req.body?.empleadoId);
        if (!respuesta || !RESPUESTAS_EMPLEADO.includes(respuesta)) {
            return res.status(400).json({ error: 'respuesta inválida' });
        }
        if (respuesta === 'recibida') {
            const task = await tasksService.acceptTask({ taskId, empleadoId });
            return res.json({ success: true, respuesta, task: buildTaskPayload(task) });
        }
        const note = normalizeOptionalText(req.body?.nota) ?? buildRechazoDescription(respuesta);
        const task = await tasksService.rejectTask({ taskId, empleadoId, note });
        return res.json({ success: true, respuesta, task: buildTaskPayload(task) });
    }
    catch (error) {
        return mapOperationalTaskError(res, error);
    }
});
botRouter.post('/operacion/:id/iniciar', authBot, async (req, res) => {
    try {
        const taskId = parseId(req.params.id);
        if (!taskId)
            return res.status(400).json({ error: 'id de tarea inválido' });
        const task = await startOperationalTaskCompatibility({
            taskId,
            empleadoId: parseOptionalBodyId(req.body?.empleadoId),
            empleadoNombre: normalizeOptionalText(req.body?.empleadoNombre),
        });
        if (!task)
            return res.status(404).json({ error: 'Operational task not found' });
        const payload = buildTaskPayload(task);
        return res.json({
            success: true,
            estado: payload.estado,
            tiempoTrabajadoSegundos: payload.tiempoTrabajadoSegundos,
            tiempoTrabajado: payload.tiempoTrabajado,
            task: payload,
        });
    }
    catch (error) {
        return mapOperationalTaskError(res, error);
    }
});
botRouter.post('/operacion/:id/progreso', authBot, async (req, res) => {
    try {
        const taskId = parseId(req.params.id);
        if (!taskId)
            return res.status(400).json({ error: 'id de tarea inválido' });
        const nota = normalizeOptionalText(req.body?.nota);
        if (!nota)
            return res.status(400).json({ error: 'nota es requerida' });
        const { empleadoId } = await resolveOperationalTaskAssignment(taskId, req.body?.empleadoId);
        const empleadoNombre = normalizeOptionalText(req.body?.empleadoNombre);
        await startOperationalTaskCompatibility({ taskId, empleadoId, empleadoNombre });
        await (0, db_1.addOperationalTaskEvent)({
            tareaId: taskId,
            tipo: 'admin_update',
            actorTipo: 'employee',
            actorId: empleadoId,
            actorNombre: empleadoNombre ?? 'Empleado',
            descripcion: nota,
            metadata: { source: 'whatsapp_progress' },
        });
        const task = await (0, db_1.getOperationalTaskById)(taskId);
        const payload = task ? buildTaskPayload(task) : null;
        return res.json({
            success: true,
            tiempoTrabajadoSegundos: payload?.tiempoTrabajadoSegundos ?? 0,
            tiempoTrabajado: payload?.tiempoTrabajado ?? formatDuration(0),
            task: payload,
        });
    }
    catch (error) {
        return mapOperationalTaskError(res, error);
    }
});
botRouter.post('/operacion/:id/pausar', authBot, async (req, res) => {
    try {
        const taskId = parseId(req.params.id);
        if (!taskId)
            return res.status(400).json({ error: 'id de tarea inválido' });
        const { empleadoId } = await resolveOperationalTaskAssignment(taskId, req.body?.empleadoId);
        const task = await tasksService.pauseTask({
            taskId,
            empleadoId,
        });
        const payload = buildTaskPayload(task);
        return res.json({
            success: true,
            estado: payload.estado,
            tiempoTrabajadoSegundos: payload.tiempoTrabajadoSegundos,
            tiempoTrabajado: payload.tiempoTrabajado,
            task: payload,
        });
    }
    catch (error) {
        return mapOperationalTaskError(res, error);
    }
});
botRouter.post('/operacion/:id/completar', authBot, async (req, res) => {
    try {
        const taskId = parseId(req.params.id);
        if (!taskId)
            return res.status(400).json({ error: 'id de tarea inválido' });
        const { empleadoId } = await resolveOperationalTaskAssignment(taskId, req.body?.empleadoId);
        const nota = normalizeOptionalText(req.body?.nota);
        const result = await tasksService.finishTask({ taskId, empleadoId, note: nota });
        const payload = buildTaskPayload(result.task);
        return res.json({
            success: true,
            tiempoTrabajadoSegundos: payload.tiempoTrabajadoSegundos,
            tiempoTrabajado: payload.tiempoTrabajado,
            nextTask: result.nextTask ? buildTaskPayload(result.nextTask) : null,
            task: payload,
        });
    }
    catch (error) {
        return mapOperationalTaskError(res, error);
    }
});
// POST /api/bot/reporte
botRouter.post('/reporte', authBot, async (req, res) => {
    try {
        const locatario = normalizeText(req.body?.locatario);
        const local = normalizeText(req.body?.local);
        const planta = normalizeText(req.body?.planta);
        const contacto = normalizeOptionalText(req.body?.contacto);
        const categoria = normalizeText(req.body?.categoria).toLowerCase();
        const prioridad = normalizeText(req.body?.prioridad).toLowerCase();
        const titulo = normalizeText(req.body?.titulo);
        const descripcion = normalizeText(req.body?.descripcion);
        if (!locatario || !local || !planta || !categoria || !prioridad || !titulo || !descripcion) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }
        if (!isValidPlanta(planta)) {
            return res.status(400).json({ error: `planta inválida. Debe ser una de: ${PLANTAS.join(', ')}` });
        }
        if (!isValidCategoria(categoria)) {
            return res.status(400).json({ error: `categoria inválida. Debe ser una de: ${CATEGORIAS.join(', ')}` });
        }
        if (!isValidPrioridad(prioridad)) {
            return res.status(400).json({ error: `prioridad inválida. Debe ser una de: ${PRIORIDADES.join(', ')}` });
        }
        const id = await (0, db_1.crearReporte)({ locatario, local, planta, contacto, categoria, prioridad, titulo, descripcion });
        const primaryAdmin = await getPrimaryAdminBotUser();
        if (primaryAdmin?.waId) {
            await (0, db_1.enqueueBotMessage)(primaryAdmin.waId, buildAdminComplaintAlertMessage({
                id,
                local,
                prioridad,
                titulo,
                locatario,
            }));
        }
        (0, notification_1.notifyOwner)({
            title: `[${prioridad.toUpperCase()}] Reclamo vía WhatsApp — ${local}`,
            content: `${locatario}: ${titulo}`,
            urgent: prioridad === 'urgente',
        }).catch(console.error);
        return res.json({ success: true, id });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/bot/lead
botRouter.post('/lead', authBot, async (req, res) => {
    try {
        const nombre = clamp(normalizeText(req.body?.nombre), MAX_NOMBRE);
        const telefono = clamp(normalizeOptionalText(req.body?.telefono), MAX_WA);
        const email = clamp(normalizeOptionalText(req.body?.email), 200);
        const waId = clamp(normalizeOptionalText(req.body?.waId), MAX_WA);
        const rubro = clamp(normalizeOptionalText(req.body?.rubro), 100);
        const tipoLocal = clamp(normalizeOptionalText(req.body?.tipoLocal), 200);
        const mensaje = clamp(normalizeOptionalText(req.body?.mensaje), MAX_TEXT);
        if (!nombre)
            return res.status(400).json({ error: 'nombre es requerido' });
        const id = await (0, db_1.crearLead)({ nombre, telefono, email, waId, rubro, tipoLocal, mensaje, fuente: 'whatsapp' });
        (0, notification_1.notifyOwner)({
            title: `Nuevo lead WhatsApp`,
            content: `${nombre} (${telefono || waId || 'sin contacto'}) — ${rubro || 'sin rubro'}`,
        }).catch(console.error);
        return res.json({ success: true, id });
    }
    catch {
        return res.status(500).json({ error: 'No se pudo registrar el lead' });
    }
});
// GET /api/bot/locales-disponibles
botRouter.get('/locales-disponibles', authBot, (_req, res) => {
    return res.json({
        disponibles: [],
        mensaje: 'Contactarse con administración para consultar disponibilidad actualizada.',
    });
});
// GET /api/bot/empleado/identificar/:waNumber
botRouter.get('/empleado/identificar/:waNumber', authBot, async (req, res) => {
    try {
        const empleado = await (0, db_1.getEmpleadoByWaId)(req.params.waNumber);
        if (!empleado)
            return res.status(404).json({ found: false });
        return res.json({ found: true, id: empleado.id, nombre: empleado.nombre, especialidad: empleado.especialidad });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/bot/empleado/:id/entrada
botRouter.post('/empleado/:id/entrada', authBot, async (req, res) => {
    try {
        const empleadoId = parseId(req.params.id);
        if (!empleadoId)
            return res.status(400).json({ error: 'id de empleado inválido' });
        const empleado = await (0, db_1.getEmpleadoById)(empleadoId);
        if (!empleado || empleado.activo === false)
            return res.status(404).json({ error: 'Empleado no encontrado' });
        const nota = normalizeOptionalText(req.body?.nota);
        const { marcacion, alreadyOpen } = await (0, db_1.registrarEntradaEmpleado)(empleadoId, { fuente: 'whatsapp', nota });
        if (!marcacion) {
            return res.status(409).json({ error: 'No se pudo abrir la jornada del empleado.' });
        }
        let tareasAutoAsignadas = 0;
        if (!alreadyOpen) {
            try {
                const assigned = await (0, operational_task_assignment_1.autoDistributePoolTasksOnEntry)(empleadoId);
                tareasAutoAsignadas = assigned.length;
            }
            catch (err) {
                console.error('[bot-api/entrada] auto-assign error:', err);
            }
        }
        return res.json({
            success: true,
            alreadyOpen,
            tareasAutoAsignadas,
            empleado: { id: empleado.id, nombre: empleado.nombre },
            jornada: {
                id: marcacion.id,
                entradaAt: formatDateTime(marcacion.entradaAt),
                salidaAt: formatDateTime(marcacion.salidaAt),
            },
            message: alreadyOpen ? 'La jornada ya estaba iniciada.' : 'Entrada registrada correctamente.',
        });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/bot/empleado/:id/salida
botRouter.post('/empleado/:id/salida', authBot, async (req, res) => {
    try {
        const empleadoId = parseId(req.params.id);
        if (!empleadoId)
            return res.status(400).json({ error: 'id de empleado inválido' });
        const empleado = await (0, db_1.getEmpleadoById)(empleadoId);
        if (!empleado || empleado.activo === false)
            return res.status(404).json({ error: 'Empleado no encontrado' });
        const nota = normalizeOptionalText(req.body?.nota);
        const marcacion = await (0, db_1.registrarSalidaEmpleado)(empleadoId, { nota });
        if (!marcacion) {
            return res.status(409).json({ error: 'No hay una jornada activa para registrar salida.' });
        }
        return res.json({
            success: true,
            empleado: { id: empleado.id, nombre: empleado.nombre },
            jornada: {
                id: marcacion.id,
                entradaAt: formatDateTime(marcacion.entradaAt),
                salidaAt: formatDateTime(marcacion.salidaAt),
                duracionSegundos: marcacion.duracionSegundos ?? 0,
                duracion: formatDuration(marcacion.duracionSegundos ?? 0),
            },
            message: 'Salida registrada correctamente.',
        });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/bot/empleado/:id/jornada
botRouter.get('/empleado/:id/jornada', authBot, async (req, res) => {
    try {
        const empleadoId = parseId(req.params.id);
        if (!empleadoId)
            return res.status(400).json({ error: 'id de empleado inválido' });
        const jornada = await (0, db_1.getJornadaActivaEmpleado)(empleadoId);
        if (!jornada)
            return res.json({ active: false, jornada: null });
        return res.json({
            active: true,
            jornada: {
                id: jornada.id,
                entradaAt: formatDateTime(jornada.entradaAt),
                salidaAt: formatDateTime(jornada.salidaAt),
            },
        });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/bot/empleado/:id/tareas
botRouter.get('/empleado/:id/tareas', authBot, async (req, res) => {
    try {
        const empleadoId = parseId(req.params.id);
        if (!empleadoId)
            return res.status(400).json({ error: 'id de empleado inválido' });
        const tareas = await (0, db_1.getTareasEmpleado)(empleadoId);
        return res.json({ tareas: tareas.map(t => buildTaskPayload(t, t.tiempoTrabajadoSegundos ?? 0)) });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/bot/empleado/:id/resumen
botRouter.get('/empleado/:id/resumen', authBot, async (req, res) => {
    try {
        const empleadoId = Number(req.params.id);
        const [empleado, attendance, reclamosRaw, tareasInternasRaw] = await Promise.all([
            (0, db_1.getEmpleadoActivoById)(empleadoId),
            (0, db_1.getEmpleadoAttendanceStatus)(empleadoId),
            (0, db_1.getTareasEmpleado)(empleadoId),
            (0, db_1.listOperationalTasksByEmployee)(empleadoId),
        ]);
        if (!empleado)
            return res.status(404).json({ error: 'Empleado no encontrado' });
        const reclamos = reclamosRaw.map(t => buildTaskPayload(t, t.tiempoTrabajadoSegundos ?? 0));
        const tareasInternas = tareasInternasRaw
            .filter(task => !['terminada', 'cancelada', 'rechazada'].includes(task.estado))
            .map(task => buildTaskPayload(task, task.tiempoTrabajadoSegundos ?? task.trabajoAcumuladoSegundos ?? 0));
        const tareas = [...reclamos, ...tareasInternas].sort(sortBotTasks);
        return res.json({
            empleado: {
                id: empleado.id,
                nombre: empleado.nombre,
                especialidad: empleado.especialidad,
            },
            attendance: buildAttendancePayload(attendance),
            counters: buildEmpleadoCounters(tareas),
            tareas,
            reclamos,
            tareasInternas,
        });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/bot/empleado/:id/asistencia
botRouter.post('/empleado/:id/asistencia', authBot, async (req, res) => {
    try {
        const empleadoId = Number(req.params.id);
        const { accion, nota } = req.body;
        if (!accion || !db_1.ATTENDANCE_ACTIONS.includes(accion)) {
            return res.status(400).json({ error: 'accion inválida' });
        }
        const empleado = await (0, db_1.getEmpleadoActivoById)(empleadoId);
        if (!empleado)
            return res.status(404).json({ error: 'Empleado no encontrado' });
        const result = await (0, db_1.registerEmpleadoAttendance)(empleadoId, accion, 'whatsapp', nota);
        if (!result.success) {
            return res.status(409).json({
                success: false,
                code: result.code,
                attendance: buildAttendancePayload(result.status),
            });
        }
        return res.json({
            success: true,
            accion,
            attendance: buildAttendancePayload(result.status),
        });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/bot/reporte/:id/respuesta
botRouter.post('/reporte/:id/respuesta', authBot, async (req, res) => {
    try {
        const reporteId = parseId(req.params.id);
        if (!reporteId)
            return res.status(400).json({ error: 'id de reclamo inválido' });
        const { respuesta, empleadoNombre } = req.body;
        const reporte = await (0, db_1.getReporteById)(reporteId);
        if (!reporte)
            return res.status(404).json({ error: 'Reclamo no encontrado' });
        if (!respuesta || !RESPUESTAS_EMPLEADO.includes(respuesta)) {
            return res.status(400).json({ error: 'respuesta inválida' });
        }
        if (respuesta === 'recibida') {
            const updated = await (0, db_1.iniciarTrabajoReporte)(reporteId);
            await (0, db_1.actualizarReporte)(reporteId, {
                asignacionEstado: 'aceptada',
                asignacionRespondidaAt: new Date(),
            });
            await (0, db_1.crearActualizacion)({
                reporteId,
                usuarioNombre: empleadoNombre ?? 'Empleado',
                tipo: 'timer',
                descripcion: 'Empleado aceptó la tarea vía WhatsApp',
                estadoAnterior: reporte.estado,
                estadoNuevo: 'en_progreso',
            });
            return res.json({
                success: true,
                respuesta,
                task: buildTaskPayload(updated ?? { ...reporte, estado: 'en_progreso' }),
            });
        }
        await (0, db_1.actualizarReporte)(reporteId, {
            estado: 'pendiente',
            asignacionEstado: 'rechazada',
            asignadoA: null,
            asignadoId: null,
            asignacionRespondidaAt: new Date(),
            trabajoIniciadoAt: null,
        });
        await (0, db_1.crearActualizacion)({
            reporteId,
            usuarioNombre: empleadoNombre ?? 'Empleado',
            tipo: 'asignacion',
            descripcion: buildRechazoDescription(respuesta),
            estadoAnterior: reporte.estado,
            estadoNuevo: 'pendiente',
        });
        (0, notification_1.notifyOwner)({
            title: `Tarea rechazada — Reclamo #${reporteId}`,
            content: `${empleadoNombre ?? 'Empleado'} respondió "${respuesta}". Quedó disponible para reasignar.`,
        }).catch(console.error);
        const updated = await (0, db_1.getReporteById)(reporteId);
        return res.json({
            success: true,
            respuesta,
            task: updated ? buildTaskPayload(updated) : null,
        });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/bot/reporte/:id/iniciar
botRouter.post('/reporte/:id/iniciar', authBot, async (req, res) => {
    try {
        const reporteId = parseId(req.params.id);
        if (!reporteId)
            return res.status(400).json({ error: 'id de reclamo inválido' });
        const { empleadoNombre } = req.body;
        const reporte = await (0, db_1.getReporteById)(reporteId);
        if (!reporte)
            return res.status(404).json({ error: 'Reclamo no encontrado' });
        const updated = await (0, db_1.iniciarTrabajoReporte)(reporteId);
        await (0, db_1.actualizarReporte)(reporteId, {
            asignacionEstado: reporte.asignadoId ? 'aceptada' : reporte.asignacionEstado,
            asignacionRespondidaAt: reporte.asignadoId && !reporte.asignacionRespondidaAt ? new Date() : reporte.asignacionRespondidaAt,
        });
        await (0, db_1.crearActualizacion)({
            reporteId,
            usuarioNombre: empleadoNombre ?? 'Empleado',
            tipo: 'timer',
            descripcion: 'Tarea iniciada vía WhatsApp',
            estadoAnterior: reporte.estado,
            estadoNuevo: 'en_progreso',
        });
        return res.json({
            success: true,
            estado: updated?.estado ?? 'en_progreso',
            tiempoTrabajadoSegundos: updated ? (0, db_1.getReporteTiempoTrabajadoSegundos)(updated) : 0,
            tiempoTrabajado: formatDuration(updated ? (0, db_1.getReporteTiempoTrabajadoSegundos)(updated) : 0),
        });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/bot/reporte/:id/pausar
botRouter.post('/reporte/:id/pausar', authBot, async (req, res) => {
    try {
        const reporteId = parseId(req.params.id);
        if (!reporteId)
            return res.status(400).json({ error: 'id de reclamo inválido' });
        const { nota, empleadoNombre } = req.body;
        const reporte = await (0, db_1.getReporteById)(reporteId);
        if (!reporte)
            return res.status(404).json({ error: 'Reclamo no encontrado' });
        const updated = await (0, db_1.pausarTrabajoReporte)(reporteId);
        await (0, db_1.crearActualizacion)({
            reporteId,
            usuarioNombre: empleadoNombre ?? 'Empleado',
            tipo: 'timer',
            descripcion: nota ?? 'Tarea pausada vía WhatsApp',
            estadoAnterior: reporte.estado,
            estadoNuevo: 'pausado',
        });
        return res.json({
            success: true,
            estado: updated?.estado ?? 'pausado',
            tiempoTrabajadoSegundos: updated?.trabajoAcumuladoSegundos ?? 0,
            tiempoTrabajado: formatDuration(updated?.trabajoAcumuladoSegundos ?? 0),
        });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/bot/reporte/:id/progreso
botRouter.post('/reporte/:id/progreso', authBot, async (req, res) => {
    try {
        const reporteId = parseId(req.params.id);
        if (!reporteId)
            return res.status(400).json({ error: 'id de reclamo inválido' });
        const { nota, empleadoNombre } = req.body;
        const empleadoId = parseOptionalBodyId(req.body?.empleadoId);
        if (!nota)
            return res.status(400).json({ error: 'nota es requerida' });
        if (req.body?.empleadoId !== undefined && empleadoId === null) {
            return res.status(400).json({ error: 'empleadoId inválido' });
        }
        const reporte = await (0, db_1.getReporteById)(reporteId);
        if (!reporte)
            return res.status(404).json({ error: 'Reclamo no encontrado' });
        // Only start timer if employee already accepted — don't auto-start on progress note
        const alreadyAccepted = reporte.asignacionEstado === 'aceptada' || !reporte.asignadoId;
        const updated = (reporte.trabajoIniciadoAt || !alreadyAccepted) ? reporte : await (0, db_1.iniciarTrabajoReporte)(reporteId);
        if (alreadyAccepted && !reporte.asignacionRespondidaAt) {
            await (0, db_1.actualizarReporte)(reporteId, {
                asignacionEstado: 'aceptada',
                asignacionRespondidaAt: new Date(),
            });
        }
        await (0, db_1.crearActualizacion)({
            reporteId,
            usuarioNombre: empleadoNombre ?? 'Empleado',
            tipo: 'progreso',
            descripcion: nota,
            estadoAnterior: reporte.estado,
            estadoNuevo: 'en_progreso',
        });
        return res.json({
            success: true,
            tiempoTrabajadoSegundos: updated ? (0, db_1.getReporteTiempoTrabajadoSegundos)(updated) : 0,
            tiempoTrabajado: formatDuration(updated ? (0, db_1.getReporteTiempoTrabajadoSegundos)(updated) : 0),
        });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/bot/reporte/:id/completar
botRouter.post('/reporte/:id/completar', authBot, async (req, res) => {
    try {
        const reporteId = parseId(req.params.id);
        if (!reporteId)
            return res.status(400).json({ error: 'id de reclamo inválido' });
        const { nota, empleadoNombre } = req.body;
        const empleadoId = parseOptionalBodyId(req.body?.empleadoId);
        if (req.body?.empleadoId !== undefined && empleadoId === null) {
            return res.status(400).json({ error: 'empleadoId inválido' });
        }
        const reporte = await (0, db_1.getReporteById)(reporteId);
        if (!reporte)
            return res.status(404).json({ error: 'Reclamo no encontrado' });
        const updated = await (0, db_1.completarTrabajoReporte)(reporteId);
        const tiempoTrabajadoSegundos = updated?.trabajoAcumuladoSegundos ?? (0, db_1.getReporteTiempoTrabajadoSegundos)(reporte);
        await (0, db_1.crearActualizacion)({
            reporteId,
            usuarioNombre: empleadoNombre ?? 'Empleado',
            tipo: 'completado',
            descripcion: nota ?? `Tarea completada vía WhatsApp. Tiempo total: ${formatDuration(tiempoTrabajadoSegundos)}`,
            estadoAnterior: reporte.estado,
            estadoNuevo: 'completado',
        });
        (0, notification_1.notifyOwner)({
            title: `Tarea completada — Reclamo #${reporteId}`,
            content: `${empleadoNombre ?? 'Empleado'} marcó el reclamo como completado. Tiempo total: ${formatDuration(tiempoTrabajadoSegundos)}.`,
        }).catch(console.error);
        let nextTask = null;
        if (empleadoId) {
            const tareasRestantes = await (0, db_1.getTareasEmpleado)(empleadoId);
            if (tareasRestantes.length === 0) {
                const empleado = await (0, db_1.getEmpleadoActivoById)(Number(empleadoId));
                const siguiente = await (0, db_1.getNextAssignableReporteForEmpleado)(Number(empleadoId));
                if (empleado && siguiente) {
                    await (0, db_1.actualizarReporte)(siguiente.id, {
                        asignadoA: empleado.nombre,
                        asignadoId: empleado.id,
                        estado: 'pendiente',
                        asignacionEstado: 'pendiente_confirmacion',
                        asignacionRespondidaAt: null,
                    });
                    await (0, db_1.crearActualizacion)({
                        reporteId: siguiente.id,
                        usuarioNombre: 'DocksBot',
                        tipo: 'asignacion',
                        descripcion: `Asignado automáticamente a: ${empleado.nombre}. Pendiente de confirmación del empleado.`,
                        estadoAnterior: 'pendiente',
                        estadoNuevo: 'pendiente',
                    });
                    nextTask = {
                        id: siguiente.id,
                        titulo: siguiente.titulo,
                        local: siguiente.local,
                        planta: siguiente.planta,
                        prioridad: siguiente.prioridad,
                        estado: 'pendiente',
                        descripcion: siguiente.descripcion,
                        tiempoTrabajadoSegundos: 0,
                        tiempoTrabajado: formatDuration(0),
                    };
                }
            }
        }
        return res.json({
            success: true,
            nextTask,
            tiempoTrabajadoSegundos,
            tiempoTrabajado: formatDuration(tiempoTrabajadoSegundos),
        });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/bot/queue — bot polls for pending outbound messages
// También registra heartbeat automáticamente en cada polling
botRouter.get('/queue', authBot, async (req, res) => {
    try {
        const items = await (0, db_1.getPendingBotMessages)();
        // Heartbeat implícito: el bot está vivo si está consultando la cola
        (0, db_1.registerBotHeartbeat)({
            botVersion: normalizeOptionalText(req.headers['x-bot-version']),
            pendingCount: items.length,
        }).catch(() => { });
        return res.json({ items });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/bot/queue/:id/sent
botRouter.post('/queue/:id/sent', authBot, async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id)
            return res.status(400).json({ error: 'id de mensaje inválido' });
        await (0, db_1.markBotMessageSent)(id);
        return res.json({ success: true });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/bot/queue/:id/failed — ahora acepta errorMsg opcional
botRouter.post('/queue/:id/failed', authBot, async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id)
            return res.status(400).json({ error: 'id de mensaje inválido' });
        const errorMsg = normalizeOptionalText(req.body?.errorMsg);
        await (0, db_1.markBotMessageFailed)(id, errorMsg);
        return res.json({ success: true });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/bot/queue/retry — reintentar mensajes fallidos
botRouter.post('/queue/retry', authBot, async (_req, res) => {
    try {
        await (0, db_1.retryFailedBotMessages)();
        return res.json({ success: true, message: 'Mensajes fallidos puestos a reintentar' });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/bot/queue/dead-letter — mensajes que fallaron definitivamente
botRouter.get('/queue/dead-letter', authBot, async (_req, res) => {
    try {
        const items = await (0, db_1.getDeadLetterBotMessages)();
        return res.json({ items, total: items.length });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/bot/heartbeat — el bot local reporta que está vivo
botRouter.post('/heartbeat', authBot, async (req, res) => {
    try {
        await (0, db_1.registerBotHeartbeat)({
            botVersion: normalizeOptionalText(req.body?.botVersion),
            pendingCount: Number(req.body?.pendingCount) || 0,
        });
        return res.json({ success: true, serverTime: new Date().toISOString() });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/bot/status — estado de conexión del bot y métricas
botRouter.get('/status', authBot, async (_req, res) => {
    try {
        const [connectionStatus, pendingItems, deadLetterItems] = await Promise.all([
            (0, db_1.getBotConnectionStatus)(),
            (0, db_1.getPendingBotMessages)(),
            (0, db_1.getDeadLetterBotMessages)(),
        ]);
        return res.json({
            bot: connectionStatus,
            queue: {
                pending: pendingItems.length,
                deadLetter: deadLetterItems.length,
            },
        });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/bot/parse-intent — el bot local envía un mensaje y obtiene el intent detectado
botRouter.post('/parse-intent', authBot, async (req, res) => {
    try {
        const message = normalizeText(req.body?.message);
        if (!message)
            return res.status(400).json({ error: 'message es requerido' });
        const intent = (0, intent_parser_1.parseIntent)(message);
        return res.json({ intent });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/bot/sla/vencidos — reclamos que superaron su SLA
botRouter.get('/sla/vencidos', authBot, async (_req, res) => {
    try {
        const vencidos = await (0, db_1.getReportesVencidos)();
        return res.json({
            total: vencidos.length,
            urgentes: vencidos.filter(r => r.prioridad === 'urgente').length,
            reportes: vencidos.map(r => ({
                id: r.id,
                titulo: r.titulo,
                local: r.local,
                prioridad: r.prioridad,
                estado: r.estado,
                asignadoA: r.asignadoA ?? null,
                sla: r.sla,
            })),
        });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/bot/reporte/:id/sla — SLA de un reclamo específico
botRouter.get('/reporte/:id/sla', authBot, async (req, res) => {
    try {
        const reporteId = parseId(req.params.id);
        if (!reporteId)
            return res.status(400).json({ error: 'id de reclamo inválido' });
        const reporte = await (0, db_1.getReporteById)(reporteId);
        if (!reporte)
            return res.status(404).json({ error: 'Reclamo no encontrado' });
        const sla = (0, db_1.calcularSLA)(reporte.prioridad, reporte.createdAt);
        return res.json({ reporteId, prioridad: reporte.prioridad, sla });
    }
    catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bot/mensaje-entrante
// Endpoint principal del sistema de menús guiados.
// El bot local envía cada mensaje WhatsApp recibido aquí y obtiene la respuesta.
//
// Body: { waNumber: "5491171153151", message: "1" }
// Response: { reply: "<texto del mensaje a enviar>" }
// ─────────────────────────────────────────────────────────────────────────────
botRouter.post('/mensaje-entrante', authBot, async (req, res) => {
    try {
        const waNumber = normalizeText(req.body?.waNumber);
        const message = normalizeText(req.body?.message);
        if (!waNumber)
            return res.status(400).json({ error: 'waNumber es requerido' });
        if (!message)
            return res.status(400).json({ error: 'message es requerido' });
        if (message.length > 1000)
            return res.status(400).json({ error: 'message demasiado largo' });
        console.log(`[bot/mensaje-entrante] request ${JSON.stringify({
            waNumber,
            message,
        })}`);
        // Registrar heartbeat implícito
        (0, db_1.registerBotHeartbeat)({ pendingCount: 0 }).catch(() => { });
        const reply = await (0, engine_1.handleIncomingMessage)(waNumber, message);
        console.log(`[bot/mensaje-entrante] reply ${JSON.stringify({
            waNumber,
            message,
            replyPreview: reply.slice(0, 160),
        })}`);
        return res.json({ reply });
    }
    catch (e) {
        console.error('[bot/mensaje-entrante]', e);
        return res.status(500).json({ error: 'Error interno al procesar el mensaje.' });
    }
});
exports.default = botRouter;
