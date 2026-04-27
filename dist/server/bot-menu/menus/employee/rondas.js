"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRondasLista = buildRondasLista;
exports.handleRondasLista = handleRondasLista;
exports.handleRondaDetalle = handleRondaDetalle;
exports.handleRondaRechazo = handleRondaRechazo;
exports.handleRondaObservacion = handleRondaObservacion;
exports.handleRondaObservacionLibre = handleRondaObservacionLibre;
/**
 * Flujo de rondas modernas para empleados.
 * Usa rondas_ocurrencia y valida siempre contra el responsable actual.
 */
const session_1 = require("../../session");
const guards_1 = require("../../shared/guards");
const db_1 = require("../../../db");
const service_1 = require("../../../rounds/service");
const roundDb = __importStar(require("../../../db"));
const roundsService = (0, service_1.createRoundsService)(roundDb);
const PAGE_SIZE = 5;
function currentResponsible(round) {
    return round.responsableActualNombre ?? round.empleadoNombre ?? 'Sin asignar';
}
function getRondaEstadoLabel(estado) {
    switch (estado) {
        case 'pendiente': return '⏳ Pendiente';
        case 'en_progreso': return '🔄 En progreso';
        case 'pausada': return '⏸️ Pausada';
        case 'cumplido': return '✅ Cumplida';
        case 'cumplido_con_observacion': return '⚠️ Con observación';
        case 'vencido': return '❌ Vencida';
        default: return estado;
    }
}
async function buildRondasLista(session) {
    const rounds = await (0, db_1.listRoundOccurrencesForEmployee)(session.userId);
    if (rounds.length === 0) {
        return [
            `🚻 *Control de baños*`,
            guards_1.SEP,
            `✅ No tenés rondas asignadas ahora.`,
            `Cuando el admin te reasigne una ronda, la vas a ver acá.`,
            guards_1.SEP,
            `0️⃣  Volver al menú principal`,
        ].join('\n');
    }
    const page = session.contextData.page ?? 1;
    const paged = (0, guards_1.paginate)(rounds, page, PAGE_SIZE);
    const lines = [
        `🚻 *Rondas asignadas* (${rounds.length})`,
        guards_1.SEP,
    ];
    paged.items.forEach((round, index) => {
        const num = (page - 1) * PAGE_SIZE + index + 1;
        lines.push(`${num}️⃣  ${round.programadoAtLabel ?? '--:--'} — *${round.nombreRonda ?? 'Ronda operativa'}*`, `   ${getRondaEstadoLabel(round.estado)} | ${(0, guards_1.fmtDuration)(Number(round.tiempoAcumuladoSegundos ?? 0))}`, `   👷 ${currentResponsible(round)}`);
    });
    lines.push(guards_1.SEP);
    if (paged.hasPrev)
        lines.push(`8️⃣  ◀️ Anterior`);
    if (paged.hasNext)
        lines.push(`9️⃣  ▶️ Ver más`);
    lines.push(`0️⃣  Volver`);
    return lines.join('\n');
}
async function handleRondasLista(session, input) {
    const rounds = await (0, db_1.listRoundOccurrencesForEmployee)(session.userId);
    const page = session.contextData.page ?? 1;
    const paged = (0, guards_1.paginate)(rounds, page, PAGE_SIZE);
    if (input === '8' && paged.hasPrev) {
        await (0, session_1.navigateTo)(session, 'rondas_lista', { page: page - 1 });
        return buildRondasLista({ ...session, contextData: { page: page - 1 } });
    }
    if (input === '9' && paged.hasNext) {
        await (0, session_1.navigateTo)(session, 'rondas_lista', { page: page + 1 });
        return buildRondasLista({ ...session, contextData: { page: page + 1 } });
    }
    if (input === '0')
        return null;
    const opt = (0, guards_1.parseMenuOption)(input, paged.items.length);
    if (!opt)
        return (0, guards_1.invalidOption)(await buildRondasLista(session));
    const round = paged.items[opt - 1];
    await (0, session_1.navigateTo)(session, 'ronda_detalle', { rondaId: round.id });
    return buildRondaDetalle(round);
}
function buildRondaDetalle(round) {
    const lines = [
        `🚻 *${round.nombreRonda ?? 'Ronda operativa'}*`,
        `🕒 Programada: *${round.programadoAtLabel ?? '--:--'}*`,
        `👷 Responsable actual: *${currentResponsible(round)}*`,
        `⏱️ Tiempo acumulado: *${(0, guards_1.fmtDuration)(Number(round.tiempoAcumuladoSegundos ?? 0))}*`,
        `📌 Estado: ${getRondaEstadoLabel(round.estado)}`,
        guards_1.SEP,
    ];
    if (round.estado === 'pendiente') {
        lines.push(`1️⃣  ▶️ Iniciar ronda`, `2️⃣  ❌ No pude hacerla`, `0️⃣  Volver`);
    }
    else if (round.estado === 'en_progreso') {
        lines.push(`1️⃣  ⏸️ Pausar ronda`, `2️⃣  ✅ Finalizar ronda`, `3️⃣  ⚠️ Finalizar con observación`, `4️⃣  ❌ No pude hacerla`, `0️⃣  Volver`);
    }
    else if (round.estado === 'pausada') {
        lines.push(`1️⃣  ▶️ Reanudar ronda`, `2️⃣  ✅ Finalizar ronda`, `3️⃣  ⚠️ Finalizar con observación`, `4️⃣  ❌ No pude hacerla`, `0️⃣  Volver`);
    }
    else {
        lines.push(`0️⃣  Volver`);
    }
    return lines.join('\n');
}
async function handleRondaDetalle(session, input) {
    const occurrenceId = Number(session.contextData.rondaId);
    if (!Number.isFinite(occurrenceId))
        return (0, guards_1.errorMsg)('No se encontró la ronda.');
    const round = await (0, db_1.getRoundOccurrenceById)(occurrenceId);
    if (!round)
        return (0, guards_1.errorMsg)('Ronda no encontrada.');
    try {
        if (round.estado === 'pendiente') {
            if (input === '1') {
                const started = await roundsService.startOccurrence({ occurrenceId, empleadoId: session.userId });
                return buildRondaDetalle(started);
            }
            if (input === '2') {
                await (0, session_1.navigateTo)(session, 'ronda_rechazo', { rondaId: occurrenceId });
                return buildRondaRechazo();
            }
        }
        if (round.estado === 'en_progreso') {
            if (input === '1') {
                const paused = await roundsService.pauseOccurrence({ occurrenceId, empleadoId: session.userId });
                return buildRondaDetalle(paused);
            }
            if (input === '2') {
                const finished = await roundsService.finishOccurrence({ occurrenceId, empleadoId: session.userId });
                return `✅ Ronda finalizada.\n\n${buildRondaDetalle(finished)}`;
            }
            if (input === '3') {
                await (0, session_1.navigateTo)(session, 'ronda_observacion', { rondaId: occurrenceId });
                return buildRondaObservacion();
            }
            if (input === '4') {
                await (0, session_1.navigateTo)(session, 'ronda_rechazo', { rondaId: occurrenceId });
                return buildRondaRechazo();
            }
        }
        if (round.estado === 'pausada') {
            if (input === '1') {
                const resumed = await roundsService.startOccurrence({ occurrenceId, empleadoId: session.userId });
                return buildRondaDetalle(resumed);
            }
            if (input === '2') {
                const finished = await roundsService.finishOccurrence({ occurrenceId, empleadoId: session.userId });
                return `✅ Ronda finalizada.\n\n${buildRondaDetalle(finished)}`;
            }
            if (input === '3') {
                await (0, session_1.navigateTo)(session, 'ronda_observacion', { rondaId: occurrenceId });
                return buildRondaObservacion();
            }
            if (input === '4') {
                await (0, session_1.navigateTo)(session, 'ronda_rechazo', { rondaId: occurrenceId });
                return buildRondaRechazo();
            }
        }
        if (input === '0')
            return null;
        return (0, guards_1.invalidOption)(buildRondaDetalle(round));
    }
    catch (error) {
        return (0, guards_1.errorMsg)(error?.message ?? 'No se pudo actualizar la ronda.');
    }
}
function buildRondaRechazo() {
    return [
        `❌ *No pude hacer la ronda*`,
        guards_1.SEP,
        `1️⃣  Estoy ocupado con otra tarea`,
        `2️⃣  Salí a almorzar / no estoy disponible`,
        `3️⃣  Otro motivo`,
        `0️⃣  Cancelar`,
    ].join('\n');
}
async function handleRondaRechazo(session, input) {
    const occurrenceId = Number(session.contextData.rondaId);
    if (!Number.isFinite(occurrenceId))
        return (0, guards_1.errorMsg)('No se encontró la ronda.');
    if (input === '0')
        return null;
    const reasons = {
        '1': 'Estoy ocupado con otra tarea',
        '2': 'Salí a almorzar / no estoy disponible',
        '3': 'Otro motivo',
    };
    const note = reasons[input];
    if (!note)
        return (0, guards_1.invalidOption)(buildRondaRechazo());
    try {
        const outcome = await roundsService.markUnableToComplete({
            occurrenceId,
            empleadoId: session.userId,
            note,
        });
        return `⚠️ Se informó que no pudiste completar la ronda.\n\n${buildRondaDetalle(outcome)}`;
    }
    catch (error) {
        return (0, guards_1.errorMsg)(error?.message ?? 'No se pudo registrar el desvío.');
    }
}
function buildRondaObservacion() {
    return [
        `⚠️ *Observación de la ronda*`,
        guards_1.SEP,
        `1️⃣  Falta papel / toallas`,
        `2️⃣  Falta jabón / desinfectante`,
        `3️⃣  Desperfecto en instalación`,
        `4️⃣  Suciedad excesiva`,
        `5️⃣  Escribir otra observación`,
        `0️⃣  Cancelar`,
    ].join('\n');
}
const OBSERVACIONES = {
    '1': 'Falta papel / toallas',
    '2': 'Falta jabón / desinfectante',
    '3': 'Desperfecto en instalación',
    '4': 'Suciedad excesiva',
};
async function handleRondaObservacion(session, input) {
    const occurrenceId = Number(session.contextData.rondaId);
    if (!Number.isFinite(occurrenceId))
        return (0, guards_1.errorMsg)('No se encontró la ronda.');
    if (input === '5') {
        await (0, session_1.navigateTo)(session, 'ronda_observacion_libre', { rondaId: occurrenceId, pendingText: true });
        return `✏️ Escribí la observación brevemente:`;
    }
    if (input === '0')
        return null;
    const note = OBSERVACIONES[input];
    if (!note)
        return (0, guards_1.invalidOption)(buildRondaObservacion());
    try {
        const outcome = await roundsService.reportObservation({
            occurrenceId,
            empleadoId: session.userId,
            note,
        });
        return `✅ Ronda finalizada con observación.\n\n${buildRondaDetalle(outcome)}`;
    }
    catch (error) {
        return (0, guards_1.errorMsg)(error?.message ?? 'No se pudo registrar la observación.');
    }
}
async function handleRondaObservacionLibre(session, input) {
    const occurrenceId = Number(session.contextData.rondaId);
    if (!Number.isFinite(occurrenceId))
        return (0, guards_1.errorMsg)('No se encontró la ronda.');
    if (!input.trim())
        return `✏️ Escribí la observación brevemente:`;
    try {
        const outcome = await roundsService.reportObservation({
            occurrenceId,
            empleadoId: session.userId,
            note: input.trim(),
        });
        return `✅ Ronda finalizada con observación.\n\n${buildRondaDetalle(outcome)}`;
    }
    catch (error) {
        return (0, guards_1.errorMsg)(error?.message ?? 'No se pudo registrar la observación.');
    }
}
