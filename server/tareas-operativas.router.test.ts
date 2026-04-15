import { beforeEach, describe, expect, it } from 'vitest'
import { appRouter } from './routers'
import { addOperationalTaskEvent, createOperationalTask, db, listOperationalTasks } from './db'
import { resetTestDb } from './test/db-factory'
import * as schema from '../drizzle/schema'

const adminContext = {
  req: {} as any,
  res: { cookie() {}, clearCookie() {} } as any,
  user: { id: 10, username: 'admin', name: 'Admin', role: 'admin' as const },
}

describe('tareas operativas router', () => {
  beforeEach(async () => {
    await resetTestDb()
  })

  it('deletes the selected operational tasks and their event history', async () => {
    const firstId = await createOperationalTask({
      origen: 'manual',
      tipoTrabajo: 'Limpieza',
      titulo: 'Baño planta alta',
      descripcion: 'Repaso completo',
      ubicacion: 'Baños',
      prioridad: 'media',
    } as any)
    const secondId = await createOperationalTask({
      origen: 'manual',
      tipoTrabajo: 'Reposición',
      titulo: 'Insumos hall',
      descripcion: 'Control de stock',
      ubicacion: 'Hall central',
      prioridad: 'alta',
    } as any)

    await addOperationalTaskEvent({
      tareaId: firstId,
      tipo: 'admin_update',
      descripcion: 'Creada por admin',
      actorTipo: 'admin',
      actorId: 10,
      actorNombre: 'Admin',
    })

    const caller = appRouter.createCaller(adminContext as any)
    const result = await caller.tareasOperativas.eliminarLote({ ids: [firstId] })

    const remainingTasks = await listOperationalTasks()
    const remainingEvents = await db.select().from(schema.tareasOperativasEvento)

    expect(result).toEqual({ success: true, deleted: 1 })
    expect(remainingTasks.map(task => task.id)).toEqual([secondId])
    expect(remainingEvents).toHaveLength(0)
  })
})
