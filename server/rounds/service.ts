import { buildOccurrencesForDate, pickScheduleForDate, resolveOccurrenceState, type RoundSchedule } from './engine'
import { buildRoundReminderMessage } from './messages'

export type RoundScheduleRecord = {
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

export type RoundOccurrenceRecord = {
  id: number
  plantillaId: number
  programacionId: number
  fechaOperativa: string
  programadoAt: Date
  programadoAtLabel?: string
  estado: 'pendiente' | 'en_progreso' | 'pausada' | 'cumplido' | 'cumplido_con_observacion' | 'vencido' | 'cancelado'
  recordatorioEnviadoAt: Date | null
  confirmadoAt: Date | null
  escaladoAt: Date | null
  inicioRealAt?: Date | null
  pausadoAt?: Date | null
  finRealAt?: Date | null
  tiempoAcumuladoSegundos?: number
  nota?: string | null
  canalConfirmacion?: 'whatsapp' | 'panel' | 'system'
  responsableProgramadoId?: number
  responsableProgramadoNombre?: string
  responsableProgramadoWaId?: string
  responsableActualId?: number | null
  responsableActualNombre?: string | null
  responsableActualWaId?: string | null
  asignacionEstado?: 'sin_asignar' | 'asignada' | 'en_progreso' | 'completada' | 'vencida'
  empleadoId: number
  empleadoNombre: string
  empleadoWaId: string
  supervisorWaId: string
  nombreRonda: string
}

export type RoundRepository = {
  listActiveTemplates(): Promise<Array<{ id: number; intervaloHoras: number }>>
  listSchedulesForTemplate(templateId: number): Promise<RoundScheduleRecord[]>
  listOccurrencesForDate(templateId: number, dateKey: string): Promise<RoundOccurrenceRecord[]>
  createOccurrences(rows: RoundOccurrenceRecord[]): Promise<void>
  listReminderCandidates(now: Date): Promise<RoundOccurrenceRecord[]>
  markReminderSent(id: number, at: Date): Promise<void>
  markOccurrenceOverdue(id: number): Promise<void>
  addOccurrenceEvent(event: {
    occurrenceId: number
    type: 'recordatorio' | 'confirmacion' | 'observacion' | 'vencimiento' | 'escalacion' | 'admin_update' | 'asignacion' | 'reasignacion' | 'liberacion'
    at: Date
    actorType?: 'system' | 'employee' | 'admin'
    actorId?: number | null
    actorName?: string | null
    description?: string
    metadata?: Record<string, unknown> | null
  }): Promise<void>
  enqueueBotMessage(waId: string, message: string): Promise<void>
  notifySupervisor(item: any): Promise<void>
  getOccurrenceById?(id: number): Promise<RoundOccurrenceRecord | null>
  markOccurrenceReply?(
    id: number,
    estado: 'cumplido' | 'cumplido_con_observacion' | 'vencido',
    nota?: string | null
  ): Promise<void>
  updateOccurrenceLifecycle?(
    id: number,
    updates: Partial<RoundOccurrenceRecord>
  ): Promise<void>
  updateOccurrenceAssignment?(
    id: number,
    updates: Partial<RoundOccurrenceRecord>
  ): Promise<void>
}

type EngineSchedule = RoundSchedule & {
  record: RoundScheduleRecord
}

export function createRoundsService(repo: RoundRepository) {
  return {
    async createDailyOccurrences(dateKey: string) {
      const templates = await repo.listActiveTemplates()
      const created: RoundOccurrenceRecord[] = []

      for (const template of templates) {
        const schedules = await repo.listSchedulesForTemplate(template.id)
        const selectedSchedule = pickScheduleForDate(dateKey, toEngineSchedules(schedules)) as EngineSchedule | undefined
        if (!selectedSchedule) continue

        const existing = await repo.listOccurrencesForDate(template.id, dateKey)
        const existingKeys = new Set(existing.map((occurrence) => occurrence.programadoAt.getTime()))

        const rows = buildOccurrencesForDate({
          plantillaId: String(template.id),
          programacionId: selectedSchedule.id,
          fechaOperativa: dateKey,
          horaInicio: selectedSchedule.record.horaInicio,
          horaFin: selectedSchedule.record.horaFin,
          intervaloHoras: template.intervaloHoras,
          empleadoId: selectedSchedule.record.empleadoId,
          empleadoNombre: selectedSchedule.record.empleadoNombre,
        })
          .filter((occurrence) => !existingKeys.has(new Date(occurrence.programadoAtIso).getTime()))
          .map((occurrence) => ({
            id: buildOccurrenceId(template.id, selectedSchedule.record.id, occurrence.programadoAtIso),
            plantillaId: template.id,
            programacionId: selectedSchedule.record.id,
            fechaOperativa: dateKey,
            programadoAt: new Date(occurrence.programadoAtIso),
            programadoAtLabel: toTimeLabel(occurrence.programadoAtIso),
            estado: 'pendiente' as const,
            recordatorioEnviadoAt: null,
            confirmadoAt: null,
            escaladoAt: null,
            inicioRealAt: null,
            pausadoAt: null,
            finRealAt: null,
            tiempoAcumuladoSegundos: 0,
            responsableProgramadoId: selectedSchedule.record.empleadoId,
            responsableProgramadoNombre: selectedSchedule.record.empleadoNombre,
            responsableProgramadoWaId: selectedSchedule.record.empleadoWaId,
            responsableActualId: selectedSchedule.record.empleadoId,
            responsableActualNombre: selectedSchedule.record.empleadoNombre,
            responsableActualWaId: selectedSchedule.record.empleadoWaId,
            asignacionEstado: 'asignada' as const,
            empleadoId: selectedSchedule.record.empleadoId,
            empleadoNombre: selectedSchedule.record.empleadoNombre,
            empleadoWaId: selectedSchedule.record.empleadoWaId,
            supervisorWaId: selectedSchedule.record.supervisorWaId,
            nombreRonda: 'Control de banos',
          }))

        if (rows.length > 0) {
          await repo.createOccurrences(rows)
          created.push(...rows)
        }
      }

      return created
    },

    async runReminderCycle(now = new Date()) {
      const candidates = await repo.listReminderCandidates(now)
      let remindersSent = 0
      let escalationsSent = 0

      for (const item of candidates) {
        const state = resolveOccurrenceState({
          programadoAtIso: item.programadoAt.toISOString(),
          recordatorioEnviadoAtIso: item.recordatorioEnviadoAt ? item.recordatorioEnviadoAt.toISOString() : null,
          confirmadoAtIso: item.confirmadoAt ? item.confirmadoAt.toISOString() : null,
          nowIso: now.toISOString(),
        })

        if (state === 'vencido') {
          await repo.markOccurrenceOverdue(item.id)
          await repo.notifySupervisor(item)
          await repo.addOccurrenceEvent({
            occurrenceId: item.id,
            type: 'vencimiento',
            at: now,
          })
          escalationsSent += 1
          continue
        }

        if (item.recordatorioEnviadoAt) continue

        const targetWaId = item.responsableActualWaId ?? item.empleadoWaId
        if (!targetWaId) continue

        await repo.enqueueBotMessage(
          targetWaId,
          buildRoundReminderMessage({
            occurrenceId: item.id,
            nombreRonda: item.nombreRonda ?? 'Control de banos',
            horaProgramada: item.programadoAtLabel ?? 'ahora',
          })
        )
        await repo.markReminderSent(item.id, now)
        await repo.addOccurrenceEvent({
          occurrenceId: item.id,
          type: 'recordatorio',
          at: now,
        })
        remindersSent += 1
      }

      return { remindersSent, escalationsSent }
    },

    async registerWhatsappReply(input: {
      occurrenceId: number
      empleadoId: number
      option: '1' | '2' | '3'
      note?: string
    }) {
      if (!repo.getOccurrenceById || !repo.markOccurrenceReply) {
        throw new Error('Round repository does not support WhatsApp replies')
      }

      const occurrence = await repo.getOccurrenceById(input.occurrenceId)
      if (!occurrence) throw new Error('Round occurrence not found')
      assertCurrentRoundOwner(occurrence, input.empleadoId)
      if (occurrence.estado !== 'pendiente') throw new Error('Round occurrence is no longer pending')

      const note = normalizeNote(input.note)
      const resolved = resolveReplyOption(input.option, note)
      const now = new Date()

      await repo.markOccurrenceReply(input.occurrenceId, resolved.estado, resolved.note)
      await repo.addOccurrenceEvent({
        occurrenceId: input.occurrenceId,
        type: resolved.eventType,
        at: now,
        actorType: 'employee',
        actorId: input.empleadoId,
        actorName: occurrence.responsableActualNombre ?? occurrence.empleadoNombre,
        description: resolved.description,
        metadata: {
          source: 'whatsapp-reply',
          option: input.option,
          note: resolved.note,
        },
      })

      return {
        ...occurrence,
        estado: resolved.estado,
        nota: resolved.note,
        canalConfirmacion: 'whatsapp' as const,
        confirmadoAt: now,
      }
    },

    async startOccurrence(input: { occurrenceId: number; empleadoId: number; now?: Date }) {
      if (!repo.getOccurrenceById || !repo.updateOccurrenceLifecycle) {
        throw new Error('Round repository does not support lifecycle updates')
      }

      const occurrence = await ensureOccurrence(repo, input.occurrenceId)
      assertCurrentRoundOwner(occurrence, input.empleadoId)
      if (!occurrence.responsableActualId) throw new Error('Round occurrence has no current assignee')
      if (occurrence.estado !== 'pendiente' && occurrence.estado !== 'pausada') {
        throw new Error('Round occurrence cannot be started from its current state')
      }

      const now = input.now ?? new Date()
      const resumed = occurrence.estado === 'pausada'

      await repo.updateOccurrenceLifecycle(input.occurrenceId, {
        estado: 'en_progreso',
        inicioRealAt: now,
        pausadoAt: null,
        asignacionEstado: 'en_progreso',
      })
      await repo.addOccurrenceEvent({
        occurrenceId: input.occurrenceId,
        type: 'confirmacion',
        at: now,
        actorType: 'employee',
        actorId: input.empleadoId,
        actorName: occurrence.responsableActualNombre ?? occurrence.empleadoNombre,
        description: resumed ? 'Ronda reanudada' : 'Ronda iniciada',
        metadata: { source: resumed ? 'round-resume' : 'round-start' },
      })

      return {
        ...occurrence,
        estado: 'en_progreso' as const,
        inicioRealAt: now,
        pausadoAt: null,
        asignacionEstado: 'en_progreso' as const,
      }
    },

    async pauseOccurrence(input: { occurrenceId: number; empleadoId: number; now?: Date }) {
      if (!repo.getOccurrenceById || !repo.updateOccurrenceLifecycle) {
        throw new Error('Round repository does not support lifecycle updates')
      }

      const occurrence = await ensureOccurrence(repo, input.occurrenceId)
      assertCurrentRoundOwner(occurrence, input.empleadoId)
      if (occurrence.estado !== 'en_progreso') {
        throw new Error('Round occurrence is not in progress')
      }

      const now = input.now ?? new Date()
      const accumulated = getRoundWorkedSeconds(occurrence, now)

      await repo.updateOccurrenceLifecycle(input.occurrenceId, {
        estado: 'pausada',
        inicioRealAt: null,
        pausadoAt: now,
        tiempoAcumuladoSegundos: accumulated,
        asignacionEstado: 'en_progreso',
      })
      await repo.addOccurrenceEvent({
        occurrenceId: input.occurrenceId,
        type: 'admin_update',
        at: now,
        actorType: 'employee',
        actorId: input.empleadoId,
        actorName: occurrence.responsableActualNombre ?? occurrence.empleadoNombre,
        description: 'Ronda pausada',
        metadata: { source: 'round-pause' },
      })

      return {
        ...occurrence,
        estado: 'pausada' as const,
        inicioRealAt: null,
        pausadoAt: now,
        tiempoAcumuladoSegundos: accumulated,
        asignacionEstado: 'en_progreso' as const,
      }
    },

    async finishOccurrence(input: { occurrenceId: number; empleadoId: number; now?: Date; note?: string }) {
      if (!repo.getOccurrenceById || !repo.updateOccurrenceLifecycle) {
        throw new Error('Round repository does not support lifecycle updates')
      }

      const occurrence = await ensureOccurrence(repo, input.occurrenceId)
      assertCurrentRoundOwner(occurrence, input.empleadoId)
      if (occurrence.estado !== 'en_progreso' && occurrence.estado !== 'pausada') {
        throw new Error('Round occurrence cannot be finished from its current state')
      }

      const now = input.now ?? new Date()
      const accumulated = occurrence.estado === 'en_progreso'
        ? getRoundWorkedSeconds(occurrence, now)
        : Number(occurrence.tiempoAcumuladoSegundos ?? 0)
      const note = normalizeNote(input.note)

      await repo.updateOccurrenceLifecycle(input.occurrenceId, {
        estado: 'cumplido',
        inicioRealAt: null,
        pausadoAt: null,
        finRealAt: now,
        tiempoAcumuladoSegundos: accumulated,
        confirmadoAt: now,
        canalConfirmacion: 'whatsapp',
        nota: note,
        asignacionEstado: 'completada',
      })
      await repo.addOccurrenceEvent({
        occurrenceId: input.occurrenceId,
        type: 'confirmacion',
        at: now,
        actorType: 'employee',
        actorId: input.empleadoId,
        actorName: occurrence.responsableActualNombre ?? occurrence.empleadoNombre,
        description: note ? `Ronda finalizada: ${note}` : 'Ronda finalizada',
        metadata: { source: 'round-finish' },
      })

      return {
        ...occurrence,
        estado: 'cumplido' as const,
        inicioRealAt: null,
        pausadoAt: null,
        finRealAt: now,
        tiempoAcumuladoSegundos: accumulated,
        confirmadoAt: now,
        canalConfirmacion: 'whatsapp' as const,
        nota: note,
        asignacionEstado: 'completada' as const,
      }
    },

    async reassignOccurrence(input: {
      occurrenceId: number
      adminUserId: number
      adminUserName: string
      empleadoId: number
      empleadoNombre: string
      empleadoWaId: string
    }) {
      if (!repo.getOccurrenceById || !repo.updateOccurrenceAssignment) {
        throw new Error('Round repository does not support assignment updates')
      }

      const occurrence = await ensureOccurrence(repo, input.occurrenceId)
      assertOccurrenceOpenForAssignment(occurrence)
      const nextAssignmentState = deriveAssignmentStateForOpenOccurrence(occurrence)

      await repo.updateOccurrenceAssignment(input.occurrenceId, {
        responsableActualId: input.empleadoId,
        responsableActualNombre: input.empleadoNombre,
        responsableActualWaId: input.empleadoWaId,
        asignacionEstado: nextAssignmentState,
      })
      await repo.addOccurrenceEvent({
        occurrenceId: input.occurrenceId,
        type: 'reasignacion',
        at: new Date(),
        actorType: 'admin',
        actorId: input.adminUserId,
        actorName: input.adminUserName,
        description: `Ronda reasignada a ${input.empleadoNombre}`,
        metadata: {
          source: 'panel_admin',
          previousEmployeeId: occurrence.responsableActualId ?? occurrence.empleadoId,
          nextEmployeeId: input.empleadoId,
        },
      })

      return ensureOccurrence(repo, input.occurrenceId)
    },

    async releaseOccurrence(input: {
      occurrenceId: number
      adminUserId: number
      adminUserName: string
    }) {
      if (!repo.getOccurrenceById || !repo.updateOccurrenceAssignment) {
        throw new Error('Round repository does not support assignment updates')
      }

      const occurrence = await ensureOccurrence(repo, input.occurrenceId)
      assertOccurrenceOpenForAssignment(occurrence)

      await repo.updateOccurrenceAssignment(input.occurrenceId, {
        responsableActualId: null,
        responsableActualNombre: null,
        responsableActualWaId: null,
        asignacionEstado: 'sin_asignar',
      })
      await repo.addOccurrenceEvent({
        occurrenceId: input.occurrenceId,
        type: 'liberacion',
        at: new Date(),
        actorType: 'admin',
        actorId: input.adminUserId,
        actorName: input.adminUserName,
        description: 'Ronda liberada para reasignacion',
        metadata: { source: 'panel_admin' },
      })

      return ensureOccurrence(repo, input.occurrenceId)
    },
  }
}

function toEngineSchedules(schedules: RoundScheduleRecord[]): EngineSchedule[] {
  return schedules.map((schedule) => ({
    id: String(schedule.id),
    modoProgramacion: schedule.modoProgramacion,
    diaSemana: schedule.diaSemana,
    fechaEspecial: schedule.fechaEspecial,
    horaInicio: schedule.horaInicio,
    horaFin: schedule.horaFin,
    intervaloHoras: 1,
    record: schedule,
  }))
}

function buildOccurrenceId(templateId: number, scheduleId: number, programadoAtIso: string) {
  let hash = 17
  const source = `${templateId}|${scheduleId}|${programadoAtIso}`

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0
  }

  return hash
}

function toTimeLabel(programadoAtIso: string) {
  return programadoAtIso.slice(11, 16)
}

function normalizeNote(note?: string) {
  const trimmed = note?.trim()
  return trimmed ? trimmed : null
}

async function ensureOccurrence(repo: RoundRepository, occurrenceId: number) {
  if (!repo.getOccurrenceById) throw new Error('Round repository does not support occurrence lookups')
  const occurrence = await repo.getOccurrenceById(occurrenceId)
  if (!occurrence) throw new Error('Round occurrence not found')
  return occurrence
}

function assertCurrentRoundOwner(occurrence: RoundOccurrenceRecord, empleadoId: number) {
  const currentOwnerId = occurrence.responsableActualId ?? occurrence.empleadoId
  if (currentOwnerId !== empleadoId) {
    throw new Error('Round occurrence does not belong to current employee')
  }
}

function assertOccurrenceOpenForAssignment(occurrence: RoundOccurrenceRecord) {
  if (occurrence.estado === 'cumplido' || occurrence.estado === 'cumplido_con_observacion' || occurrence.estado === 'cancelado') {
    throw new Error('Round occurrence is already closed')
  }
}

function deriveAssignmentStateForOpenOccurrence(occurrence: RoundOccurrenceRecord) {
  if (occurrence.estado === 'en_progreso' || occurrence.estado === 'pausada') return 'en_progreso' as const
  if (occurrence.estado === 'vencido') return 'vencida' as const
  return 'asignada' as const
}

function resolveReplyOption(option: '1' | '2' | '3', note: string | null) {
  switch (option) {
    case '1':
      return {
        estado: 'cumplido' as const,
        eventType: 'confirmacion' as const,
        note: note ?? null,
        description: 'Control confirmado vía WhatsApp',
      }
    case '2':
      return {
        estado: 'cumplido_con_observacion' as const,
        eventType: 'observacion' as const,
        note,
        description: note
          ? `Control confirmado con observación: ${note}`
          : 'Control confirmado con observación vía WhatsApp',
      }
    case '3':
      return {
        estado: 'vencido' as const,
        eventType: 'vencimiento' as const,
        note,
        description: note
          ? `Empleado indicó que no pudo revisar: ${note}`
          : 'Empleado indicó que no pudo revisar el control',
      }
    default:
      throw new Error(`Unsupported WhatsApp reply option: ${option}`)
  }
}

function getRoundWorkedSeconds(
  occurrence: Pick<RoundOccurrenceRecord, 'tiempoAcumuladoSegundos' | 'inicioRealAt'>,
  now: Date
) {
  const accumulated = Number(occurrence.tiempoAcumuladoSegundos ?? 0)
  if (!occurrence.inicioRealAt) return accumulated
  const startedAt = occurrence.inicioRealAt instanceof Date
    ? occurrence.inicioRealAt.getTime()
    : new Date(occurrence.inicioRealAt).getTime()
  const additional = Math.max(0, Math.floor((now.getTime() - startedAt) / 1000))
  return accumulated + additional
}
