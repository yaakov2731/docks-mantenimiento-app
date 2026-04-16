import { roundReminder, roundOverdue, roundObservationAlert, roundAssignment } from '../messages/templates'

export function buildRoundReminderMessage(input: {
  occurrenceId: number
  nombreRonda: string
  horaProgramada: string
}): string {
  return roundReminder(input)
}

export function buildRoundOverdueMessage(input: {
  occurrenceId: number
  nombreRonda: string
  horaProgramada: string
  empleadoNombre: string
  minutosVencida: number
}): string {
  return roundOverdue(input)
}

export function buildRoundObservationAlertMessage(input: {
  occurrenceId: number
  nombreRonda: string
  horaProgramada: string
  empleadoNombre: string
  nota: string
}): string {
  return roundObservationAlert(input)
}

export function buildRoundAssignmentMessage(input: {
  occurrenceId: number
  nombreRonda: string
  horaProgramada: string
  asignadoPor: string
}): string {
  return roundAssignment(input)
}
