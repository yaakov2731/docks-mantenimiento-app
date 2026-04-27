"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignOperationalTaskToEmployee = assignOperationalTaskToEmployee;
exports.notifyOperationalTaskAssignment = notifyOperationalTaskAssignment;
exports.autoDistributePoolTasksOnEntry = autoDistributePoolTasksOnEntry;
const db_1 = require("./db");
async function assignOperationalTaskToEmployee(params) {
    const task = await (0, db_1.getOperationalTaskById)(params.taskId);
    if (!task)
        throw new Error('Operational task not found');
    if (!['pendiente_asignacion', 'pendiente_confirmacion'].includes(task.estado)) {
        throw new Error('Operational task cannot be reassigned from its current state');
    }
    const empleado = await (0, db_1.getEmpleadoById)(params.empleadoId);
    if (!empleado)
        throw new Error('Empleado no encontrado');
    const now = new Date();
    const eventType = task.empleadoId && task.empleadoId !== empleado.id ? 'reasignacion' : 'asignacion';
    const descriptionPrefix = eventType === 'reasignacion' ? 'Reasignada a' : 'Asignada a';
    await (0, db_1.persistOperationalTaskChange)(params.taskId, {
        empleadoId: empleado.id,
        empleadoNombre: empleado.nombre,
        empleadoWaId: empleado.waId ?? null,
        estado: 'pendiente_confirmacion',
        asignadoAt: now,
        aceptadoAt: null,
        trabajoIniciadoAt: null,
        pausadoAt: null,
    }, [{
            tareaId: params.taskId,
            tipo: eventType,
            actorTipo: 'admin',
            actorId: params.actor.id ?? null,
            actorNombre: params.actor.name,
            descripcion: `${descriptionPrefix}: ${empleado.nombre}. Pendiente de confirmacion del empleado.`,
            createdAt: now,
        }]);
    await notifyOperationalTaskAssignment(params.taskId, {
        nombre: empleado.nombre,
        waId: empleado.waId,
    });
    const updatedTask = await (0, db_1.getOperationalTaskById)(params.taskId);
    if (!updatedTask)
        throw new Error('Operational task not found after update');
    return {
        task: updatedTask,
        empleado,
    };
}
async function notifyOperationalTaskAssignment(taskId, employee) {
    if (!employee.waId)
        return;
    const task = await (0, db_1.getOperationalTaskById)(taskId);
    if (!task)
        return;
    const lines = [
        '*Nueva tarea operativa — Docks del Puerto*',
        '',
        `Asignado a: ${employee.nombre}`,
        `Tarea #${task.id}`,
        task.titulo ? `Trabajo: ${task.titulo}` : '',
        task.tipoTrabajo ? `Tipo: ${task.tipoTrabajo}` : '',
        task.ubicacion ? `Ubicación: ${task.ubicacion}` : '',
        task.prioridad ? `Prioridad: ${String(task.prioridad).toUpperCase()}` : '',
        '',
        task.descripcion ?? '',
        '',
        'Respondé con una opción:',
        '1. Aceptar tarea',
        '2. No puedo realizarla',
        '3. Ver cola del día',
        '',
        'Cuando la aceptes, el reloj de trabajo queda en marcha y después vas a poder pausar o finalizar desde el bot.',
    ];
    await (0, db_1.enqueueBotMessage)(employee.waId, lines.filter(Boolean).join('\n'));
}
/**
 * Cuando un empleado registra entrada, toma su porción del pool de tareas del día.
 *
 * Lógica de distribución:
 *   - Pool = tareas en estado 'pendiente_asignacion' sin empleado asignado
 *   - Se dividen entre el total de empleados activos (ceil)
 *   - El empleado recibe las primeras N tareas disponibles del pool
 *   - Si el pool ya está vacío (todos llegaron), no asigna nada
 *
 * Retorna las tareas asignadas para incluirlas en el mensaje de confirmación.
 */
async function autoDistributePoolTasksOnEntry(empleadoId) {
    const [pool, activeEmployees] = await Promise.all([
        (0, db_1.getPoolTasks)(),
        (0, db_1.getEmpleados)(),
    ]);
    if (pool.length === 0)
        return [];
    const totalActive = Math.max(1, activeEmployees.length);
    const tasksPerEmployee = Math.ceil(pool.length / totalActive);
    const slice = pool.slice(0, tasksPerEmployee);
    const empleado = await (0, db_1.getEmpleadoById)(empleadoId);
    if (!empleado)
        return [];
    const now = new Date();
    const assigned = [];
    for (const task of slice) {
        try {
            await (0, db_1.persistOperationalTaskChange)(task.id, {
                empleadoId: empleado.id,
                empleadoNombre: empleado.nombre,
                empleadoWaId: empleado.waId ?? null,
                estado: 'pendiente_confirmacion',
                asignadoAt: now,
                aceptadoAt: null,
                trabajoIniciadoAt: null,
                pausadoAt: null,
            }, [{
                    tareaId: task.id,
                    tipo: 'asignacion',
                    actorTipo: 'system',
                    actorId: null,
                    actorNombre: 'Auto-asignación (entrada)',
                    descripcion: `Asignada automáticamente a ${empleado.nombre} al registrar entrada.`,
                    createdAt: now,
                }]);
            assigned.push({ id: task.id, titulo: task.titulo, ubicacion: task.ubicacion });
        }
        catch (err) {
            console.error(`[auto-assign] Error asignando tarea #${task.id} a empleado #${empleadoId}:`, err);
        }
    }
    return assigned;
}
