"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const engine_1 = require("./engine");
(0, vitest_1.describe)('rounds engine', () => {
    (0, vitest_1.it)('prefers fechaEspecial over the weekly schedule for a date', () => {
        const schedules = [
            {
                id: 'weekly',
                modoProgramacion: 'semanal',
                diaSemana: 5,
                horaInicio: '10:00',
                horaFin: '22:00',
                intervaloHoras: 2,
            },
            {
                id: 'special',
                modoProgramacion: 'fecha_especial',
                fechaEspecial: '2026-04-10',
                horaInicio: '08:00',
                horaFin: '20:00',
                intervaloHoras: 2,
            },
        ];
        (0, vitest_1.expect)((0, engine_1.pickScheduleForDate)('2026-04-10', schedules)?.id).toBe('special');
    });
    (0, vitest_1.it)('builds 2-hour checkpoints between 10:00 and 22:00 for 2026-04-10', () => {
        const occurrences = (0, engine_1.buildOccurrencesForDate)({
            plantillaId: 'plantilla-banos',
            programacionId: 'programacion-1',
            fechaOperativa: '2026-04-10',
            horaInicio: '10:00',
            horaFin: '22:00',
            intervaloHoras: 2,
            empleadoId: 42,
            empleadoNombre: 'Ana',
        });
        (0, vitest_1.expect)(occurrences.map((occurrence) => occurrence.programadoAtIso)).toEqual([
            '2026-04-10T10:00:00-03:00',
            '2026-04-10T12:00:00-03:00',
            '2026-04-10T14:00:00-03:00',
            '2026-04-10T16:00:00-03:00',
            '2026-04-10T18:00:00-03:00',
            '2026-04-10T20:00:00-03:00',
        ]);
        (0, vitest_1.expect)(occurrences[0]).toMatchObject({
            plantillaId: 'plantilla-banos',
            programacionId: 'programacion-1',
            fechaOperativa: '2026-04-10',
            horaInicio: '10:00',
            horaFin: '22:00',
            intervaloHoras: 2,
            empleadoId: 42,
            empleadoNombre: 'Ana',
            estado: 'pendiente',
        });
    });
    (0, vitest_1.it)('rejects non-positive intervals before generating occurrences', () => {
        (0, vitest_1.expect)(() => (0, engine_1.buildOccurrencesForDate)({
            plantillaId: 'plantilla-banos',
            programacionId: 'programacion-1',
            fechaOperativa: '2026-04-10',
            horaInicio: '10:00',
            horaFin: '22:00',
            intervaloHoras: 0,
            empleadoId: 42,
            empleadoNombre: 'Ana',
        })).toThrow(RangeError);
    });
    (0, vitest_1.it)('ignores malformed reminder timestamps when determining overdue state', () => {
        (0, vitest_1.expect)((0, engine_1.resolveOccurrenceState)({
            programadoAtIso: '2026-04-10T10:00:00-03:00',
            recordatorioEnviadoAtIso: 'not-a-date',
            confirmadoAtIso: null,
            nowIso: '2026-04-10T10:15:00-03:00',
        })).toBe('vencido');
    });
    (0, vitest_1.it)('marks an occurrence as vencido after 15 minutes without confirmation', () => {
        (0, vitest_1.expect)((0, engine_1.resolveOccurrenceState)({
            programadoAtIso: '2026-04-10T10:00:00-03:00',
            recordatorioEnviadoAtIso: '2026-04-10T10:01:00-03:00',
            confirmadoAtIso: null,
            nowIso: '2026-04-10T10:15:00-03:00',
        })).toBe('vencido');
    });
});
