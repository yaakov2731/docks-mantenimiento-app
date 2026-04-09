import { beforeEach, describe, expect, it } from 'vitest'
import { TRPCError } from '@trpc/server'
import { appRouter } from './routers'
import { actualizarEmpleado, crearEmpleado, getEmpleados } from './db'
import { resetTestDb } from './test/db-factory'

const adminContext = {
  req: {} as any,
  res: { cookie() {}, clearCookie() {} } as any,
  user: { id: 10, username: 'admin', name: 'Admin', role: 'admin' as const },
}

const employeeContext = {
  req: {} as any,
  res: { cookie() {}, clearCookie() {} } as any,
  user: { id: 11, username: 'empleado', name: 'Empleado', role: 'employee' as const },
}

describe('attendance router', () => {
  beforeEach(async () => {
    await resetTestDb()
  })

  async function createEmpleadoId() {
    await crearEmpleado({ nombre: 'Juan' } as any)
    const [empleado] = await getEmpleados()
    return empleado.id
  }

  it('registers live panel attendance and returns current status', async () => {
    const empleadoId = await createEmpleadoId()
    const caller = appRouter.createCaller(adminContext as any)

    const entry = await caller.asistencia.registrar({
      empleadoId,
      accion: 'entrada',
      nota: 'inicio de turno',
    })

    const status = await caller.asistencia.estadoEmpleado({ empleadoId })

    expect(entry.success).toBe(true)
    expect(entry.status.onShift).toBe(true)
    expect(entry.status.lastAction).toBe('entrada')
    expect(entry.status.lastChannel).toBe('panel')
    expect(status.onShift).toBe(true)
    expect(status.lastChannel).toBe('panel')
    expect(status.todayEntries).toBe(1)
  })

  it('lets an admin create and correct manual attendance with audit trail', async () => {
    const empleadoId = await createEmpleadoId()
    const caller = appRouter.createCaller(adminContext as any)

    await caller.asistencia.crearManual({
      empleadoId,
      tipo: 'entrada',
      fechaHora: new Date('2026-04-08T08:00:00.000Z'),
      nota: 'carga manual',
    })

    const eventos = await caller.asistencia.eventosEmpleado({ empleadoId })

    await caller.asistencia.corregirManual({
      attendanceEventId: eventos[0].id,
      tipo: 'salida',
      fechaHora: new Date('2026-04-08T12:00:00.000Z'),
      nota: 'ajustada',
      motivo: 'correccion administrativa',
    })

    const eventosActualizados = await caller.asistencia.eventosEmpleado({ empleadoId })
    const auditoria = await caller.asistencia.auditoriaEmpleado({ empleadoId })

    expect(eventosActualizados).toHaveLength(1)
    expect(eventosActualizados[0].tipo).toBe('salida')
    expect(eventosActualizados[0].canal).toBe('manual_admin')
    expect(auditoria).toHaveLength(1)
    expect(auditoria[0].valorAnteriorTipo).toBe('entrada')
    expect(auditoria[0].valorNuevoTipo).toBe('salida')
  })

  it('forbids non-admin users from manual attendance mutations', async () => {
    const empleadoId = await createEmpleadoId()
    const caller = appRouter.createCaller(employeeContext as any)

    await expect(caller.asistencia.crearManual({
      empleadoId,
      tipo: 'entrada',
      fechaHora: new Date('2026-04-08T08:00:00.000Z'),
    })).rejects.toBeInstanceOf(TRPCError)
  })

  it('blocks attendance access for deactivated employees', async () => {
    const empleadoId = await createEmpleadoId()
    await actualizarEmpleado(empleadoId, { activo: false } as any)
    const caller = appRouter.createCaller(adminContext as any)

    await expect(caller.asistencia.estadoEmpleado({ empleadoId })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})
