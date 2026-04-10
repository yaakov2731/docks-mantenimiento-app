import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T12:00:00.000Z'))
    await resetTestDb()
  })

  afterEach(() => {
    vi.useRealTimers()
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

  it('tracks lunch state and blocks exit while lunch is open', async () => {
    const empleadoId = await createEmpleadoId()
    const caller = appRouter.createCaller(adminContext as any)

    await caller.asistencia.registrar({
      empleadoId,
      accion: 'entrada',
    })

    vi.setSystemTime(new Date('2026-04-10T13:00:00.000Z'))
    const lunchStart = await caller.asistencia.registrar({
      empleadoId,
      accion: 'inicio_almuerzo',
    })

    expect(lunchStart.success).toBe(true)
    expect(lunchStart.status.onShift).toBe(true)
    expect(lunchStart.status.onLunch).toBe(true)
    expect(lunchStart.status.lastAction).toBe('inicio_almuerzo')
    expect(lunchStart.status.lastLunchStartAt).toEqual(new Date('2026-04-10T13:00:00.000Z'))

    await expect(caller.asistencia.registrar({
      empleadoId,
      accion: 'salida',
    })).rejects.toMatchObject({
      code: 'CONFLICT',
      message: 'Primero cerrá el almuerzo para registrar la salida.',
    })

    vi.setSystemTime(new Date('2026-04-10T13:30:00.000Z'))
    const lunchEnd = await caller.asistencia.registrar({
      empleadoId,
      accion: 'fin_almuerzo',
    })

    expect(lunchEnd.success).toBe(true)
    expect(lunchEnd.status.onShift).toBe(true)
    expect(lunchEnd.status.onLunch).toBe(false)
    expect(lunchEnd.status.todayLunchSeconds).toBe(1800)
    expect(lunchEnd.status.todayLunchStarts).toBe(1)
    expect(lunchEnd.status.todayLunchEnds).toBe(1)

    vi.setSystemTime(new Date('2026-04-10T16:00:00.000Z'))
    const exit = await caller.asistencia.registrar({
      empleadoId,
      accion: 'salida',
    })

    expect(exit.success).toBe(true)
    expect(exit.status.onShift).toBe(false)
    expect(exit.status.onLunch).toBe(false)
    expect(exit.status.grossWorkedSecondsToday).toBe(14400)
    expect(exit.status.todayLunchSeconds).toBe(1800)
    expect(exit.status.workedSecondsToday).toBe(12600)
    expect(exit.status.todayExits).toBe(1)
    expect(exit.status.lastAction).toBe('salida')
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
