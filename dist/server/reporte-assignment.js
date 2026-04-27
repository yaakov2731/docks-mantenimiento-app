"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignReporteToEmployee = assignReporteToEmployee;
const db_1 = require("./db");
async function assignReporteToEmployee(params) {
    const reporte = await (0, db_1.getReporteById)(params.reporteId);
    if (!reporte)
        throw new Error('Reporte no encontrado');
    const empleado = typeof params.empleadoId === 'number'
        ? await (0, db_1.getEmpleadoById)(params.empleadoId)
        : null;
    if (typeof params.empleadoId === 'number' && !empleado) {
        throw new Error('Empleado no encontrado');
    }
    const empleadoNombre = empleado?.nombre ?? params.empleadoNombre;
    await (0, db_1.actualizarReporte)(params.reporteId, {
        asignadoA: empleadoNombre,
        asignadoId: params.empleadoId,
        estado: 'pendiente',
        trabajoIniciadoAt: null,
        asignacionEstado: params.empleadoId ? 'pendiente_confirmacion' : 'sin_asignar',
        asignacionRespondidaAt: null,
    });
    await (0, db_1.crearActualizacion)({
        reporteId: params.reporteId,
        usuarioId: params.actor.id ?? null,
        usuarioNombre: params.actor.name,
        tipo: 'asignacion',
        descripcion: `Asignado a: ${empleadoNombre}. Pendiente de confirmación del empleado.`,
    });
    if (empleado?.waId) {
        await (0, db_1.enqueueBotMessage)(empleado.waId, buildReporteAssignmentMessage({
            reporteId: reporte.id,
            titulo: reporte.titulo,
            local: reporte.local,
            planta: reporte.planta,
            prioridad: reporte.prioridad,
            descripcion: reporte.descripcion,
        }));
    }
    return {
        reporte,
        empleado,
        empleadoNombre,
    };
}
function buildReporteAssignmentMessage(input) {
    return [
        '*Nueva tarea asignada — Docks del Puerto*',
        '',
        `*Reclamo #${input.reporteId}:* ${input.titulo}`,
        `Local: ${input.local} (${input.planta})`,
        `Prioridad: ${input.prioridad}`,
        '',
        input.descripcion,
        '',
        'Respondé con una opción:',
        '1. Tarea recibida',
        '2. No puedo tomarla',
    ].join('\n');
}
