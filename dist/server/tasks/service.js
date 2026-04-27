"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOperationalTasksService = createOperationalTasksService;
function createOperationalTasksService(repo) {
    return {
        async acceptTask(input) {
            return repo.acceptOperationalTask(input.taskId, input.empleadoId);
        },
        async resumeTask(input) {
            const task = await getOwnedTask(repo, input.taskId, input.empleadoId);
            if (task.estado !== 'pausada') {
                throw new Error('Operational task is not paused');
            }
            const now = new Date();
            await persistTaskChange(repo, input.taskId, {
                estado: 'en_progreso',
                trabajoIniciadoAt: now,
                pausadoAt: null,
            }, [{
                    tareaId: input.taskId,
                    tipo: 'reanudar',
                    actorTipo: 'employee',
                    actorId: input.empleadoId,
                    actorNombre: task.empleadoNombre ?? null,
                    descripcion: 'Trabajo reanudado',
                    createdAt: now,
                }]);
            return ensureTask(repo, input.taskId);
        },
        async pauseTask(input) {
            const task = await getOwnedTask(repo, input.taskId, input.empleadoId);
            if (task.estado !== 'en_progreso') {
                throw new Error('Operational task is not in progress');
            }
            const now = new Date();
            await persistTaskChange(repo, input.taskId, {
                estado: 'pausada',
                trabajoAcumuladoSegundos: getWorkedSeconds(task, now),
                trabajoIniciadoAt: null,
                pausadoAt: now,
            }, [{
                    tareaId: input.taskId,
                    tipo: 'pausa',
                    actorTipo: 'employee',
                    actorId: input.empleadoId,
                    actorNombre: task.empleadoNombre ?? null,
                    descripcion: 'Trabajo pausado',
                    createdAt: now,
                }]);
            return ensureTask(repo, input.taskId);
        },
        async finishTask(input) {
            const task = await getOwnedTask(repo, input.taskId, input.empleadoId);
            if (task.estado !== 'en_progreso' && task.estado !== 'pausada') {
                throw new Error('Operational task cannot be finished from its current state');
            }
            const now = new Date();
            const workedSeconds = task.estado === 'en_progreso'
                ? getWorkedSeconds(task, now)
                : Number(task.trabajoAcumuladoSegundos ?? 0);
            await persistTaskChange(repo, input.taskId, {
                estado: 'terminada',
                trabajoAcumuladoSegundos: workedSeconds,
                trabajoIniciadoAt: null,
                pausadoAt: null,
                terminadoAt: now,
            }, [{
                    tareaId: input.taskId,
                    tipo: 'terminacion',
                    actorTipo: 'employee',
                    actorId: input.empleadoId,
                    actorNombre: task.empleadoNombre ?? null,
                    descripcion: input.note?.trim()
                        ? `Tarea terminada: ${input.note.trim()}`
                        : 'Tarea terminada por el empleado',
                    metadata: input.note?.trim() ? { note: input.note.trim() } : null,
                    createdAt: now,
                }]);
            const finishedTask = await ensureTask(repo, input.taskId);
            return {
                task: finishedTask,
                nextTask: await getNextTaskForEmployee(repo, input.empleadoId, input.taskId),
            };
        },
        async cancelTask(input) {
            const task = await getOwnedTask(repo, input.taskId, input.empleadoId);
            if (task.estado !== 'en_progreso' && task.estado !== 'pausada' && task.estado !== 'pendiente_confirmacion') {
                throw new Error('Operational task cannot be cancelled from its current state');
            }
            const now = new Date();
            const workedSeconds = task.estado === 'en_progreso'
                ? getWorkedSeconds(task, now)
                : Number(task.trabajoAcumuladoSegundos ?? 0);
            await persistTaskChange(repo, input.taskId, {
                estado: 'pendiente_asignacion',
                empleadoId: null,
                empleadoNombre: null,
                trabajoAcumuladoSegundos: workedSeconds,
                trabajoIniciadoAt: null,
                pausadoAt: null,
            }, [{
                    tareaId: input.taskId,
                    tipo: 'cancelacion',
                    actorTipo: 'employee',
                    actorId: input.empleadoId,
                    actorNombre: task.empleadoNombre ?? null,
                    descripcion: input.note?.trim()
                        ? `Tarea cancelada sin terminar: ${input.note.trim()}`
                        : 'Tarea cancelada sin terminar por el empleado',
                    metadata: input.note?.trim() ? { note: input.note.trim() } : null,
                    createdAt: now,
                }]);
            return ensureTask(repo, input.taskId);
        },
        async rejectTask(input) {
            const task = await getOwnedTask(repo, input.taskId, input.empleadoId);
            if (task.estado !== 'pendiente_confirmacion') {
                throw new Error('Operational task is not awaiting confirmation');
            }
            const now = new Date();
            await persistTaskChange(repo, input.taskId, {
                estado: 'rechazada',
                trabajoIniciadoAt: null,
                pausadoAt: null,
            }, [{
                    tareaId: input.taskId,
                    tipo: 'rechazo',
                    actorTipo: 'employee',
                    actorId: input.empleadoId,
                    actorNombre: task.empleadoNombre ?? null,
                    descripcion: input.note?.trim()
                        ? `Empleado no puede tomar la tarea: ${input.note.trim()}`
                        : 'Empleado no puede tomar la tarea',
                    metadata: input.note?.trim() ? { note: input.note.trim() } : null,
                    createdAt: now,
                }]);
            return ensureTask(repo, input.taskId);
        },
    };
}
async function getOwnedTask(repo, taskId, empleadoId) {
    const task = await getTaskById(repo, taskId);
    if (!task)
        throw new Error('Operational task not found');
    if (task.empleadoId !== empleadoId) {
        throw new Error('Operational task does not belong to employee');
    }
    return task;
}
async function ensureTask(repo, taskId) {
    const task = await getTaskById(repo, taskId);
    if (!task)
        throw new Error('Operational task not found after update');
    return task;
}
async function getTaskById(repo, taskId) {
    const reader = repo.getTaskById ?? repo.getOperationalTaskById;
    if (typeof reader !== 'function') {
        throw new Error('Operational task repository is missing getTaskById');
    }
    return reader.call(repo, taskId);
}
async function getNextTaskForEmployee(repo, empleadoId, currentTaskId) {
    const reader = repo.getNextTaskForEmployee ?? repo.getNextOperationalTaskForEmployee;
    if (typeof reader !== 'function') {
        throw new Error('Operational task repository is missing getNextTaskForEmployee');
    }
    return reader.call(repo, empleadoId, currentTaskId);
}
async function persistTaskChange(repo, taskId, updates, events) {
    const writer = repo.persistTaskChange ?? repo.persistOperationalTaskChange;
    if (typeof writer !== 'function') {
        throw new Error('Operational task repository is missing persistTaskChange');
    }
    return writer.call(repo, taskId, updates, events);
}
function getWorkedSeconds(task, now) {
    const accumulated = Number(task.trabajoAcumuladoSegundos ?? 0);
    if (!task.trabajoIniciadoAt)
        return accumulated;
    const startedAt = task.trabajoIniciadoAt instanceof Date
        ? task.trabajoIniciadoAt.getTime()
        : new Date(task.trabajoIniciadoAt).getTime();
    const additional = Math.max(0, Math.floor((now.getTime() - startedAt) / 1000));
    return accumulated + additional;
}
