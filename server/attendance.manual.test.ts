import { beforeEach, describe, expect, it } from 'vitest'
import { db, getEmpleadoAttendanceEvents, createManualAttendanceEvent, correctManualAttendanceEvent, getAttendanceAuditTrailForEmpleado, crearEmpleado } from './db'
import { resetTestDb } from './test/db-factory'
import * as schema from '../drizzle/schema'

describe('manual attendance support', () => {
  beforeEach(async () => {
    await resetTestDb()
  })

  it('creates a past manual admin entry', async () => {
    await crearEmpleado({ nombre: 'Juan' } as any)

    const created = await createManualAttendanceEvent({
      empleadoId: 1,
      tipo: 'entrada',
      fechaHora: new Date('2026-04-08T08:00:00.000Z'),
      nota: 'cargada por admin',
    })

    const rows = await getEmpleadoAttendanceEvents(1)

    expect(created.success).toBe(true)
    expect(rows).toHaveLength(1)
    expect(rows[0].tipo).toBe('entrada')
    expect(rows[0].canal).toBe('manual_admin')
    expect(rows[0].nota).toBe('cargada por admin')
  })

  it('rejects a future manual event', async () => {
    await crearEmpleado({ nombre: 'Juan' } as any)

    await expect(createManualAttendanceEvent({
      empleadoId: 1,
      tipo: 'entrada',
      fechaHora: new Date(Date.now() + 60_000),
    })).rejects.toThrow('No se permiten marcaciones futuras')
  })

  it('corrects an existing event and stores audit trail', async () => {
    await crearEmpleado({ nombre: 'Juan' } as any)

    await createManualAttendanceEvent({
      empleadoId: 1,
      tipo: 'entrada',
      fechaHora: new Date('2026-04-08T08:00:00.000Z'),
    })

    const [createdEvent] = await getEmpleadoAttendanceEvents(1)

    await correctManualAttendanceEvent({
      attendanceEventId: createdEvent.id,
      tipo: 'salida',
      fechaHora: new Date('2026-04-08T12:00:00.000Z'),
      nota: 'corregida por supervisor',
      motivo: 'el empleado salio al mediodia',
      admin: { id: 99, name: 'Admin' },
    })

    const rows = await getEmpleadoAttendanceEvents(1)
    const audit = await getAttendanceAuditTrailForEmpleado(1)

    expect(rows).toHaveLength(1)
    expect(rows[0].tipo).toBe('salida')
    expect(rows[0].canal).toBe('manual_admin')
    expect(rows[0].nota).toBe('corregida por supervisor')
    expect(audit).toHaveLength(1)
    expect(audit[0].motivo).toBe('el empleado salio al mediodia')
    expect(audit[0].valorAnteriorTipo).toBe('entrada')
    expect(audit[0].valorNuevoTipo).toBe('salida')
  })

  it('blocks correction for an event inside a closed payroll period', async () => {
    await crearEmpleado({ nombre: 'Juan' } as any)

    await createManualAttendanceEvent({
      empleadoId: 1,
      tipo: 'entrada',
      fechaHora: new Date('2026-04-08T08:00:00.000Z'),
    })

    const [createdEvent] = await getEmpleadoAttendanceEvents(1)

    await db.insert(schema.empleadoLiquidacionCierre).values({
      empleadoId: 1,
      periodoTipo: 'dia',
      periodoDesde: '2026-04-08',
      periodoHasta: '2026-04-08',
      diasTrabajados: 1,
      segundosTrabajados: 0,
      promedioSegundosPorDia: 0,
      pagoDiario: 0,
      pagoSemanal: 0,
      pagoQuincenal: 0,
      pagoMensual: 0,
      tarifaPeriodo: 'dia',
      tarifaMonto: 0,
      totalPagar: 0,
      cerradoPorId: 99,
      cerradoPorNombre: 'Admin',
      closedAt: new Date('2026-04-08T18:00:00.000Z'),
    }).run()

    await expect(correctManualAttendanceEvent({
      attendanceEventId: createdEvent.id,
      tipo: 'salida',
      fechaHora: new Date('2026-04-08T12:00:00.000Z'),
      motivo: 'correccion tardia',
      admin: { id: 99, name: 'Admin' },
    })).rejects.toThrow('No se puede corregir una marcacion de un periodo cerrado')
  })
})
