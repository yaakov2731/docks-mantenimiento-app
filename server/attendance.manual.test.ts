import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, initDb, getEmpleadoAttendanceEvents, createManualAttendanceEvent, correctManualAttendanceEvent, getAttendanceAuditTrailForEmpleado, getEmpleadoAttendanceStatus, crearEmpleado, registrarEntradaEmpleado, registrarSalidaEmpleado, registerEmpleadoAttendance, buildAttendanceTurns } from './db'
import { resetTestDb } from './test/db-factory'
import * as schema from '../drizzle/schema'

describe('manual attendance support', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T19:00:00.000Z'))
    await resetTestDb()
  })

  afterEach(() => {
    vi.useRealTimers()
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

  it('supports lunch events and discounts them from worked time', async () => {
    await crearEmpleado({ nombre: 'Juan' } as any)

    await createManualAttendanceEvent({
      empleadoId: 1,
      tipo: 'entrada',
      fechaHora: new Date('2026-04-10T12:00:00.000Z'),
    })
    await createManualAttendanceEvent({
      empleadoId: 1,
      tipo: 'inicio_almuerzo',
      fechaHora: new Date('2026-04-10T14:00:00.000Z'),
    })
    await createManualAttendanceEvent({
      empleadoId: 1,
      tipo: 'fin_almuerzo',
      fechaHora: new Date('2026-04-10T14:45:00.000Z'),
    })
    await createManualAttendanceEvent({
      empleadoId: 1,
      tipo: 'salida',
      fechaHora: new Date('2026-04-10T18:00:00.000Z'),
    })

    const rows = await getEmpleadoAttendanceEvents(1)
    const status = await getEmpleadoAttendanceStatus(1)

    expect(rows.map(row => row.tipo)).toEqual(['entrada', 'inicio_almuerzo', 'fin_almuerzo', 'salida'])
    expect(status.onShift).toBe(false)
    expect(status.onLunch).toBe(false)
    expect(status.grossWorkedSecondsToday).toBe(0)
    expect(status.todayLunchSeconds).toBe(2700)
    expect(status.workedSecondsToday).toBe(0)
    expect(status.lastShiftGrossSeconds).toBe(21600)
    expect(status.lastShiftLunchSeconds).toBe(2700)
    expect(status.lastShiftWorkedSeconds).toBe(18900)
    expect(status.todayEntries).toBe(1)
    expect(status.todayLunchStarts).toBe(1)
    expect(status.todayLunchEnds).toBe(1)
    expect(status.todayExits).toBe(1)
    expect(status.lastLunchStartAt).toEqual(new Date('2026-04-10T14:00:00.000Z'))
    expect(status.lastLunchEndAt).toEqual(new Date('2026-04-10T14:45:00.000Z'))
  })

  it('ignores duplicate entry events while rebuilding turns', async () => {
    const turns = buildAttendanceTurns([
      { tipo: 'entrada', timestamp: new Date('2026-04-10T12:00:00.000Z'), canal: 'whatsapp' },
      { tipo: 'entrada', timestamp: new Date('2026-04-10T12:00:01.000Z'), canal: 'whatsapp' },
      { tipo: 'inicio_almuerzo', timestamp: new Date('2026-04-10T14:00:00.000Z'), canal: 'whatsapp' },
      { tipo: 'fin_almuerzo', timestamp: new Date('2026-04-10T14:45:00.000Z'), canal: 'whatsapp' },
      { tipo: 'salida', timestamp: new Date('2026-04-10T18:00:00.000Z'), canal: 'whatsapp' },
    ], new Date('2026-04-10T18:00:00.000Z').getTime())

    expect(turns).toHaveLength(1)
    expect(turns[0].turnoAbierto).toBe(false)
    expect(turns[0].lunchSeconds).toBe(2700)
    expect(turns[0].workedSeconds).toBe(18900)
  })

  it('keeps legacy entry and exit functions synchronized with live attendance status', async () => {
    await crearEmpleado({ nombre: 'Juan' } as any)

    const entrada = await registrarEntradaEmpleado(1, {
      fuente: 'whatsapp',
      nota: 'inicio legacy',
    })

    let status = await getEmpleadoAttendanceStatus(1)

    expect(entrada.alreadyOpen).toBe(false)
    expect(status.onShift).toBe(true)
    expect(status.lastAction).toBe('entrada')
    expect(status.lastChannel).toBe('whatsapp')
    expect(status.todayEntries).toBe(1)

    vi.setSystemTime(new Date('2026-04-10T21:00:00.000Z'))
    const salida = await registrarSalidaEmpleado(1, { nota: 'fin legacy' })

    status = await getEmpleadoAttendanceStatus(1)

    expect(salida).not.toBeNull()
    expect(status.onShift).toBe(false)
    expect(status.lastAction).toBe('salida')
    expect(status.lastChannel).toBe('whatsapp')
    expect(status.todayExits).toBe(1)
    expect(status.workedSecondsToday).toBe(0)
    expect(status.lastShiftWorkedSeconds).toBeGreaterThan(0)
  })

  it('treats a repeated entry retry as idempotent success', async () => {
    await crearEmpleado({ nombre: 'Juan' } as any)

    const first = await registerEmpleadoAttendance(1, 'entrada', 'whatsapp')
    const second = await registerEmpleadoAttendance(1, 'entrada', 'whatsapp')
    const rows = await getEmpleadoAttendanceEvents(1)

    expect(first.success).toBe(true)
    expect(second.success).toBe(true)
    expect(rows.map((row) => row.tipo)).toEqual(['entrada'])
  })

  it('treats a repeated exit retry as idempotent success', async () => {
    await crearEmpleado({ nombre: 'Juan' } as any)

    await registerEmpleadoAttendance(1, 'entrada', 'whatsapp')
    const first = await registerEmpleadoAttendance(1, 'salida', 'whatsapp')
    const second = await registerEmpleadoAttendance(1, 'salida', 'whatsapp')
    const rows = await getEmpleadoAttendanceEvents(1)

    expect(first.success).toBe(true)
    expect(second.success).toBe(true)
    expect(rows.map((row) => row.tipo)).toEqual(['entrada', 'salida'])
  })

  it('auto-closes a stale legacy open shift before mirroring a new entry', async () => {
    await crearEmpleado({ nombre: 'Juan' } as any)

    await registerEmpleadoAttendance(1, 'entrada', 'whatsapp')
    vi.setSystemTime(new Date('2026-04-10T20:00:00.000Z'))
    await registerEmpleadoAttendance(1, 'salida', 'whatsapp')

    await db.insert(schema.marcacionesEmpleados).values({
      empleadoId: 1,
      entradaAt: new Date('2026-04-10T19:00:00.000Z'),
      salidaAt: null,
      fuente: 'whatsapp',
      createdAt: new Date('2026-04-10T19:00:00.000Z'),
      updatedAt: new Date('2026-04-10T19:00:00.000Z'),
    }).run()

    vi.setSystemTime(new Date('2026-04-10T21:00:00.000Z'))
    await registerEmpleadoAttendance(1, 'entrada', 'whatsapp')

    const legacyRows = await db.select().from(schema.marcacionesEmpleados).where(sql`${schema.marcacionesEmpleados.empleadoId} = 1`)
    const staleRows = legacyRows.filter((row) => row.entradaAt?.getTime?.() === new Date('2026-04-10T19:00:00.000Z').getTime())
    const latestOpen = legacyRows.find((row) => row.salidaAt == null && row.entradaAt?.getTime?.() === new Date('2026-04-10T21:00:00.000Z').getTime())

    expect(staleRows).toHaveLength(2)
    expect(staleRows.every((row) => row.salidaAt)).toBe(true)
    expect(latestOpen).toBeTruthy()
  })

  it('treats lunch retries as idempotent success', async () => {
    await crearEmpleado({ nombre: 'Juan' } as any)

    await registerEmpleadoAttendance(1, 'entrada', 'whatsapp')
    const firstLunchStart = await registerEmpleadoAttendance(1, 'inicio_almuerzo', 'whatsapp')
    const secondLunchStart = await registerEmpleadoAttendance(1, 'inicio_almuerzo', 'whatsapp')
    const firstLunchEnd = await registerEmpleadoAttendance(1, 'fin_almuerzo', 'whatsapp')
    const secondLunchEnd = await registerEmpleadoAttendance(1, 'fin_almuerzo', 'whatsapp')
    const rows = await getEmpleadoAttendanceEvents(1)

    expect(firstLunchStart.success).toBe(true)
    expect(secondLunchStart.success).toBe(true)
    expect(firstLunchEnd.success).toBe(true)
    expect(secondLunchEnd.success).toBe(true)
    expect(rows.map((row) => row.tipo)).toEqual(['entrada', 'inicio_almuerzo', 'fin_almuerzo'])
  })

  it('rejects a future manual event', async () => {
    await crearEmpleado({ nombre: 'Juan' } as any)

    await expect(createManualAttendanceEvent({
      empleadoId: 1,
      tipo: 'entrada',
      fechaHora: new Date(Date.now() + 60_000),
    })).rejects.toThrow('No se permiten marcaciones futuras')
  })

  it('blocks manual creation for an event inside a closed payroll period', async () => {
    await crearEmpleado({ nombre: 'Juan' } as any)

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

    await expect(createManualAttendanceEvent({
      empleadoId: 1,
      tipo: 'entrada',
      fechaHora: new Date('2026-04-08T08:00:00.000Z'),
    })).rejects.toThrow('No se puede crear una marcacion en un periodo cerrado')
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

  it('upgrades legacy attendance tables without timestamp column', async () => {
    await db.run(sql`DROP TABLE IF EXISTS empleado_asistencia`)
    await db.run(sql`
      CREATE TABLE empleado_asistencia (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empleado_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        canal TEXT NOT NULL,
        nota TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `)

    await initDb()
    await crearEmpleado({ nombre: 'Juan' } as any)

    await expect(createManualAttendanceEvent({
      empleadoId: 1,
      tipo: 'entrada',
      fechaHora: new Date('2026-04-08T08:00:00.000Z'),
    })).resolves.toEqual({ success: true })

    const rows = await getEmpleadoAttendanceEvents(1)
    expect(rows).toHaveLength(1)
  })
})
