"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const schedule_1 = require("./schedule");
(0, vitest_1.describe)('round schedule sync', () => {
    (0, vitest_1.it)('derives the operational day using Buenos Aires time instead of UTC', () => {
        (0, vitest_1.expect)((0, schedule_1.getBuenosAiresDateKey)(new Date('2026-04-07T01:15:00.000Z'))).toBe('2026-04-06');
        (0, vitest_1.expect)((0, schedule_1.getBuenosAiresDateKey)(new Date('2026-04-07T12:15:00.000Z'))).toBe('2026-04-07');
    });
    (0, vitest_1.it)('creates today occurrences right after saving a schedule', async () => {
        const saveRoundSchedule = vitest_1.vi.fn().mockResolvedValue({ id: 91 });
        const createDailyOccurrences = vitest_1.vi.fn().mockResolvedValue([]);
        const input = {
            plantillaId: 9,
            modoProgramacion: 'semanal',
            diaSemana: 1,
            horaInicio: '10:00',
            horaFin: '22:00',
            empleadoId: 4,
            supervisorUserId: 2,
            escalacionHabilitada: true,
        };
        await (0, schedule_1.saveRoundScheduleAndSyncToday)({
            saveRoundSchedule,
            createDailyOccurrences,
        }, input, new Date('2026-04-07T01:15:00.000Z'));
        (0, vitest_1.expect)(saveRoundSchedule).toHaveBeenCalledWith(input);
        (0, vitest_1.expect)(createDailyOccurrences).toHaveBeenCalledWith('2026-04-06');
    });
});
