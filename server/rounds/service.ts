import { buildOccurrencesForDate, pickScheduleForDate, resolveOccurrenceState, type RoundSchedule } from './engine'
import { buildRoundReminderMessage, buildRoundAssignmentMessage } from './messages'

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
  getEmpleadoById?(id: number): Promise<{ id: number; nombre: string; waId?: string | null } | null>
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
            responsableProgramadoId: selectedSchedule.record.empleadoId,
            responsableProgramadoNombre: selectedSchedule.record.empleadoNombre,
            responsableProgramadoWaId: selectedSchedule.record.empleadoWaId,
            responsableActualId: selectedSchedule.record.empleadoId,
            responsableActualNombre: selectedSchedule.record.empleadoNombre,
            responsableActualWaId: selectedSchedule.record.empleadoWaId,
            asignacionEstado: 'asignada' as const,
            asignadoAt: new Date(occurrence.programadoAtIso),
            reasignadoAt: null,
            reasignadoPorUserId: null,
            reasignadoPorNombre: null,
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
          getCurrentResponsibleWaId(item),
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

    async assignOccurrence(input: {
      occurrenceId: number
      empleadoId: number
      actor: { id?: number | null; name: string }
      now?: Date
    }) {
      if (!repo.getOccurrenceById || !repo.updateOccurrenceLifecycle || !repo.getEmpleadoById) {
        throw new Error('Round repository does not support assignment updates')
      }

      const occurrence = await repo.getOccurrenceById(input.occurrenceId)
      if (!occurrence) throw new Error('Round occurrence not found')
      assertRoundCanBeReassigned(occurrence)

      const empleado = await repo.getEmpleadoById(input.empleadoId)
      if (!empleado) throw new Error('Empleado no encontrado')

      const now = input.now ?? new Date()
      const nextAssignmentState = occurrence.estado === 'en_progreso'
        ? 'en_progreso'
        : 'asignada'
      const isReassignment = getCurrentResponsibleId(occurrence) !== null

      await repo.updateOccurrenceLifecycle(input.occurrenceId, {
        responsableActualId: empleado.id,
        responsableActualNombre: empleado.nombre,
        responsableActualWaId: empleado.waId ?? null,
        empleadoId: empleado.id,
        empleadoNombre: empleado.nombre,
        empleadoWaId: empleado.waId ?? '',
        asignacionEstado: nextAssignmentState,
        asignadoAt: occurrence.asignadoAt ?? now,
        reasignadoAt: isReassignment ? now : occurrence.reasignadoAt ?? null,
        reasignadoPorUserId: isReassignment ? input.actor.id ?? null : occurrence.reasignadoPorUserId ?? null,
        reasignadoPorNombre: isReassignment ? input.actor.name : occurrence.reasignadoPorNombre ?? null,
      })
      await repo.addOccurrenceEvent({
        occurrenceId: input.occurrenceId,
        type: isReassignment ? 'reasignacion' : 'asignacion',
        at: now,
        actorType: 'admin',
        actorId: input.actor.id ?? null,
        actorName: input.actor.name,
        description: isReassignment
          ? `Ronda reasignada a ${empleado.nombre}`
          : `Ronda asignada a ${empleado.nombre}`,
        metadata: {
          source: 'admin-assignment',
          action: isReassignment ? 'reasignacion' : 'asignacion',
          previousResponsibleId: getCurrentResponsibleId(occurrence),
          nextResponsibleId: empleado.id,
        },
      })

      // Notificar al empleado por WhatsApp si tiene waId
      if (empleado.waId) {
        await repo.enqueueBotMessage(
          empleado.waId,
          buildRoundAssignmentMessage({
            occurrenceId: input.occurrenceId,
            nombreRonda: occurrence.nombreRonda ?? 'Control operativo',
            horaProgramada: occurrence.programadoAtLabel ?? 'horario programado',
            asignadoPor: input.actor.name,
          })
        )
      }

      return {
        ...occurrence,
        responsableActualId: empleado.id,
        responsableActualNombre: empleado.nombre,
        responsableActualWaId: empleado.waId ?? null,
        empleadoId: empleado.id,
        empleadoNombre: empleado.nombre,
        empleadoWaId: empleado.waId ?? '',
        asignacionEstado: nextAssignmentState,
        asignadoAt: occurrence.asignadoAt ?? now,
        reasignadoAt: isReassignment ? now : occurrence.reasignadoAt ?? null,
        reasignadoPorUserId: isReassignment ? input.actor.id ?? null : occurrence.reasignadoPorUserId ?? null,
        reasignadoPorNombre: isReassignment ? input.actor.name : occurrence.reasignadoPorNombre ?? null,
      }
    },

    async releaseOccurrence(input: {
      occurrenceId: number
      actor: { id?: number | null; name: string }
      now?: Date
    }) {
      if (!repo.getOccurrenceById || !repo.updateOccurrenceLifecycle) {
        throw new Error('Round repository does not support assignment updates')
      }

      const occurrence = await repo.getOccurrenceById(input.occurrenceId)
      if (!occurrence) throw new Error('Round occurrence not found')
      assertRoundCanBeReassigned(occurrence)

      const now = input.now ?? new Date()
      await repo.updateOccurrenceLifecycle(input.occurrenceId, {
        responsableActualId: null,
        responsableActualNombre: null,
        responsableActualWaId: null,
        empleadoId: 0,
        empleadoNombre: 'Sin asignar',
        empleadoWaId: '',
        asignacionEstado: 'sin_asignar',
        reasignadoAt: now,
        reasignadoPorUserId: input.actor.id ?? null,
        reasignadoPorNombre: input.actor.name,
      })
      await repo.addOccurrenceEvent({
        occurrenceId: input.occurrenceId,
        type: 'liberacion',
        at: now,
        actorType: 'admin',
        actorId: input.actor.id ?? null,
        actorName: input.actor.name,
        description: 'Ronda liberada para reasignación',
        metadata: {
          source: 'admin-assignment',
          action: 'liberacion',
          previousResponsibleId: getCurrentResponsibleId(occurrence),
        },
      })

      return {
        ...occurrence,
        responsableActualId: null,
        responsableActualNombre: null,
        responsableActualWaId: null,
        empleadoId: 0,
        empleadoNombre: 'Sin asignar',
        empleadoWaId: '',
        asignacionEstado: 'sin_asignar' as const,
        reasignadoAt: now,
        reasignadoPorUserId: input.actor.id ?? null,
        reasignadoPorNombre: input.actor.name,
      }
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
      if (getCurrentResponsibleId(occurrence) !== input.empleadoId) throw new Error('Round occurrence does not belong to employee')
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

    async startOccurrence(input: { occurrenceId: number; empleadoId: number; now?: Date }) {
      if (!repo.getOccurrenceById || !repo.updateOccurrenceLifecycle) {
        throw new Error('Round repository does not support lifecycle updates')
      }

      const occurrence = await repo.getOccurrenceById(input.occurrenceId)
      if (!occurrence) throw new Error('Round occurrence not found')
      if (getCurrentResponsibleId(occurrence) !== input.empleadoId) throw new Error('Round occurrence does not belong to employee')
      if (occurrence.estado !== 'pendiente' && occurrence.estado !== 'pausada') {
        throw new Error('Round occurrence cannot be started from its current state')
      }

      const now = input.now ?? new Date()
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
        actorName: getCurrentResponsibleName(occurrence),
        description: occurrence.estado === 'pausada' ? 'Ronda reanudada' : 'Ronda iniciada',
        metadata: { source: 'round-start' },
      })

      return {
        ...occurrence,
        estado: 'en_progreso' as const,
        inicioRealAt: now,
        pausadoAt: null,
        tiempoAcumuladoSegundos: Number(occurrence.tiempoAcumuladoSegundos ?? 0),
      }
    },

    async pauseOccurrence(input: { occurrenceId: number; empleadoId: number; now?: Date }) {
      if (!repo.getOccurrenceById || !repo.updateOccurrenceLifecycle) {
        throw new Error('Round repository does not support lifecycle updates')
      }

      const occurrence = await repo.getOccurrenceById(input.occurrenceId)
      if (!occurrence) throw new Error('Round occurrence not found')
      if (getCurrentResponsibleId(occurrence) !== input.empleadoId) throw new Error('Round occurrence does not belong to employee')
      if (occurrence.estado !== 'en_progreso') {
        throw new Error('Round occurrence is not in progress')
      }

      const now = input.now ?? new Date()
      const accumulated = getRoundWorkedSeconds(occurrence, now)
      await repo.updateOccurrenceLifecycle(input.occurrenceId, {
        estado: 'pausada',
        tiempoAcumuladoSegundos: accumulated,
        inicioRealAt: null,
        pausadoAt: now,
      })
      await repo.addOccurrenceEvent({
        occurrenceId: input.occurrenceId,
        type: 'admin_update',
        at: now,
        actorType: 'employee',
        actorId: input.empleadoId,
        actorName: getCurrentResponsibleName(occurrence),
        description: 'Ronda pausada',
        metadata: { source: 'round-pause' },
      })

      return {
        ...occurrence,
        estado: 'pausada' as const,
        tiempoAcumuladoSegundos: accumulated,
        inicioRealAt: null,
        pausadoAt: now,
      }
    },

    async finishOccurrence(input: { occurrenceId: number; empleadoId: number; now?: Date; note?: string }) {
      if (!repo.getOccurrenceById || !repo.updateOccurrenceLifecycle) {
        throw new Error('Round repository does not support lifecycle updates')
      }

      const occurrence = await repo.getOccurrenceById(input.occurrenceId)
      if (!occurrence) throw new Error('Round occurrence not found')
      if (getCurrentResponsibleId(occurrence) !== input.empleadoId) throw new Error('Round occurrence does not belong to employee')
      if (occurrence.estado !== 'en_progreso' && occurrence.estado !== 'pausada') {
        throw new Error('Round occurrence cannot be finished from its current state')
      }

      const now = input.now ?? new Date()
      const accumulated = occurrence.estado === 'en_progreso'
        ? getRoundWorkedSeconds(occurrence, now)
        : Number(occurrence.tiempoAcumuladoSegundos ?? 0)

      await repo.updateOccurrenceLifecycle(input.occurrenceId, {
        estado: 'cumplido',
        tiempoAcumuladoSegundos: accumulated,
        inicioRealAt: null,
        pausadoAt: null,
        finRealAt: now,
        confirmadoAt: now,
        canalConfirmacion: 'whatsapp',
        nota: normalizeNote(input.note),
        asignacionEstado: 'completada',
      })
      await repo.addOccurrenceEvent({
        occurrenceId: input.occurrenceId,
        type: 'confirmacion',
        at: now,
        actorType: 'employee',
        actorId: input.empleadoId,
        actorName: getCurrentResponsibleName(occurrence),
        description: input.note?.trim()
          ? `Ronda finalizada: ${input.note.trim()}`
          : 'Ronda finalizada',
        metadata: { source: 'round-finish' },
      })

      return {
        ...occurrence,
        estado: 'cumplido' as const,
        tiempoAcumuladoSegundos: accumulated,
        inicioRealAt: null,
        pausadoAt: null,
        finRealAt: now,
        confirmadoAt: now,
        canalConfirmacion: 'whatsapp' as const,
        nota: normalizeNote(input.note),
      }
    },

    async reportObservation(input: { occurrenceId: number; empleadoId: number; note?: string; now?: Date }) {
      if (!repo.getOccurrenceById || !repo.updateOccurrenceLifecycle) {
        throw new Error('Round repository does not support lifecycle updates')
      }

      const occurrence = await repo.getOccurrenceById(input.occurrenceId)
      if (!occurrence) throw new Error('Round occurrence not found')
      if (getCurrentResponsibleId(occurrence) !== input.empleadoId) throw new Error('Round occurrence does not belong to employee')

      const now = input.now ?? new Date()
      const accumulated = occurrence.estado === 'en_progreso'
        ? getRoundWorkedSeconds(occurrence, now)
        : Number(occurrence.tiempoAcumuladoSegundos ?? 0)
      const note = normalizeNote(input.note)

      await repo.updateOccurrenceLifecycle(input.occurrenceId, {
        estado: 'cumplido_con_observacion',
        tiempoAcumuladoSegundos: accumulated,
        inicioRealAt: null,
        pausadoAt: null,
        finRealAt: now,
        confirmadoAt: now,
        canalConfirmacion: 'whatsapp',
        nota: note,
        asignacionEstado: 'completada',
      })
      await repo.addOccurrenceEvent({
        occurrenceId: input.occurrenceId,
        type: 'observacion',
        at: now,
        actorType: 'employee',
        actorId: input.empleadoId,
        actorName: getCurrentResponsibleName(occurrence),
        description: note
          ? `Ronda finalizada con observacion: ${note}`
          : 'Ronda finalizada con observacion',
        metadata: { source: 'round-observation', note },
      })

      return {
        ...occurrence,
        estado: 'cumplido_con_observacion' as const,
        tiempoAcumuladoSegundos: accumulated,
        inicioRealAt: null,
        pausadoAt: null,
        finRealAt: now,
        confirmadoAt: now,
        canalConfirmacion: 'whatsapp' as const,
        nota: note,
      }
    },

    async markUnableToComplete(input: { occurrenceId: number; empleadoId: number; note?: string; now?: Date }) {
      if (!repo.getOccurrenceById || !repo.updateOccurrenceLifecycle) {
        throw new Error('Round repository does not support lifecycle updates')
      }

      const occurrence = await repo.getOccurrenceById(input.occurrenceId)
      if (!occurrence) throw new Error('Round occurrence not found')
      if (getCurrentResponsibleId(occurrence) !== input.empleadoId) throw new Error('Round occurrence does not belong to employee')

      const now = input.now ?? new Date()
      const note = normalizeNote(input.note)
      const accumulated = occurrence.estado === 'en_progreso'
        ? getRoundWorkedSeconds(occurrence, now)
        : Number(occurrence.tiempoAcumuladoSegundos ?? 0)

      await repo.updateOccurrenceLifecycle(input.occurrenceId, {
        estado: 'vencido',
        tiempoAcumuladoSegundos: accumulated,
        inicioRealAt: null,
        pausadoAt: null,
        finRealAt: now,
        confirmadoAt: now,
        canalConfirmacion: 'whatsapp',
        nota: note,
        asignacionEstado: 'vencida',
      })
      await repo.addOccurrenceEvent({
        occurrenceId: input.occurrenceId,
        type: 'vencimiento',
        at: now,
        actorType: 'employee',
        actorId: input.empleadoId,
        actorName: getCurrentResponsibleName(occurrence),
        description: note
          ? `Empleado no pudo completar la ronda: ${note}`
          : 'Empleado no pudo completar la ronda',
        metadata: { source: 'round-unable', note },
      })
      await repo.notifySupervisor({
        ...occurrence,
        nota: note,
      })

      return {
        ...occurrence,
        estado: 'vencido' as const,
        tiempoAcumuladoSegundos: accumulated,
        inicioRealAt: null,
        pausadoAt: null,
        finRealAt: now,
        confirmadoAt: now,
        canalConfirmacion: 'whatsapp' as const,
        nota: note,
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

function getCurrentResponsibleId(occurrence: RoundOccurrenceRecord) {
  return occurrence.responsableActualId ?? occurrence.empleadoId ?? null
}

function getCurrentResponsibleName(occurrence: RoundOccurrenceRecord) {
  return occurrence.responsableActualNombre ?? occurrence.empleadoNombre
}

function getCurrentResponsibleWaId(occurrence: RoundOccurrenceRecord) {
  const waId = occurrence.responsableActualWaId ?? occurrence.empleadoWaId
  if (!waId) throw new Error('Round occurrence has no assigned WhatsApp recipient')
  return waId
}

function assertRoundCanBeReassigned(occurrence: RoundOccurrenceRecord) {
  if (['cumplido', 'cumplido_con_observacion', 'vencido', 'cancelado'].includes(occurrence.estado)) {
    throw new Error('Round occurrence cannot be reassigned from its current state')
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
