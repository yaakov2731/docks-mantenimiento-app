import { describe, expect, it } from 'vitest'
import { buildRoundReminderMessage } from './messages'
import { createRoundsService } from './service'

type FakeTemplate = {
  id: number
  intervaloHoras: number
}

type FakeSchedule = {
  id: number
  plantillaId: number
  modoProgramacion: 'semanal' | 'fecha_especial'
  diaSemana?: number
  fechaEspecial?: string
  horaInicio: string
  horaFin: string
  empleadoId: number
  empleadoNombre: string
  empleadoWaId: string
  supervisorWaId: string
}

type FakeOccurrence = {
  id: number
  plantillaId: number
  programacionId: number
  fechaOperativa: string
  programadoAt: Date
  programadoAtLabel?: string
  estado: 'pendiente' | 'en_progreso' | 'pausada' | 'cumplido' | 'cumplido_con_observacion' | 'vencido'
  recordatorioEnviadoAt: Date | null
  confirmadoAt: Date | null
  escaladoAt: Date | null
  inicioRealAt?: Date | null
  pausadoAt?: Date | null
  finRealAt?: Date | null
  tiempoAcumuladoSegundos?: number
  nota?: string | null
  canalConfirmacion?: 'whatsapp' | 'panel' | 'system'
  empleadoId: number
  empleadoNombre: string
  empleadoWaId: string
  responsableProgramadoId?: number | null
  responsableProgramadoNombre?: string | null
  responsableProgramadoWaId?: string | null
  responsableActualId?: number | null
  responsableActualNombre?: string | null
  responsableActualWaId?: string | null
  asignacionEstado?: 'sin_asignar' | 'asignada' | 'en_progreso' | 'completada' | 'vencida'
  asignadoAt?: Date | null
  reasignadoAt?: Date | null
  reasignadoPorUserId?: number | null
  reasignadoPorNombre?: string | null
  supervisorWaId: string
  nombreRonda: string
}

function createFakeRepo(initial: { templates?: FakeTemplate[]; schedules?: FakeSchedule[]; occurrences?: FakeOccurrence[] } = {}) {
  const templates = [...(initial.templates ?? [])]
  const schedules = [...(initial.schedules ?? [])]
  const occurrences = (initial.occurrences ?? []).map((occurrence) => ({
    inicioRealAt: null,
    pausadoAt: null,
    finRealAt: null,
    tiempoAcumuladoSegundos: 0,
    nota: null,
    canalConfirmacion: 'whatsapp' as const,
    ...occurrence,
  }))
  const createdBatches: FakeOccurrence[][] = []
  const reminderMarks: Array<{ id: number; at: Date }> = []
  const overdueMarks: Array<{ id: number }> = []
  const events: Array<{ occurrenceId: number; type: string; at: Date }> = []
  const botMessages: Array<{ waId: string; message: string }> = []
  const supervisorMessages: Array<any> = []

  return {
    templates,
    schedules,
    occurrences,
    createdBatches,
    reminderMarks,
    overdueMarks,
    events,
    botMessages,
    supervisorMessages,
    async listActiveTemplates() {
      return [...templates]
    },
    async listSchedulesForTemplate(templateId: number) {
      return schedules.filter((schedule) => schedule.plantillaId === templateId)
    },
    async listOccurrencesForDate(templateId: number, dateKey: string) {
      return occurrences.filter((occurrence) => occurrence.plantillaId === templateId && occurrence.fechaOperativa === dateKey)
    },
    async createOccurrences(rows: FakeOccurrence[]) {
      const normalizedRows = rows.map((row) => ({
        inicioRealAt: null,
        pausadoAt: null,
        finRealAt: null,
        tiempoAcumuladoSegundos: 0,
        nota: null,
        canalConfirmacion: 'whatsapp' as const,
        ...row,
      }))
      createdBatches.push(normalizedRows.map((row) => ({ ...row })))
      occurrences.push(...normalizedRows.map((row) => ({ ...row })))
    },
    async listReminderCandidates(_now: Date) {
      return occurrences.filter((occurrence) => occurrence.estado === 'pendiente')
    },
    async markReminderSent(id: number, at: Date) {
      reminderMarks.push({ id, at })
      const occurrence = occurrences.find((item) => item.id === id)
      if (occurrence) occurrence.recordatorioEnviadoAt = at
    },
    async markOccurrenceOverdue(id: number) {
      overdueMarks.push({ id })
      const occurrence = occurrences.find((item) => item.id === id)
      if (occurrence) occurrence.estado = 'vencido'
    },
    async addOccurrenceEvent(event: { occurrenceId: number; type: string; at: Date }) {
      events.push(event)
    },
    async enqueueBotMessage(waId: string, message: string) {
      botMessages.push({ waId, message })
    },
    async notifySupervisor(item: any) {
      supervisorMessages.push(item)
    },
    async getOccurrenceById(id: number) {
      return occurrences.find((item) => item.id === id) ?? null
    },
    async getEmpleadoById(id: number) {
      const byOccurrence = occurrences.find((item) =>
        item.responsableActualId === id ||
        item.responsableProgramadoId === id ||
        item.empleadoId === id
      )
      if (!byOccurrence) {
        if (id === 8) {
          return { id: 8, nombre: 'Bea', waId: '5491222222222' }
        }
        return null
      }
      return {
        id,
        nombre: byOccurrence.responsableActualId === id
          ? byOccurrence.responsableActualNombre ?? byOccurrence.empleadoNombre
          : byOccurrence.responsableProgramadoId === id
            ? byOccurrence.responsableProgramadoNombre ?? byOccurrence.empleadoNombre
            : byOccurrence.empleadoNombre,
        waId: byOccurrence.responsableActualId === id
          ? byOccurrence.responsableActualWaId ?? byOccurrence.empleadoWaId
          : byOccurrence.responsableProgramadoId === id
            ? byOccurrence.responsableProgramadoWaId ?? byOccurrence.empleadoWaId
            : byOccurrence.empleadoWaId,
      }
    },
    async markOccurrenceReply(
      id: number,
      estado: 'cumplido' | 'cumplido_con_observacion' | 'vencido',
      nota?: string | null
    ) {
      const occurrence = occurrences.find((item) => item.id === id)
      if (!occurrence) return
      occurrence.estado = estado
      occurrence.nota = nota ?? null
      occurrence.confirmadoAt = new Date()
      occurrence.canalConfirmacion = 'whatsapp'
    },
    async updateOccurrenceLifecycle(
      id: number,
      updates: Partial<FakeOccurrence>
    ) {
      const occurrence = occurrences.find((item) => item.id === id)
      if (!occurrence) throw new Error('Round occurrence not found in fake repo')
      Object.assign(occurrence, updates)
    },
  }
}

describe('rounds orchestration service', () => {
  it('buildRoundReminderMessage matches the WhatsApp contract', () => {
    expect(
      buildRoundReminderMessage({
        occurrenceId: 123,
        nombreRonda: 'Control de banos',
        horaProgramada: '14:00',
      })
    ).toBe(
      [
        '🚻 *Control de banos — Docks del Puerto*',
        '',
        '⏰ Control programado para las *14:00*',
        '',
        'Completá el control y respondé:',
        '✅ 1. Iniciar ronda',
        '⏸️ 2. Pausar ronda',
        '🏁 3. Finalizar ronda',
        '⚠️ 4. Finalizada con observación',
        '❌ 5. No pude realizarla',
        '',
        '🔑 ID control: 123',
      ].join('\n')
    )
  })

  it('creates unique occurrence ids across different dates for the same schedule', async () => {
    const repo = createFakeRepo({
      templates: [{ id: 10, intervaloHoras: 2 }],
      schedules: [
        {
          id: 10,
          plantillaId: 10,
          modoProgramacion: 'fecha_especial',
          fechaEspecial: '2026-04-06',
          horaInicio: '10:00',
          horaFin: '14:00',
          empleadoId: 7,
          empleadoNombre: 'Ana',
          empleadoWaId: '5491111111111',
          supervisorWaId: '5491100000000',
        },
        {
          id: 10,
          plantillaId: 10,
          modoProgramacion: 'fecha_especial',
          fechaEspecial: '2026-04-07',
          horaInicio: '12:00',
          horaFin: '16:00',
          empleadoId: 8,
          empleadoNombre: 'Bea',
          empleadoWaId: '5491222222222',
          supervisorWaId: '5491100000001',
        },
      ],
    })

    const service = createRoundsService(repo)

    const april6 = await service.createDailyOccurrences('2026-04-06')
    const april7 = await service.createDailyOccurrences('2026-04-07')

    expect(april6[0].id).not.toBe(april7[0].id)
    expect(april6[0].programadoAt).toEqual(new Date('2026-04-06T10:00:00-03:00'))
    expect(april6[0].empleadoId).toBe(7)
    expect(april6[0].empleadoWaId).toBe('5491111111111')
    expect(april7[0].programadoAt).toEqual(new Date('2026-04-07T12:00:00-03:00'))
    expect(april7[0].empleadoId).toBe(8)
    expect(april7[0].empleadoWaId).toBe('5491222222222')
  })

  it('createDailyOccurrences creates missing checkpoints only once', async () => {
    const repo = createFakeRepo({
      templates: [{ id: 10, intervaloHoras: 2 }],
      schedules: [
        {
          id: 10,
          plantillaId: 10,
          modoProgramacion: 'fecha_especial',
          fechaEspecial: '2026-04-06',
          horaInicio: '10:00',
          horaFin: '14:00',
          empleadoId: 7,
          empleadoNombre: 'Ana',
          empleadoWaId: '5491111111111',
          supervisorWaId: '5491100000000',
        },
      ],
    })

    const service = createRoundsService(repo)

    const firstRun = await service.createDailyOccurrences('2026-04-06')
    const secondRun = await service.createDailyOccurrences('2026-04-06')

    expect(firstRun.map((occurrence) => occurrence.programadoAt)).toEqual([
      new Date('2026-04-06T10:00:00-03:00'),
      new Date('2026-04-06T12:00:00-03:00'),
    ])
    expect(secondRun).toEqual([])
    expect(repo.createdBatches).toHaveLength(1)
    expect(repo.occurrences).toHaveLength(2)
  })

  it('skips reminder duplicates for already-reminded pending occurrences', async () => {
    const repo = createFakeRepo({
      occurrences: [
        {
          id: 21,
          plantillaId: 10,
          programacionId: 10,
          fechaOperativa: '2026-04-06',
          programadoAt: new Date('2026-04-06T10:00:00-03:00'),
          estado: 'pendiente',
          recordatorioEnviadoAt: new Date('2026-04-06T10:01:00-03:00'),
          confirmadoAt: null,
          escaladoAt: null,
          empleadoId: 7,
          empleadoNombre: 'Ana',
          empleadoWaId: '5491111111111',
          supervisorWaId: '5491100000000',
          nombreRonda: 'Control de banos',
        },
      ],
    })

    const service = createRoundsService(repo)
    const result = await service.runReminderCycle(new Date('2026-04-06T10:10:00-03:00'))

    expect(result).toEqual({ remindersSent: 0, escalationsSent: 0 })
    expect(repo.botMessages).toEqual([])
    expect(repo.reminderMarks).toEqual([])
    expect(repo.overdueMarks).toEqual([])
    expect(repo.events).toEqual([])
  })

  it('runReminderCycle sends a reminder once and escalates overdue candidates without a duplicate reminder', async () => {
    const repo = createFakeRepo({
      occurrences: [
        {
          id: 21,
          plantillaId: 10,
          programacionId: 10,
          fechaOperativa: '2026-04-06',
          programadoAt: new Date('2026-04-06T10:20:00-03:00'),
          estado: 'pendiente',
          recordatorioEnviadoAt: null,
          confirmadoAt: null,
          escaladoAt: null,
          empleadoId: 7,
          empleadoNombre: 'Ana',
          empleadoWaId: '5491111111111',
          supervisorWaId: '5491100000000',
          nombreRonda: 'Control de banos',
        },
        {
          id: 22,
          plantillaId: 10,
          programacionId: 10,
          fechaOperativa: '2026-04-06',
          programadoAt: new Date('2026-04-06T10:00:00-03:00'),
          estado: 'pendiente',
          recordatorioEnviadoAt: new Date('2026-04-06T10:05:00-03:00'),
          confirmadoAt: null,
          escaladoAt: null,
          empleadoId: 7,
          empleadoNombre: 'Ana',
          empleadoWaId: '5491111111111',
          supervisorWaId: '5491100000000',
          nombreRonda: 'Control de banos',
        },
      ],
    })

    const service = createRoundsService(repo)
    const result = await service.runReminderCycle(new Date('2026-04-06T10:20:00-03:00'))

    expect(result).toEqual({
      remindersSent: 1,
      escalationsSent: 1,
    })
    expect(repo.botMessages).toEqual([
      {
        waId: '5491111111111',
        message: buildRoundReminderMessage({
          occurrenceId: 21,
          nombreRonda: 'Control de banos',
          horaProgramada: 'ahora',
        }),
      },
    ])
    expect(repo.reminderMarks).toEqual([{ id: 21, at: new Date('2026-04-06T10:20:00-03:00') }])
    expect(repo.overdueMarks).toEqual([{ id: 22 }])
    expect(repo.supervisorMessages).toEqual([
      expect.objectContaining({
        id: 22,
        nombreRonda: 'Control de banos',
      }),
    ])
    expect(repo.events).toEqual([
      { occurrenceId: 21, type: 'recordatorio', at: new Date('2026-04-06T10:20:00-03:00') },
      { occurrenceId: 22, type: 'vencimiento', at: new Date('2026-04-06T10:20:00-03:00') },
    ])
  })

  it('starts, pauses and finishes a round with real execution timestamps', async () => {
    const repo = createFakeRepo({
      occurrences: [
        {
          id: 44,
          plantillaId: 10,
          programacionId: 10,
          fechaOperativa: '2026-04-06',
          programadoAt: new Date('2026-04-06T10:00:00-03:00'),
          programadoAtLabel: '10:00',
          estado: 'pendiente',
          recordatorioEnviadoAt: new Date('2026-04-06T10:00:00-03:00'),
          confirmadoAt: null,
          escaladoAt: null,
          empleadoId: 7,
          empleadoNombre: 'Ana',
          empleadoWaId: '5491111111111',
          supervisorWaId: '5491100000000',
          nombreRonda: 'Control de banos',
        },
      ],
    })

    const service = createRoundsService(repo as any)

    const started = await service.startOccurrence({ occurrenceId: 44, empleadoId: 7 })
    expect(started.estado).toBe('en_progreso')
    expect(started.inicioRealAt?.toISOString()).toBeTruthy()

    const startedAt = new Date(started.inicioRealAt!)
    const pausedAt = new Date(startedAt.getTime() + 9 * 60 * 1000)
    const finishedAt = new Date(pausedAt.getTime() + 4 * 60 * 1000)

    const paused = await service.pauseOccurrence({ occurrenceId: 44, empleadoId: 7, now: pausedAt })
    expect(paused.estado).toBe('pausada')
    expect(paused.tiempoAcumuladoSegundos).toBe(540)
    expect(paused.pausadoAt?.toISOString()).toBe(pausedAt.toISOString())

    const resumed = await service.startOccurrence({ occurrenceId: 44, empleadoId: 7, now: finishedAt })
    expect(resumed.estado).toBe('en_progreso')
    expect(resumed.tiempoAcumuladoSegundos).toBe(540)
    expect(resumed.inicioRealAt?.toISOString()).toBe(finishedAt.toISOString())

    const closedAt = new Date(finishedAt.getTime() + 6 * 60 * 1000)
    const finished = await service.finishOccurrence({ occurrenceId: 44, empleadoId: 7, now: closedAt })
    expect(finished.estado).toBe('cumplido')
    expect(finished.tiempoAcumuladoSegundos).toBe(900)
    expect(finished.finRealAt?.toISOString()).toBe(closedAt.toISOString())
  })

  it('assigns, reassigns and releases an occurrence preserving accumulated work', async () => {
    const repo = createFakeRepo({
      occurrences: [
        {
          id: 55,
          plantillaId: 10,
          programacionId: 10,
          fechaOperativa: '2026-04-06',
          programadoAt: new Date('2026-04-06T12:00:00-03:00'),
          programadoAtLabel: '12:00',
          estado: 'pausada',
          recordatorioEnviadoAt: new Date('2026-04-06T12:00:00-03:00'),
          confirmadoAt: null,
          escaladoAt: null,
          empleadoId: 7,
          empleadoNombre: 'Ana',
          empleadoWaId: '5491111111111',
          responsableProgramadoId: 7,
          responsableProgramadoNombre: 'Ana',
          responsableProgramadoWaId: '5491111111111',
          responsableActualId: 7,
          responsableActualNombre: 'Ana',
          responsableActualWaId: '5491111111111',
          asignacionEstado: 'en_progreso',
          asignadoAt: new Date('2026-04-06T11:55:00-03:00'),
          tiempoAcumuladoSegundos: 720,
          pausadoAt: new Date('2026-04-06T12:10:00-03:00'),
          supervisorWaId: '5491100000000',
          nombreRonda: 'Control de banos',
        },
      ],
    })

    const service = createRoundsService(repo as any)

    const reassigned = await service.assignOccurrence({
      occurrenceId: 55,
      empleadoId: 8,
      actor: { id: 1, name: 'Gerente' },
      now: new Date('2026-04-06T12:20:00-03:00'),
    })
    expect(reassigned.responsableActualId).toBe(8)
    expect(reassigned.empleadoId).toBe(8)
    expect(reassigned.asignacionEstado).toBe('asignada')
    expect(reassigned.tiempoAcumuladoSegundos).toBe(720)

    const released = await service.releaseOccurrence({
      occurrenceId: 55,
      actor: { id: 1, name: 'Gerente' },
      now: new Date('2026-04-06T12:25:00-03:00'),
    })
    expect(released.responsableActualId).toBeNull()
    expect(released.asignacionEstado).toBe('sin_asignar')
    expect(released.tiempoAcumuladoSegundos).toBe(720)
  })

  it('rejects lifecycle actions from a previous round owner after reassignment', async () => {
    const repo = createFakeRepo({
      occurrences: [
        {
          id: 56,
          plantillaId: 10,
          programacionId: 10,
          fechaOperativa: '2026-04-06',
          programadoAt: new Date('2026-04-06T13:00:00-03:00'),
          estado: 'pendiente',
          recordatorioEnviadoAt: null,
          confirmadoAt: null,
          escaladoAt: null,
          empleadoId: 8,
          empleadoNombre: 'Bea',
          empleadoWaId: '5491222222222',
          responsableProgramadoId: 7,
          responsableProgramadoNombre: 'Ana',
          responsableProgramadoWaId: '5491111111111',
          responsableActualId: 8,
          responsableActualNombre: 'Bea',
          responsableActualWaId: '5491222222222',
          asignacionEstado: 'asignada',
          supervisorWaId: '5491100000000',
          nombreRonda: 'Control de banos',
        },
      ],
    })

    const service = createRoundsService(repo as any)

    await expect(service.startOccurrence({ occurrenceId: 56, empleadoId: 7 })).rejects.toThrow(
      'Round occurrence does not belong to employee'
    )
    await expect(service.finishOccurrence({ occurrenceId: 56, empleadoId: 7 })).rejects.toThrow(
      'Round occurrence does not belong to employee'
    )
  })
})
