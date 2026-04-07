export type OperationalTaskState =
  | 'pendiente_asignacion'
  | 'pendiente_confirmacion'
  | 'en_progreso'
  | 'pausada'
  | 'terminada'
  | 'cancelada'
  | 'rechazada'

export type OperationalTaskRecord = {
  id: number
  empleadoId: number | null
  empleadoNombre?: string | null
  estado: OperationalTaskState
  trabajoAcumuladoSegundos: number
  aceptadoAt?: Date | null
  trabajoIniciadoAt?: Date | null
  pausadoAt?: Date | null
  terminadoAt?: Date | null
  titulo?: string
}

export type OperationalTaskEvent = {
  tareaId: number
  tipo: 'asignacion' | 'aceptacion' | 'rechazo' | 'inicio' | 'pausa' | 'reanudar' | 'terminacion' | 'cancelacion' | 'reasignacion' | 'admin_update'
  actorTipo?: 'system' | 'employee' | 'admin'
  actorId?: number | null
  actorNombre?: string | null
  descripcion: string
  metadata?: Record<string, unknown> | null
  createdAt?: Date
}

export type OperationalTaskRepository = {
  getTaskById(taskId: number): Promise<OperationalTaskRecord | null>
  getActiveTaskForEmployee(empleadoId: number): Promise<OperationalTaskRecord | null>
  getNextTaskForEmployee(empleadoId: number, currentTaskId?: number): Promise<OperationalTaskRecord | null>
  persistTaskChange(taskId: number, updates: Partial<OperationalTaskRecord>, events: OperationalTaskEvent[]): Promise<void>
}

export function createOperationalTasksService(repo: OperationalTaskRepository) {
  return {
    async acceptTask(input: { taskId: number; empleadoId: number }) {
      const activeTask = await repo.getActiveTaskForEmployee(input.empleadoId)
      if (activeTask && activeTask.id !== input.taskId) {
        throw new Error('Employee already has an active operational task')
      }

      const task = await getOwnedTask(repo, input.taskId, input.empleadoId)
      if (task.estado !== 'pendiente_confirmacion') {
        throw new Error('Operational task is not awaiting confirmation')
      }

      const now = new Date()
      await repo.persistTaskChange(input.taskId, {
        estado: 'en_progreso',
        aceptadoAt: task.aceptadoAt ?? now,
        trabajoIniciadoAt: now,
        pausadoAt: null,
      }, [
        {
          tareaId: input.taskId,
          tipo: 'aceptacion',
          actorTipo: 'employee',
          actorId: input.empleadoId,
          actorNombre: task.empleadoNombre ?? null,
          descripcion: 'Tarea aceptada por el empleado',
          createdAt: now,
        },
        {
          tareaId: input.taskId,
          tipo: 'inicio',
          actorTipo: 'employee',
          actorId: input.empleadoId,
          actorNombre: task.empleadoNombre ?? null,
          descripcion: 'Trabajo iniciado',
          createdAt: now,
        },
      ])
      return ensureTask(repo, input.taskId)
    },

    async pauseTask(input: { taskId: number; empleadoId: number }) {
      const task = await getOwnedTask(repo, input.taskId, input.empleadoId)
      if (task.estado !== 'en_progreso') {
        throw new Error('Operational task is not in progress')
      }

      const now = new Date()
      await repo.persistTaskChange(input.taskId, {
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
      }])
      return ensureTask(repo, input.taskId)
    },

    async finishTask(input: { taskId: number; empleadoId: number; note?: string }) {
      const task = await getOwnedTask(repo, input.taskId, input.empleadoId)
      if (task.estado !== 'en_progreso' && task.estado !== 'pausada') {
        throw new Error('Operational task cannot be finished from its current state')
      }

      const now = new Date()
      const workedSeconds = task.estado === 'en_progreso'
        ? getWorkedSeconds(task, now)
        : Number(task.trabajoAcumuladoSegundos ?? 0)

      await repo.persistTaskChange(input.taskId, {
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
      }])

      const finishedTask = await ensureTask(repo, input.taskId)
      return {
        task: finishedTask,
        nextTask: await repo.getNextTaskForEmployee(input.empleadoId, input.taskId),
      }
    },

    async rejectTask(input: { taskId: number; empleadoId: number; note?: string }) {
      const task = await getOwnedTask(repo, input.taskId, input.empleadoId)
      if (task.estado !== 'pendiente_confirmacion') {
        throw new Error('Operational task is not awaiting confirmation')
      }

      const now = new Date()
      await repo.persistTaskChange(input.taskId, {
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
      }])
      return ensureTask(repo, input.taskId)
    },
  }
}

async function getOwnedTask(repo: OperationalTaskRepository, taskId: number, empleadoId: number) {
  const task = await repo.getTaskById(taskId)
  if (!task) throw new Error('Operational task not found')
  if (task.empleadoId !== empleadoId) {
    throw new Error('Operational task does not belong to employee')
  }
  return task
}

async function ensureTask(repo: OperationalTaskRepository, taskId: number) {
  const task = await repo.getTaskById(taskId)
  if (!task) throw new Error('Operational task not found after update')
  return task
}

function getWorkedSeconds(task: Pick<OperationalTaskRecord, 'trabajoAcumuladoSegundos' | 'trabajoIniciadoAt'>, now: Date) {
  const accumulated = Number(task.trabajoAcumuladoSegundos ?? 0)
  if (!task.trabajoIniciadoAt) return accumulated
  const startedAt = task.trabajoIniciadoAt instanceof Date
    ? task.trabajoIniciadoAt.getTime()
    : new Date(task.trabajoIniciadoAt).getTime()
  const additional = Math.max(0, Math.floor((now.getTime() - startedAt) / 1000))
  return accumulated + additional
}
