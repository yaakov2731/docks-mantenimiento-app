"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const messages_1 = require("./messages");
const service_1 = require("./service");
function createFakeRepo(initial = {}) {
    const templates = [...(initial.templates ?? [])];
    const schedules = [...(initial.schedules ?? [])];
    const occurrences = (initial.occurrences ?? []).map((occurrence) => ({
        inicioRealAt: null,
        pausadoAt: null,
        finRealAt: null,
        tiempoAcumuladoSegundos: 0,
        nota: null,
        canalConfirmacion: 'whatsapp',
        ...occurrence,
    }));
    const createdBatches = [];
    const reminderMarks = [];
    const overdueMarks = [];
    const events = [];
    const botMessages = [];
    const supervisorMessages = [];
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
            return [...templates];
        },
        async listSchedulesForTemplate(templateId) {
            return schedules.filter((schedule) => schedule.plantillaId === templateId);
        },
        async listOccurrencesForDate(templateId, dateKey) {
            return occurrences.filter((occurrence) => occurrence.plantillaId === templateId && occurrence.fechaOperativa === dateKey);
        },
        async createOccurrences(rows) {
            const normalizedRows = rows.map((row) => ({
                inicioRealAt: null,
                pausadoAt: null,
                finRealAt: null,
                tiempoAcumuladoSegundos: 0,
                nota: null,
                canalConfirmacion: 'whatsapp',
                ...row,
            }));
            createdBatches.push(normalizedRows.map((row) => ({ ...row })));
            occurrences.push(...normalizedRows.map((row) => ({ ...row })));
        },
        async listReminderCandidates(_now) {
            return occurrences.filter((occurrence) => occurrence.estado === 'pendiente');
        },
        async markReminderSent(id, at) {
            reminderMarks.push({ id, at });
            const occurrence = occurrences.find((item) => item.id === id);
            if (occurrence)
                occurrence.recordatorioEnviadoAt = at;
        },
        async markOccurrenceOverdue(id) {
            overdueMarks.push({ id });
            const occurrence = occurrences.find((item) => item.id === id);
            if (occurrence)
                occurrence.estado = 'vencido';
        },
        async addOccurrenceEvent(event) {
            events.push(event);
        },
        async enqueueBotMessage(waId, message) {
            botMessages.push({ waId, message });
        },
        async notifySupervisor(item) {
            supervisorMessages.push(item);
        },
        async getOccurrenceById(id) {
            return occurrences.find((item) => item.id === id) ?? null;
        },
        async getEmpleadoById(id) {
            const byOccurrence = occurrences.find((item) => item.responsableActualId === id ||
                item.responsableProgramadoId === id ||
                item.empleadoId === id);
            if (!byOccurrence) {
                if (id === 8) {
                    return { id: 8, nombre: 'Bea', waId: '5491222222222' };
                }
                return null;
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
            };
        },
        async markOccurrenceReply(id, estado, nota) {
            const occurrence = occurrences.find((item) => item.id === id);
            if (!occurrence)
                return;
            occurrence.estado = estado;
            occurrence.nota = nota ?? null;
            occurrence.confirmadoAt = new Date();
            occurrence.canalConfirmacion = 'whatsapp';
        },
        async updateOccurrenceLifecycle(id, updates) {
            const occurrence = occurrences.find((item) => item.id === id);
            if (!occurrence)
                throw new Error('Round occurrence not found in fake repo');
            Object.assign(occurrence, updates);
        },
    };
}
(0, vitest_1.describe)('rounds orchestration service', () => {
    (0, vitest_1.it)('buildRoundReminderMessage matches the WhatsApp contract', () => {
        (0, vitest_1.expect)((0, messages_1.buildRoundReminderMessage)({
            occurrenceId: 123,
            nombreRonda: 'Control de banos',
            horaProgramada: '14:00',
        })).toBe([
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
        ].join('\n'));
    });
    (0, vitest_1.it)('creates unique occurrence ids across different dates for the same schedule', async () => {
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
        });
        const service = (0, service_1.createRoundsService)(repo);
        const april6 = await service.createDailyOccurrences('2026-04-06');
        const april7 = await service.createDailyOccurrences('2026-04-07');
        (0, vitest_1.expect)(april6[0].id).not.toBe(april7[0].id);
        (0, vitest_1.expect)(april6[0].programadoAt).toEqual(new Date('2026-04-06T10:00:00-03:00'));
        (0, vitest_1.expect)(april6[0].empleadoId).toBe(7);
        (0, vitest_1.expect)(april6[0].empleadoWaId).toBe('5491111111111');
        (0, vitest_1.expect)(april7[0].programadoAt).toEqual(new Date('2026-04-07T12:00:00-03:00'));
        (0, vitest_1.expect)(april7[0].empleadoId).toBe(8);
        (0, vitest_1.expect)(april7[0].empleadoWaId).toBe('5491222222222');
    });
    (0, vitest_1.it)('createDailyOccurrences creates missing checkpoints only once', async () => {
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
        });
        const service = (0, service_1.createRoundsService)(repo);
        const firstRun = await service.createDailyOccurrences('2026-04-06');
        const secondRun = await service.createDailyOccurrences('2026-04-06');
        (0, vitest_1.expect)(firstRun.map((occurrence) => occurrence.programadoAt)).toEqual([
            new Date('2026-04-06T10:00:00-03:00'),
            new Date('2026-04-06T12:00:00-03:00'),
        ]);
        (0, vitest_1.expect)(secondRun).toEqual([]);
        (0, vitest_1.expect)(repo.createdBatches).toHaveLength(1);
        (0, vitest_1.expect)(repo.occurrences).toHaveLength(2);
    });
    (0, vitest_1.it)('skips reminder duplicates for already-reminded pending occurrences', async () => {
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
        });
        const service = (0, service_1.createRoundsService)(repo);
        const result = await service.runReminderCycle(new Date('2026-04-06T10:10:00-03:00'));
        (0, vitest_1.expect)(result).toEqual({ remindersSent: 0, escalationsSent: 0 });
        (0, vitest_1.expect)(repo.botMessages).toEqual([]);
        (0, vitest_1.expect)(repo.reminderMarks).toEqual([]);
        (0, vitest_1.expect)(repo.overdueMarks).toEqual([]);
        (0, vitest_1.expect)(repo.events).toEqual([]);
    });
    (0, vitest_1.it)('runReminderCycle sends a reminder once and escalates overdue candidates without a duplicate reminder', async () => {
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
        });
        const service = (0, service_1.createRoundsService)(repo);
        const result = await service.runReminderCycle(new Date('2026-04-06T10:20:00-03:00'));
        (0, vitest_1.expect)(result).toEqual({
            remindersSent: 1,
            escalationsSent: 1,
        });
        (0, vitest_1.expect)(repo.botMessages).toEqual([
            {
                waId: '5491111111111',
                message: (0, messages_1.buildRoundReminderMessage)({
                    occurrenceId: 21,
                    nombreRonda: 'Control de banos',
                    horaProgramada: 'ahora',
                }),
            },
        ]);
        (0, vitest_1.expect)(repo.reminderMarks).toEqual([{ id: 21, at: new Date('2026-04-06T10:20:00-03:00') }]);
        (0, vitest_1.expect)(repo.overdueMarks).toEqual([{ id: 22 }]);
        (0, vitest_1.expect)(repo.supervisorMessages).toEqual([
            vitest_1.expect.objectContaining({
                id: 22,
                nombreRonda: 'Control de banos',
            }),
        ]);
        (0, vitest_1.expect)(repo.events).toEqual([
            { occurrenceId: 21, type: 'recordatorio', at: new Date('2026-04-06T10:20:00-03:00') },
            { occurrenceId: 22, type: 'vencimiento', at: new Date('2026-04-06T10:20:00-03:00') },
        ]);
    });
    (0, vitest_1.it)('starts, pauses and finishes a round with real execution timestamps', async () => {
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
        });
        const service = (0, service_1.createRoundsService)(repo);
        const started = await service.startOccurrence({ occurrenceId: 44, empleadoId: 7 });
        (0, vitest_1.expect)(started.estado).toBe('en_progreso');
        (0, vitest_1.expect)(started.inicioRealAt?.toISOString()).toBeTruthy();
        const startedAt = new Date(started.inicioRealAt);
        const pausedAt = new Date(startedAt.getTime() + 9 * 60 * 1000);
        const finishedAt = new Date(pausedAt.getTime() + 4 * 60 * 1000);
        const paused = await service.pauseOccurrence({ occurrenceId: 44, empleadoId: 7, now: pausedAt });
        (0, vitest_1.expect)(paused.estado).toBe('pausada');
        (0, vitest_1.expect)(paused.tiempoAcumuladoSegundos).toBe(540);
        (0, vitest_1.expect)(paused.pausadoAt?.toISOString()).toBe(pausedAt.toISOString());
        const resumed = await service.startOccurrence({ occurrenceId: 44, empleadoId: 7, now: finishedAt });
        (0, vitest_1.expect)(resumed.estado).toBe('en_progreso');
        (0, vitest_1.expect)(resumed.tiempoAcumuladoSegundos).toBe(540);
        (0, vitest_1.expect)(resumed.inicioRealAt?.toISOString()).toBe(finishedAt.toISOString());
        const closedAt = new Date(finishedAt.getTime() + 6 * 60 * 1000);
        const finished = await service.finishOccurrence({ occurrenceId: 44, empleadoId: 7, now: closedAt });
        (0, vitest_1.expect)(finished.estado).toBe('cumplido');
        (0, vitest_1.expect)(finished.tiempoAcumuladoSegundos).toBe(900);
        (0, vitest_1.expect)(finished.finRealAt?.toISOString()).toBe(closedAt.toISOString());
    });
    (0, vitest_1.it)('assigns, reassigns and releases an occurrence preserving accumulated work', async () => {
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
        });
        const service = (0, service_1.createRoundsService)(repo);
        const reassigned = await service.assignOccurrence({
            occurrenceId: 55,
            empleadoId: 8,
            actor: { id: 1, name: 'Gerente' },
            now: new Date('2026-04-06T12:20:00-03:00'),
        });
        (0, vitest_1.expect)(reassigned.responsableActualId).toBe(8);
        (0, vitest_1.expect)(reassigned.empleadoId).toBe(8);
        (0, vitest_1.expect)(reassigned.asignacionEstado).toBe('asignada');
        (0, vitest_1.expect)(reassigned.tiempoAcumuladoSegundos).toBe(720);
        const released = await service.releaseOccurrence({
            occurrenceId: 55,
            actor: { id: 1, name: 'Gerente' },
            now: new Date('2026-04-06T12:25:00-03:00'),
        });
        (0, vitest_1.expect)(released.responsableActualId).toBeNull();
        (0, vitest_1.expect)(released.asignacionEstado).toBe('sin_asignar');
        (0, vitest_1.expect)(released.tiempoAcumuladoSegundos).toBe(720);
    });
    (0, vitest_1.it)('rejects lifecycle actions from a previous round owner after reassignment', async () => {
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
        });
        const service = (0, service_1.createRoundsService)(repo);
        await (0, vitest_1.expect)(service.startOccurrence({ occurrenceId: 56, empleadoId: 7 })).rejects.toThrow('Round occurrence does not belong to employee');
        await (0, vitest_1.expect)(service.finishOccurrence({ occurrenceId: 56, empleadoId: 7 })).rejects.toThrow('Round occurrence does not belong to employee');
    });
});
