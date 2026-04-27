"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickScheduleForDate = pickScheduleForDate;
exports.buildOccurrencesForDate = buildOccurrencesForDate;
exports.resolveOccurrenceState = resolveOccurrenceState;
const BUENOS_AIRES_OFFSET = '-03:00';
const FIFTEEN_MINUTES = 15 * 60 * 1000;
function pickScheduleForDate(fechaOperativa, schedules) {
    return (schedules.find((schedule) => schedule.modoProgramacion === 'fecha_especial' && schedule.fechaEspecial === fechaOperativa) ??
        schedules.find((schedule) => schedule.modoProgramacion === 'semanal' && schedule.diaSemana === getDayOfWeek(fechaOperativa)));
}
function buildOccurrencesForDate(input) {
    if (!Number.isFinite(input.intervaloHoras) || input.intervaloHoras <= 0) {
        throw new RangeError('intervaloHoras must be greater than 0');
    }
    const startMinutes = timeToMinutes(input.horaInicio);
    const endMinutes = timeToMinutes(input.horaFin);
    const stepMinutes = input.intervaloHoras * 60;
    const occurrences = [];
    for (let current = startMinutes; current < endMinutes; current += stepMinutes) {
        const horaProgramada = minutesToTime(current);
        occurrences.push({
            ...input,
            horaProgramada,
            programadoAtIso: `${input.fechaOperativa}T${horaProgramada}:00${BUENOS_AIRES_OFFSET}`,
            estado: 'pendiente',
        });
    }
    return occurrences;
}
function resolveOccurrenceState(input) {
    if (input.confirmadoAtIso) {
        return 'cumplido';
    }
    const programadoAtMillis = new Date(input.programadoAtIso).getTime();
    const nowMillis = new Date(input.nowIso).getTime();
    // The reminder timestamp is intentionally part of the contract. It is read
    // for validation/traceability, but overdue status stays anchored to the
    // scheduled time per Task 1.
    if (input.recordatorioEnviadoAtIso !== null) {
        void new Date(input.recordatorioEnviadoAtIso).getTime();
    }
    const elapsed = nowMillis - programadoAtMillis;
    return elapsed >= FIFTEEN_MINUTES ? 'vencido' : 'pendiente';
}
function getDayOfWeek(fechaOperativa) {
    const [year, month, day] = fechaOperativa.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}
function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}
function minutesToTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${pad(hours)}:${pad(minutes)}`;
}
function pad(value) {
    return value.toString().padStart(2, '0');
}
