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
  getNextTaskForEmployee(empleadoId: number, currentTaskId?: number): Promise<OperationalTaskRecord | null>
  acceptOperationalTask(taskId: number, empleadoId: number): Promise<OperationalTaskRecord>
  persistTaskChange(taskId: number, updates: Partial<OperationalTaskRecord>, events: OperationalTaskEvent[]): Promise<void>
}

export function createOperationalTasksService(repo: OperationalTaskRepository) {
  return {
    async acceptTask(input: { taskId: number; empleadoId: number }) {
      return repo.acceptOperationalTask(input.taskId, input.empleadoId)
    },

    async resumeTask(input: { taskId: number; empleadoId: number }) {
      const task = await getOwnedTask(repo, input.taskId, input.empleadoId)
      if (task.estado !== 'pausada') {
        throw new Error('Operational task is not paused')
      }

      const now = new Date()
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
      }])
      return ensureTask(repo, input.taskId)
    },

    async pauseTask(input: { taskId: number; empleadoId: number }) {
      const task = await getOwnedTask(repo, input.taskId, input.empleadoId)
      if (task.estado !== 'en_progreso') {
        throw new Error('Operational task is not in progress')
      }

      const now = new Date()
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
      }])

      const finishedTask = await ensureTask(repo, input.taskId)
      return {
        task: finishedTask,
        nextTask: await getNextTaskForEmployee(repo, input.empleadoId, input.taskId),
      }
    },

    async cancelTask(input: { taskId: number; empleadoId: number; note?: string }) {
      const task = await getOwnedTask(repo, input.taskId, input.empleadoId)
      if (task.estado !== 'en_progreso' && task.estado !== 'pausada' && task.estado !== 'pendiente_confirmacion') {
        throw new Error('Operational task cannot be cancelled from its current state')
      }

      const now = new Date()
      const workedSeconds = task.estado === 'en_progreso'
        ? getWorkedSeconds(task, now)
        : Number(task.trabajoAcumuladoSegundos ?? 0)

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
      }])
      return ensureTask(repo, input.taskId)
    },

    async rejectTask(input: { taskId: number; empleadoId: number; note?: string }) {
      const task = await getOwnedTask(repo, input.taskId, input.empleadoId)
      if (task.estado !== 'pendiente_confirmacion') {
        throw new Error('Operational task is not awaiting confirmation')
      }

      const now = new Date()
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
      }])
      return ensureTask(repo, input.taskId)
    },
  }
}

async function getOwnedTask(repo: OperationalTaskRepository, taskId: number, empleadoId: number) {
  const task = await getTaskById(repo, taskId)
  if (!task) throw new Error('Operational task not found')
  if (task.empleadoId !== empleadoId) {
    throw new Error('Operational task does not belong to employee')
  }
  return task
}

async function ensureTask(repo: OperationalTaskRepository, taskId: number) {
  const task = await getTaskById(repo, taskId)
  if (!task) throw new Error('Operational task not found after update')
  return task
}

async function getTaskById(repo: OperationalTaskRepository, taskId: number) {
  const reader = (repo as any).getTaskById ?? (repo as any).getOperationalTaskById
  if (typeof reader !== 'function') {
    throw new Error('Operational task repository is missing getTaskById')
  }
  return reader.call(repo, taskId)
}

async function getNextTaskForEmployee(repo: OperationalTaskRepository, empleadoId: number, currentTaskId?: number) {
  const reader = (repo as any).getNextTaskForEmployee ?? (repo as any).getNextOperationalTaskForEmployee
  if (typeof reader !== 'function') {
    throw new Error('Operational task repository is missing getNextTaskForEmployee')
  }
  return reader.call(repo, empleadoId, currentTaskId)
}

async function persistTaskChange(
  repo: OperationalTaskRepository,
  taskId: number,
  updates: Partial<OperationalTaskRecord>,
  events: OperationalTaskEvent[],
) {
  const writer = (repo as any).persistTaskChange ?? (repo as any).persistOperationalTaskChange
  if (typeof writer !== 'function') {
    throw new Error('Operational task repository is missing persistTaskChange')
  }
  return writer.call(repo, taskId, updates, events)
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
