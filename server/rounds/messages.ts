export function buildRoundReminderMessage(input: {
  occurrenceId: number
  nombreRonda: string
  horaProgramada: string
}) {
  return [
    `*${input.nombreRonda}*`,
    `Control programado para las ${input.horaProgramada}.`,
    '',
    'Respondé:',
    '1. Banos revisados y limpios',
    '2. Revisados con observacion',
    '3. No pude revisar',
    '',
    `ID control: ${input.occurrenceId}`,
  ].join('\n')
}
