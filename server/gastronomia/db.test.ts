import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import {
  createEmpleadoGastro,
  clearPlanificacionSemanaGastronomia,
  getEmpleadoAttendanceStatus,
  getEmpleadoByWaId,
  getEmpleadosGastronomia,
  publishPlanificacionGastronomia,
  registerEmpleadoAttendance,
  resetPlanificacionConfirmacionesGastronomia,
  savePlanificacionTurnoGastronomia,
  db,
  initDb,
} from '../db'
import { resetTestDb } from '../test/db-factory'
import * as schema from '../../drizzle/schema'

describe('getEmpleadosGastronomia', () => {
  beforeEach(async () => {
    await resetTestDb()
  })

  it('returns only gastronomia employees', async () => {
    const result = await getEmpleadosGastronomia()
    expect(Array.isArray(result)).toBe(true)
  })

  it('prefers the gastronomy-capable record when two employees share one WhatsApp number', async () => {
    await initDb()

    await db.insert(schema.empleados).values({
      nombre: 'Marcos Operativo',
      waId: '5491138210373',
      tipoEmpleado: 'operativo',
      puedeGastronomia: false,
      sector: 'operativo',
      activo: true,
    } as any).run()

    const gastro = await createEmpleadoGastro({
      nombre: 'Marcos Gastro',
      waId: '5491138210373',
      sector: 'uno_grill',
      puesto: 'Parrilla',
      pagoDiario: 1000,
    })

    const empleado = await getEmpleadoByWaId('5491138210373')

    expect(empleado?.id).toBe(gastro.id)
    expect((empleado as any)?.tipoEmpleado).toBe('gastronomia')
    expect((empleado as any)?.sector).toBe('uno_grill')
  })

  it('resets only one local and week of planning confirmations and records audit', async () => {
    await initDb()
    const brooklyn = await createEmpleadoGastro({ nombre: 'Ana', sector: 'brooklyn', puesto: 'Caja', pagoDiario: 1000 })
    const trento = await createEmpleadoGastro({ nombre: 'Beto', sector: 'trento_cafe', puesto: 'Salon', pagoDiario: 1000 })

    await savePlanificacionTurnoGastronomia({
      empleadoId: brooklyn.id,
      fecha: '2026-05-05',
      trabaja: true,
      horaEntrada: '18:00',
      horaSalida: '00:00',
      sector: 'brooklyn',
      puesto: 'Caja',
    })
    await savePlanificacionTurnoGastronomia({
      empleadoId: brooklyn.id,
      fecha: '2026-05-06',
      trabaja: true,
      horaEntrada: '18:00',
      horaSalida: '00:00',
      sector: 'brooklyn',
      puesto: 'Caja',
    })
    await savePlanificacionTurnoGastronomia({
      empleadoId: trento.id,
      fecha: '2026-05-05',
      trabaja: true,
      horaEntrada: '10:00',
      horaSalida: '16:00',
      sector: 'trento_cafe',
      puesto: 'Salon',
    })

    const targetRows = await db.select().from(schema.gastronomiaPlanificacionTurnos)
    expect(targetRows).toHaveLength(3)

    for (const row of targetRows) {
      await db.update(schema.gastronomiaPlanificacionTurnos)
        .set({
          estado: row.sector === 'brooklyn' ? 'enviado' : 'confirmado',
          publicadoAt: new Date('2026-05-04T12:00:00.000Z'),
          respondidoAt: row.sector === 'brooklyn' ? null : new Date('2026-05-04T13:00:00.000Z'),
          respuestaNota: row.sector === 'brooklyn' ? null : 'detalle',
        } as any)
        .where(eq(schema.gastronomiaPlanificacionTurnos.id, row.id))
        .run()
    }

    const result = await resetPlanificacionConfirmacionesGastronomia({
      sector: 'brooklyn',
      desde: '2026-05-05',
      hasta: '2026-05-12',
      actorUserId: 7,
      actorNombre: 'Admin',
    })

    const rows = await db.select().from(schema.gastronomiaPlanificacionTurnos)
    const brooklynRows = rows.filter(row => row.sector === 'brooklyn')
    const trentoRows = rows.filter(row => row.sector === 'trento_cafe')
    const auditRows = await db.select().from(schema.gastronomiaPlanificacionAuditoria)

    expect(result.reset).toBe(2)
    expect(brooklynRows.every(row => row.estado === 'borrador')).toBe(true)
    expect(brooklynRows.every(row => row.publicadoAt === null)).toBe(true)
    expect(brooklynRows.every(row => row.respondidoAt === null)).toBe(true)
    expect(brooklynRows.every(row => row.respuestaNota === null)).toBe(true)
    expect(trentoRows[0]?.estado).toBe('confirmado')
    expect(auditRows).toHaveLength(1)
    expect(auditRows[0]).toMatchObject({
      tipo: 'reset_confirmaciones',
      sector: 'brooklyn',
      desde: '2026-05-05',
      hasta: '2026-05-12',
      affectedCount: 2,
      actorUserId: 7,
      actorNombre: 'Admin',
    })
  })

  it('physically deletes rejected shifts for one local and week', async () => {
    await initDb()
    const brooklyn = await createEmpleadoGastro({ nombre: 'Lola', sector: 'brooklyn', puesto: 'Caja', pagoDiario: 1000 })
    const trento = await createEmpleadoGastro({ nombre: 'Nico', sector: 'trento_cafe', puesto: 'Salon', pagoDiario: 1000 })

    const rejected = await savePlanificacionTurnoGastronomia({
      empleadoId: brooklyn.id,
      fecha: '2026-05-05',
      trabaja: true,
      horaEntrada: '18:00',
      horaSalida: '00:00',
      sector: 'brooklyn',
      puesto: 'Caja',
    })
    const confirmed = await savePlanificacionTurnoGastronomia({
      empleadoId: brooklyn.id,
      fecha: '2026-05-06',
      trabaja: true,
      horaEntrada: '18:00',
      horaSalida: '00:00',
      sector: 'brooklyn',
      puesto: 'Caja',
    })
    await savePlanificacionTurnoGastronomia({
      empleadoId: trento.id,
      fecha: '2026-05-05',
      trabaja: true,
      horaEntrada: '10:00',
      horaSalida: '16:00',
      sector: 'trento_cafe',
      puesto: 'Salon',
    })

    await db.update(schema.gastronomiaPlanificacionTurnos).set({ estado: 'no_trabaja' } as any).where(eq(schema.gastronomiaPlanificacionTurnos.id, rejected.id)).run()
    await db.update(schema.gastronomiaPlanificacionTurnos).set({ estado: 'confirmado' } as any).where(eq(schema.gastronomiaPlanificacionTurnos.id, confirmed.id)).run()

    const result = await clearPlanificacionSemanaGastronomia({
      sector: 'brooklyn',
      desde: '2026-05-05',
      hasta: '2026-05-12',
      scope: 'rechazados',
      actorUserId: 9,
      actorNombre: 'Admin',
    })

    const rows = await db.select().from(schema.gastronomiaPlanificacionTurnos)
    const auditRows = await db.select().from(schema.gastronomiaPlanificacionAuditoria)

    expect(result).toMatchObject({ cleared: 1, scope: 'rechazados' })
    expect(rows.some(row => row.id === rejected.id)).toBe(false)
    expect(rows.some(row => row.id === confirmed.id)).toBe(true)
    expect(rows.some(row => row.sector === 'trento_cafe')).toBe(true)
    expect(auditRows.some(row => String(row.tipo) === 'clear_rechazados' && row.affectedCount === 1)).toBe(true)
  })

  it('groups weekly planning into one WhatsApp message per employee', async () => {
    await initDb()
    const empleado = await createEmpleadoGastro({
      nombre: 'Lara',
      sector: 'brooklyn',
      puesto: 'Caja',
      pagoDiario: 1000,
      waId: '5491112345678',
    })

    const first = await savePlanificacionTurnoGastronomia({
      empleadoId: empleado.id,
      fecha: '2026-10-12',
      trabaja: true,
      horaEntrada: '18:00',
      horaSalida: '00:00',
      sector: 'brooklyn',
      puesto: 'Caja',
    })
    const second = await savePlanificacionTurnoGastronomia({
      empleadoId: empleado.id,
      fecha: '2026-10-13',
      trabaja: true,
      horaEntrada: '19:00',
      horaSalida: '01:00',
      sector: 'brooklyn',
      puesto: 'Caja',
    })

    const result = await publishPlanificacionGastronomia([first.id, second.id])
    const queueRows = await db.select().from(schema.botQueue).orderBy(schema.botQueue.id)
    const publishedRows = await db.select().from(schema.gastronomiaPlanificacionTurnos)

    expect(result).toMatchObject({ published: 1, skipped: 0 })
    expect(queueRows).toHaveLength(3)
    expect(queueRows[0]?.message).toContain('Docks | Planificación')
    expect(queueRows[0]?.message).toContain('tenés turnos asignados')
    expect(queueRows[1]?.message).toContain('Docks | Confirmar turno')
    expect(queueRows[1]?.message).toContain(`Turno #${first.id}`)
    expect((queueRows[1] as any)?.scheduledAt).toBeTruthy()
    expect(queueRows[2]?.message).toContain('Docks | Confirmar turno')
    expect(queueRows[2]?.message).toContain(`Turno #${second.id}`)
    expect((queueRows[2] as any)?.scheduledAt).toBeTruthy()
    expect(publishedRows.every(row => row.estado === 'enviado')).toBe(true)
  })

  it('updates the same pending weekly WhatsApp when another day is published later in the same week', async () => {
    await initDb()
    const empleado = await createEmpleadoGastro({
      nombre: 'Mora',
      sector: 'brooklyn',
      puesto: 'Caja',
      pagoDiario: 1000,
      waId: '5491199988877',
    })

    const first = await savePlanificacionTurnoGastronomia({
      empleadoId: empleado.id,
      fecha: '2026-10-12',
      trabaja: true,
      horaEntrada: '18:00',
      horaSalida: '00:00',
      sector: 'brooklyn',
      puesto: 'Caja',
    })
    const second = await savePlanificacionTurnoGastronomia({
      empleadoId: empleado.id,
      fecha: '2026-10-13',
      trabaja: true,
      horaEntrada: '19:00',
      horaSalida: '01:00',
      sector: 'brooklyn',
      puesto: 'Caja',
    })

    const firstPublish = await publishPlanificacionGastronomia([first.id])
    const afterFirstQueue = await db.select().from(schema.botQueue).orderBy(schema.botQueue.id)

    expect(firstPublish).toMatchObject({ published: 1, skipped: 0 })
    expect(afterFirstQueue).toHaveLength(1)
    expect(afterFirstQueue[0]?.message).toContain('Docks | Confirmar turno')
    expect(afterFirstQueue[0]?.message).toContain(`Turno #${first.id}`)

    const secondPublish = await publishPlanificacionGastronomia([second.id])
    const afterSecondQueue = await db.select().from(schema.botQueue).orderBy(schema.botQueue.id)

    expect(secondPublish).toMatchObject({ published: 1, skipped: 0 })
    expect(afterSecondQueue).toHaveLength(3)
    expect(afterSecondQueue[0]?.message).toContain('Docks | Planificación')
    expect(afterSecondQueue[1]?.message).toContain(`Turno #${first.id}`)
    expect(afterSecondQueue[2]?.message).toContain(`Turno #${second.id}`)
  })

  it('registers entry with the assigned local from today planning', async () => {
    await initDb()
    const brooklyn = await createEmpleadoGastro({ nombre: 'Ana', sector: 'heladeria', puesto: 'Caja', pagoDiario: 1000 })
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())

    await savePlanificacionTurnoGastronomia({
      empleadoId: brooklyn.id,
      fecha: today,
      trabaja: true,
      horaEntrada: '18:00',
      horaSalida: '00:00',
      sector: 'brooklyn',
      puesto: 'Caja',
    })

    const result = await registerEmpleadoAttendance(brooklyn.id, 'entrada', 'whatsapp')
    const marcaciones = await db.select().from(schema.marcacionesEmpleados).where(eq(schema.marcacionesEmpleados.empleadoId, brooklyn.id))
    const status = await getEmpleadoAttendanceStatus(brooklyn.id)

    expect(result.success).toBe(true)
    expect(marcaciones).toHaveLength(1)
    expect(marcaciones[0]?.localAsignado).toBe('brooklyn')
    expect(status.assignedSector).toBe('brooklyn')
    expect(status.assignedLocalLabel).toBe('Brooklyn')
  })
})
