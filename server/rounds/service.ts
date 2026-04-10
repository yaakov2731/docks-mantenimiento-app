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
  estado: 'pendiente' | 'cumplido' | 'cumplido_con_observacion' | 'vencido' | 'cancelado'
  recordatorioEnviadoAt: Date | null
  confirmadoAt: Date | null
  escaladoAt: Date | null
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
    type: 'recordatorio' | 'confirmacion' | 'observacion' | 'vencimiento' | 'escalacion' | 'admin_update'
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

        await repo.enqueueBotMessage(
          item.empleadoWaId,
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
      if (occurrence.empleadoId !== input.empleadoId) throw new Error('Round occurrence does not belong to employee')
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
        actorName: occurrence.empleadoNombre,
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
