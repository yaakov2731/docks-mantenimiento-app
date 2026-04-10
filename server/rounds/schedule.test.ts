import { describe, expect, it, vi } from 'vitest'
import { getBuenosAiresDateKey, saveRoundScheduleAndSyncToday } from './schedule'

describe('round schedule sync', () => {
  it('derives the operational day using Buenos Aires time instead of UTC', () => {
    expect(getBuenosAiresDateKey(new Date('2026-04-07T01:15:00.000Z'))).toBe('2026-04-06')
    expect(getBuenosAiresDateKey(new Date('2026-04-07T12:15:00.000Z'))).toBe('2026-04-07')
  })

  it('creates today occurrences right after saving a schedule', async () => {
    const saveRoundSchedule = vi.fn().mockResolvedValue({ id: 91 })
    const createDailyOccurrences = vi.fn().mockResolvedValue([])
    const input = {
      plantillaId: 9,
      modoProgramacion: 'semanal' as const,
      diaSemana: 1,
      horaInicio: '10:00',
      horaFin: '22:00',
      empleadoId: 4,
      supervisorUserId: 2,
      escalacionHabilitada: true,
    }

    await saveRoundScheduleAndSyncToday(
      {
        saveRoundSchedule,
        createDailyOccurrences,
      },
      input,
      new Date('2026-04-07T01:15:00.000Z')
    )

    expect(saveRoundSchedule).toHaveBeenCalledWith(input)
    expect(createDailyOccurrences).toHaveBeenCalledWith('2026-04-06')
  })
})
