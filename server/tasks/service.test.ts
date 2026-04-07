import { describe, expect, it } from 'vitest'
import { createOperationalTasksService } from './service'

type FakeTask = {
  id: number
  empleadoId: number | null
  estado: 'pendiente_asignacion' | 'pendiente_confirmacion' | 'en_progreso' | 'pausada' | 'terminada' | 'cancelada' | 'rechazada'
  trabajoAcumuladoSegundos: number
}

function createFakeTasksRepo(initial: { tasks?: FakeTask[] } = {}) {
  const tasks = [...(initial.tasks ?? [])]
  return {
    tasks,
    async listTasksByEmployee(empleadoId: number) {
      return tasks.filter((task) => task.empleadoId === empleadoId)
    },
  }
}

describe('operational tasks service', () => {
  it('rejects accepting a second task when the employee already has one in progress', async () => {
    const repo = createFakeTasksRepo({
      tasks: [
        { id: 11, empleadoId: 7, estado: 'en_progreso', trabajoAcumuladoSegundos: 300 },
        { id: 12, empleadoId: 7, estado: 'pendiente_confirmacion', trabajoAcumuladoSegundos: 0 },
      ],
    })

    const service = createOperationalTasksService(repo as any)

    await expect(service.acceptTask({ taskId: 12, empleadoId: 7 })).rejects.toThrow(
      'Employee already has an active operational task'
    )
  })
})
