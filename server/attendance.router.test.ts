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

  it('returns a live attendance summary for the admin dashboard', async () => {
    const empleadoId = await createEmpleadoId()
    const caller = appRouter.createCaller(adminContext as any)

    await caller.asistencia.registrar({
      empleadoId,
      accion: 'entrada',
      nota: 'inicio desde panel',
    })

    const summary = await caller.asistencia.resumen({ periodo: 'dia' })

    expect(summary.periodo).toMatchObject({
      tipo: 'dia',
    })
    expect(summary.resumenEquipo).toMatchObject({
      empleadosActivos: 1,
      enTurno: 1,
    })
    expect(summary.empleados).toHaveLength(1)
    expect(summary.empleados[0]).toMatchObject({
      empleadoId,
      nombre: 'Juan',
      attendance: {
        onShift: true,
        lastAction: 'entrada',
      },
      turnos: [
        {
          fecha: '2026-04-10',
          turnoAbierto: true,
        },
      ],
      hoy: {
        primerIngresoAt: expect.anything(),
      },
    })
    expect(summary.eventos[0]).toMatchObject({
      empleadoId,
      empleadoNombre: 'Juan',
      tipo: 'entrada',
      canal: 'panel',
    })
  })

  it('uses the configured employee rate for the selected payroll period', async () => {
    await crearEmpleado({
      nombre: 'Juan',
      pagoDiario: 15000,
      pagoSemanal: 90000,
      pagoQuincenal: 180000,
      pagoMensual: 360000,
    } as any)
    const [empleado] = await getEmpleados()
    const caller = appRouter.createCaller(adminContext as any)

    await caller.asistencia.registrar({
      empleadoId: empleado.id,
      accion: 'entrada',
    })
    vi.setSystemTime(new Date('2026-04-10T18:00:00.000Z'))
    await caller.asistencia.registrar({
      empleadoId: empleado.id,
      accion: 'salida',
    })

    const summary = await caller.asistencia.resumen({ periodo: 'semana' })

    expect(summary.empleados[0]).toMatchObject({
      pagoDiario: 15000,
      pagoSemanal: 90000,
      pagoQuincenal: 180000,
      pagoMensual: 360000,
    })
    expect(summary.empleados[0].liquidacion).toMatchObject({
      tarifaPeriodo: 'semana',
      tarifaMonto: 90000,
      totalPagar: 90000,
      tarifaOrigen: 'configurado',
    })
    expect(summary.resumenEquipo.totalPagar).toBe(90000)
  })

  it('derives weekly payroll from daily rate when only daily pay is configured', async () => {
    await crearEmpleado({
      nombre: 'Juan',
      pagoDiario: 15000,
      pagoSemanal: 0,
      pagoQuincenal: 0,
      pagoMensual: 0,
    } as any)
    const [empleado] = await getEmpleados()
    const caller = appRouter.createCaller(adminContext as any)

    await caller.asistencia.registrar({
      empleadoId: empleado.id,
      accion: 'entrada',
    })
    vi.setSystemTime(new Date('2026-04-10T18:00:00.000Z'))
    await caller.asistencia.registrar({
      empleadoId: empleado.id,
      accion: 'salida',
    })

    const summary = await caller.asistencia.resumen({ periodo: 'semana' })

    expect(summary.empleados[0].liquidacion).toMatchObject({
      diasTrabajados: 1,
      tarifaPeriodo: 'dia',
      tarifaMonto: 15000,
      totalPagar: 15000,
      tarifaOrigen: 'derivado',
    })
    expect(summary.resumenEquipo.totalPagar).toBe(15000)
  })

  it('updates employee name and payroll amounts from the admin router', async () => {
    await crearEmpleado({ nombre: 'Juan' } as any)
    const [empleado] = await getEmpleados()
    const caller = appRouter.createCaller(adminContext as any)

    const result = await caller.empleados.actualizar({
      id: empleado.id,
      nombre: 'Juan Carlos',
      email: 'juan@example.com',
      telefono: '1133445566',
      especialidad: 'Electricista',
      waId: '5491133445566',
      pagoDiario: 12000,
      pagoSemanal: 72000,
      pagoQuincenal: 144000,
      pagoMensual: 288000,
    })

    const [updated] = await getEmpleados()

    expect(result.success).toBe(true)
    expect(updated).toMatchObject({
      nombre: 'Juan Carlos',
      email: 'juan@example.com',
      telefono: '1133445566',
      especialidad: 'Electricista',
      waId: '5491133445566',
      pagoDiario: 12000,
      pagoSemanal: 72000,
      pagoQuincenal: 144000,
      pagoMensual: 288000,
    })
  })

  it('closes and marks a payroll period as paid', async () => {
    const empleadoId = await createEmpleadoId()
    const caller = appRouter.createCaller(adminContext as any)

    await caller.asistencia.registrar({
      empleadoId,
      accion: 'entrada',
    })
    vi.setSystemTime(new Date('2026-04-10T18:00:00.000Z'))
    await caller.asistencia.registrar({
      empleadoId,
      accion: 'salida',
    })

    const closed = await caller.asistencia.cerrarLiquidacion({ periodo: 'dia' })
    expect(closed.success).toBe(true)

    let summary = await caller.asistencia.resumen({ periodo: 'dia' })
    expect(summary.cierre).toMatchObject({
      cerrado: true,
      pagado: false,
      closedBy: 'Admin',
    })
    expect(summary.empleados[0].cierre).toMatchObject({
      cerradoPorNombre: 'Admin',
    })

    const paid = await caller.asistencia.marcarPagado({ periodo: 'dia' })
    expect(paid.success).toBe(true)

    summary = await caller.asistencia.resumen({ periodo: 'dia' })
    expect(summary.cierre).toMatchObject({
      cerrado: true,
      pagado: true,
      paidBy: 'Admin',
    })
    expect(summary.empleados[0].cierre).toMatchObject({
      pagadoPorNombre: 'Admin',
    })
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
    expect(exit.status.grossWorkedSecondsToday).toBe(0)
    expect(exit.status.todayLunchSeconds).toBe(1800)
    expect(exit.status.workedSecondsToday).toBe(0)
    expect(exit.status.currentShiftGrossSeconds).toBe(0)
    expect(exit.status.currentShiftLunchSeconds).toBe(0)
    expect(exit.status.lastShiftGrossSeconds).toBe(14400)
    expect(exit.status.lastShiftLunchSeconds).toBe(1800)
    expect(exit.status.lastShiftWorkedSeconds).toBe(12600)
    expect(exit.status.todayExits).toBe(1)
    expect(exit.status.lastAction).toBe('salida')
  })

  it('separates multiple shifts from the same day into independent turns', async () => {
    const empleadoId = await createEmpleadoId()
    const caller = appRouter.createCaller(adminContext as any)

    await caller.asistencia.registrar({ empleadoId, accion: 'entrada' })
    vi.setSystemTime(new Date('2026-04-10T14:00:00.000Z'))
    await caller.asistencia.registrar({ empleadoId, accion: 'salida' })

    vi.setSystemTime(new Date('2026-04-10T15:00:00.000Z'))
    await caller.asistencia.registrar({ empleadoId, accion: 'entrada' })
    vi.setSystemTime(new Date('2026-04-10T18:00:00.000Z'))
    await caller.asistencia.registrar({ empleadoId, accion: 'salida' })

    const summary = await caller.asistencia.resumen({ periodo: 'dia' })

    expect(summary.empleados[0].turnos).toHaveLength(2)
    expect(summary.empleados[0].turnos[0]).toMatchObject({
      fecha: '2026-04-10',
      workedSeconds: 7200,
      turnoAbierto: false,
    })
    expect(summary.empleados[0].turnos[1]).toMatchObject({
      fecha: '2026-04-10',
      workedSeconds: 10800,
      turnoAbierto: false,
    })
    expect(summary.empleados[0].liquidacion?.segundosTrabajados).toBe(18000)
  })

  it('does not add overnight carryover hours to today when the employee clocks in again on the same day', async () => {
    const empleadoId = await createEmpleadoId()
    const caller = appRouter.createCaller(adminContext as any)

    await caller.asistencia.crearManual({
      empleadoId,
      tipo: 'entrada',
      fechaHora: new Date('2026-04-09T12:00:00.000Z'),
    })
    await caller.asistencia.crearManual({
      empleadoId,
      tipo: 'salida',
      fechaHora: new Date('2026-04-10T12:00:00.000Z'),
    })
    vi.setSystemTime(new Date('2026-04-10T15:00:00.000Z'))
    await caller.asistencia.crearManual({
      empleadoId,
      tipo: 'entrada',
      fechaHora: new Date('2026-04-10T12:05:00.000Z'),
    })

    const summary = await caller.asistencia.resumen({ periodo: 'dia' })
    const today = summary.empleados[0].liquidacion?.dias.find((day: any) => day.fecha === '2026-04-10')

    expect(today).toMatchObject({
      fecha: '2026-04-10',
      workedSeconds: 10500,
      entradas: 1,
      salidas: 1,
      turnoAbierto: true,
    })
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
