import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createOperationalTasksService } from './service'

type FakeTask = {
  id: number
  empleadoId: number | null
  empleadoNombre?: string | null
  empleadoWaId?: string | null
  estado: 'pendiente_asignacion' | 'pendiente_confirmacion' | 'en_progreso' | 'pausada' | 'terminada' | 'cancelada' | 'rechazada'
  prioridad?: 'baja' | 'media' | 'alta' | 'urgente'
  ordenAsignacion?: number
  titulo?: string
  trabajoAcumuladoSegundos: number
  aceptadoAt?: Date | null
  trabajoIniciadoAt?: Date | null
  pausadoAt?: Date | null
  terminadoAt?: Date | null
  createdAt?: Date
  updatedAt?: Date
}

type FakeTaskUpdate = Partial<FakeTask>

type FakeTaskEvent = {
  tareaId: number
  tipo: 'asignacion' | 'aceptacion' | 'rechazo' | 'inicio' | 'pausa' | 'reanudar' | 'terminacion' | 'cancelacion' | 'reasignacion' | 'admin_update'
  actorTipo?: 'system' | 'employee' | 'admin'
  actorId?: number | null
  actorNombre?: string | null
  descripcion: string
  metadata?: Record<string, unknown> | null
  createdAt?: Date
}

function createFakeTasksRepo(initial: { tasks?: FakeTask[] } = {}) {
  const tasks = initial.tasks?.map((task) => ({
    prioridad: 'media' as const,
    ordenAsignacion: 0,
    createdAt: new Date('2026-04-07T08:00:00.000Z'),
    updatedAt: new Date('2026-04-07T08:00:00.000Z'),
    aceptadoAt: null,
    trabajoIniciadoAt: null,
    pausadoAt: null,
    terminadoAt: null,
    ...task,
  })) ?? []
  const updated: Array<{ id: number; changes: FakeTaskUpdate; snapshot: FakeTask }> = []
  const events: FakeTaskEvent[] = []

  return {
    tasks,
    updated,
    events,
    async getTaskById(taskId: number) {
      return tasks.find((task) => task.id === taskId) ?? null
    },
    async getActiveTaskForEmployee(empleadoId: number) {
      return tasks.find((task) => task.empleadoId === empleadoId && task.estado === 'en_progreso') ?? null
    },
    async getNextTaskForEmployee(empleadoId: number, currentTaskId?: number) {
      return tasks
        .filter((task) =>
          task.empleadoId === empleadoId &&
          task.estado === 'pendiente_confirmacion' &&
          task.id !== currentTaskId
        )
        .sort((left, right) =>
          priorityRank(right.prioridad ?? 'media') - priorityRank(left.prioridad ?? 'media') ||
          (left.ordenAsignacion ?? 0) - (right.ordenAsignacion ?? 0) ||
          left.createdAt!.getTime() - right.createdAt!.getTime()
        )[0] ?? null
    },
    async acceptOperationalTask(taskId: number, empleadoId: number) {
      const task = tasks.find((item) => item.id === taskId)
      if (!task) throw new Error(`Task ${taskId} not found in fake repo`)
      if (task.empleadoId !== empleadoId) throw new Error('Operational task does not belong to employee')
      if (task.estado !== 'pendiente_confirmacion') throw new Error('Operational task is not awaiting confirmation')

      const activeTask = tasks.find((item) =>
        item.empleadoId === empleadoId &&
        item.estado === 'en_progreso' &&
        item.id !== taskId
      )
      if (activeTask) throw new Error('Employee already has an active operational task')

      const now = new Date()
      const changes: FakeTaskUpdate = {
        estado: 'en_progreso',
        aceptadoAt: task.aceptadoAt ?? now,
        trabajoIniciadoAt: now,
        pausadoAt: null,
      }
      const snapshot = { ...task, ...changes }
      Object.assign(task, snapshot)
      updated.push({ id: taskId, changes, snapshot: { ...task } })
      events.push(
        {
          tareaId: taskId,
          tipo: 'aceptacion',
          actorTipo: 'employee',
          actorId: empleadoId,
          actorNombre: task.empleadoNombre ?? null,
          descripcion: 'Tarea aceptada por el empleado',
          createdAt: now,
        },
        {
          tareaId: taskId,
          tipo: 'inicio',
          actorTipo: 'employee',
          actorId: empleadoId,
          actorNombre: task.empleadoNombre ?? null,
          descripcion: 'Trabajo iniciado',
          createdAt: now,
        }
      )
      return task
    },
    async updateTask(taskId: number, changes: FakeTaskUpdate) {
      const task = tasks.find((item) => item.id === taskId)
      if (!task) throw new Error(`Task ${taskId} not found in fake repo`)
      Object.assign(task, changes)
      updated.push({ id: taskId, changes, snapshot: { ...task } })
    },
    async persistTaskChange(taskId: number, changes: FakeTaskUpdate, nextEvents: FakeTaskEvent[]) {
      const task = tasks.find((item) => item.id === taskId)
      if (!task) throw new Error(`Task ${taskId} not found in fake repo`)
      const snapshot = { ...task }
      Object.assign(snapshot, changes)
      updated.push({ id: taskId, changes, snapshot })
      Object.assign(task, snapshot)
      events.push(...nextEvents.map((event) => ({
        ...event,
        createdAt: event.createdAt ?? new Date(),
      })))
    },
    async addTaskEvent(event: FakeTaskEvent) {
      events.push({
        ...event,
        createdAt: event.createdAt ?? new Date(),
      })
    },
  }
}

describe('operational tasks service', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-07T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('rejects accepting a second task when the atomic repository detects one already in progress', async () => {
    const repo = createFakeTasksRepo({
      tasks: [
        { id: 11, empleadoId: 7, estado: 'en_progreso', trabajoAcumuladoSegundos: 300 },
        { id: 12, empleadoId: 7, estado: 'pendiente_confirmacion', trabajoAcumuladoSegundos: 0 },
      ],
    })
    repo.getActiveTaskForEmployee = async () => {
      throw new Error('preflight active-task read should not be used')
    }

    const service = createOperationalTasksService(repo)

    await expect(service.acceptTask({ taskId: 12, empleadoId: 7 })).rejects.toThrow(
      'Employee already has an active operational task'
    )
  })

  it('accepts an assigned task through the atomic repository path without a preflight active-task read', async () => {
    const repo = createFakeTasksRepo({
      tasks: [
        {
          id: 12,
          empleadoId: 7,
          empleadoNombre: 'Ana',
          estado: 'pendiente_confirmacion',
          trabajoAcumuladoSegundos: 0,
        },
      ],
    })
    repo.getActiveTaskForEmployee = async () => {
      throw new Error('preflight active-task read should not be used')
    }
    repo.persistTaskChange = async () => {
      throw new Error('persistTaskChange should not be used for acceptTask')
    }

    const service = createOperationalTasksService(repo)
    const task = await service.acceptTask({ taskId: 12, empleadoId: 7 })

    expect(task.estado).toBe('en_progreso')
    expect(task.aceptadoAt?.toISOString()).toBe('2026-04-07T12:00:00.000Z')
    expect(task.trabajoIniciadoAt?.toISOString()).toBe('2026-04-07T12:00:00.000Z')
    expect(task.pausadoAt).toBeNull()
    expect(repo.events.map((event) => event.tipo)).toEqual(['aceptacion', 'inicio'])
  })

  it('pauses an active task and accumulates elapsed work seconds', async () => {
    const repo = createFakeTasksRepo({
      tasks: [
        {
          id: 18,
          empleadoId: 4,
          empleadoNombre: 'Luis',
          estado: 'en_progreso',
          trabajoAcumuladoSegundos: 120,
          trabajoIniciadoAt: new Date('2026-04-07T11:55:00.000Z'),
        },
      ],
    })

    const service = createOperationalTasksService(repo)
    const task = await service.pauseTask({ taskId: 18, empleadoId: 4 })

    expect(task.estado).toBe('pausada')
    expect(task.trabajoAcumuladoSegundos).toBe(420)
    expect(task.trabajoIniciadoAt).toBeNull()
    expect(task.pausadoAt?.toISOString()).toBe('2026-04-07T12:00:00.000Z')
    expect(repo.events.map((event) => event.tipo)).toEqual(['pausa'])
  })

  it('finishes the active task and offers the next assigned task', async () => {
    const repo = createFakeTasksRepo({
      tasks: [
        {
          id: 21,
          empleadoId: 9,
          empleadoNombre: 'Carla',
          estado: 'en_progreso',
          ordenAsignacion: 1,
          titulo: 'Revisar techo norte',
          trabajoAcumuladoSegundos: 900,
          trabajoIniciadoAt: new Date('2026-04-07T11:45:00.000Z'),
        },
        {
          id: 22,
          empleadoId: 9,
          empleadoNombre: 'Carla',
          estado: 'pendiente_confirmacion',
          ordenAsignacion: 2,
          titulo: 'Cambiar foco pasillo',
          trabajoAcumuladoSegundos: 0,
        },
      ],
    })

    const service = createOperationalTasksService(repo)
    const result = await service.finishTask({ taskId: 21, empleadoId: 9, note: 'Techo reparado' })

    expect(result.task.estado).toBe('terminada')
    expect(result.task.trabajoAcumuladoSegundos).toBe(1800)
    expect(result.task.terminadoAt?.toISOString()).toBe('2026-04-07T12:00:00.000Z')
    expect(result.nextTask).toMatchObject({ id: 22, titulo: 'Cambiar foco pasillo' })
    expect(repo.events.map((event) => event.tipo)).toEqual(['terminacion'])
  })

  it('supports the db repository method names used by the bot api when finishing a task', async () => {
    const repo = createFakeTasksRepo({
      tasks: [
        {
          id: 51,
          empleadoId: 2,
          empleadoNombre: 'Jacobo',
          estado: 'en_progreso',
          titulo: 'Pintar local 24',
          trabajoAcumuladoSegundos: 60,
          trabajoIniciadoAt: new Date('2026-04-07T11:59:00.000Z'),
        },
        {
          id: 52,
          empleadoId: 2,
          empleadoNombre: 'Jacobo',
          estado: 'pendiente_confirmacion',
          titulo: 'Cerrar deposito',
          trabajoAcumuladoSegundos: 0,
        },
      ],
    })

    const dbShapedRepo = {
      getOperationalTaskById: repo.getTaskById,
      getNextOperationalTaskForEmployee: repo.getNextTaskForEmployee,
      acceptOperationalTask: repo.acceptOperationalTask,
      persistOperationalTaskChange: repo.persistTaskChange,
    }

    const service = createOperationalTasksService(dbShapedRepo as any)
    const result = await service.finishTask({ taskId: 51, empleadoId: 2, note: 'Trabajo listo' })

    expect(result.task.estado).toBe('terminada')
    expect(result.task.trabajoAcumuladoSegundos).toBe(120)
    expect(result.nextTask).toMatchObject({ id: 52, titulo: 'Cerrar deposito' })
  })

  it('rejects a pending assigned task without starting a timer', async () => {
    const repo = createFakeTasksRepo({
      tasks: [
        {
          id: 31,
          empleadoId: 6,
          empleadoNombre: 'Julia',
          estado: 'pendiente_confirmacion',
          trabajoAcumuladoSegundos: 0,
        },
      ],
    })

    const service = createOperationalTasksService(repo)
    const task = await service.rejectTask({ taskId: 31, empleadoId: 6, note: 'No tengo herramientas' })

    expect(task.estado).toBe('rechazada')
    expect(task.aceptadoAt).toBeNull()
    expect(task.trabajoIniciadoAt).toBeNull()
    expect(repo.events.map((event) => event.tipo)).toEqual(['rechazo'])
  })

  it('resumes a paused task without losing accumulated time', async () => {
    const repo = createFakeTasksRepo({
      tasks: [
        {
          id: 32,
          empleadoId: 6,
          empleadoNombre: 'Julia',
          estado: 'pausada',
          trabajoAcumuladoSegundos: 420,
          pausadoAt: new Date('2026-04-07T11:58:00.000Z'),
        },
      ],
    })

    const service = createOperationalTasksService(repo as any)
    const task = await service.resumeTask({ taskId: 32, empleadoId: 6 })

    expect(task.estado).toBe('en_progreso')
    expect(task.trabajoAcumuladoSegundos).toBe(420)
    expect(task.trabajoIniciadoAt?.toISOString()).toBe('2026-04-07T12:00:00.000Z')
    expect(task.pausadoAt).toBeNull()
    expect(repo.events.map((event) => event.tipo)).toEqual(['reanudar'])
  })

  it('cancels an assigned task and returns it to the unassigned queue', async () => {
    const repo = createFakeTasksRepo({
      tasks: [
        {
          id: 33,
          empleadoId: 6,
          empleadoNombre: 'Julia',
          estado: 'pausada',
          trabajoAcumuladoSegundos: 420,
          aceptadoAt: new Date('2026-04-07T11:40:00.000Z'),
          pausadoAt: new Date('2026-04-07T11:58:00.000Z'),
        },
      ],
    })

    const service = createOperationalTasksService(repo as any)
    const task = await service.cancelTask({ taskId: 33, empleadoId: 6, note: 'No pude terminar' })

    expect(task.estado).toBe('pendiente_asignacion')
    expect(task.empleadoId).toBeNull()
    expect(task.trabajoAcumuladoSegundos).toBe(420)
    expect(task.trabajoIniciadoAt).toBeNull()
    expect(task.pausadoAt).toBeNull()
    expect(repo.events.map((event) => event.tipo)).toEqual(['cancelacion'])
  })

  it('keeps task state unchanged when the atomic acceptance path fails before persistence', async () => {
    const repo = createFakeTasksRepo({
      tasks: [
        {
          id: 41,
          empleadoId: 8,
          empleadoNombre: 'Mario',
          estado: 'pendiente_confirmacion',
          trabajoAcumuladoSegundos: 0,
        },
      ],
    })

    repo.acceptOperationalTask = async () => {
      throw new Error('atomic task acceptance failed')
    }

    const service = createOperationalTasksService(repo)

    await expect(service.acceptTask({ taskId: 41, empleadoId: 8 })).rejects.toThrow('atomic task acceptance failed')
    expect(repo.tasks[0].estado).toBe('pendiente_confirmacion')
    expect(repo.tasks[0].aceptadoAt).toBeNull()
    expect(repo.tasks[0].trabajoIniciadoAt).toBeNull()
    expect(repo.events).toHaveLength(0)
  })
})

function priorityRank(prioridad: 'baja' | 'media' | 'alta' | 'urgente') {
  switch (prioridad) {
    case 'urgente': return 4
    case 'alta': return 3
    case 'media': return 2
    case 'baja': return 1
    default: return 0
  }
}
