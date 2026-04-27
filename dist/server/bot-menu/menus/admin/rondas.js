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
exports.buildAdminRondasMenu = buildAdminRondasMenu;
exports.handleAdminRondas = handleAdminRondas;
exports.buildAdminRondasUnassigned = buildAdminRondasUnassigned;
exports.handleAdminRondasUnassigned = handleAdminRondasUnassigned;
exports.buildAdminRondaDetalle = buildAdminRondaDetalle;
exports.handleAdminRondaDetalle = handleAdminRondaDetalle;
exports.buildAdminRondasAssign = buildAdminRondasAssign;
exports.handleAdminRondasAssign = handleAdminRondasAssign;
exports.buildAdminRondasCreate = buildAdminRondasCreate;
exports.handleAdminRondasCreate = handleAdminRondasCreate;
exports.handleAdminRondasCreateCustom = handleAdminRondasCreateCustom;
exports.handleAdminRondasCreateLocation = handleAdminRondasCreateLocation;
exports.buildAdminRondasByEmployee = buildAdminRondasByEmployee;
exports.handleAdminRondasByEmployee = handleAdminRondasByEmployee;
/**
 * Menús de rondas modernas para administradores.
 * Opera sobre rondas_ocurrencia para compartir la misma fuente de verdad con app y bot.
 */
const session_1 = require("../../session");
const guards_1 = require("../../shared/guards");
const db_1 = require("../../../db");
const service_1 = require("../../../rounds/service");
const roundDb = __importStar(require("../../../db"));
const roundsService = (0, service_1.createRoundsService)(roundDb);
const PAGE_SIZE = 5;
function todayKey() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires',
    }).format(new Date());
}
function currentResponsible(item) {
    return item.responsableActualNombre ?? item.empleadoNombre ?? 'Sin asignar';
}
function assignmentStateLabel(item) {
    switch (item.asignacionEstado) {
        case 'sin_asignar': return 'Sin asignar';
        case 'asignada': return 'Asignada';
        case 'en_progreso': return 'En progreso';
        case 'completada': return 'Completada';
        case 'vencida': return 'Vencida';
        default: return item.asignacionEstado ?? 'Asignada';
    }
}
async function listRounds(scope = 'all') {
    const rounds = await (0, db_1.getRoundTimeline)(todayKey());
    if (scope === 'unassigned') {
        return rounds.filter((item) => item.asignacionEstado === 'sin_asignar' || !item.responsableActualId);
    }
    return rounds;
}
async function buildAdminRondasMenu(_session) {
    const rounds = await listRounds('all');
    const unassigned = rounds.filter((item) => item.asignacionEstado === 'sin_asignar' || !item.responsableActualId).length;
    return [
        `🚻 *Gestión de rondas de baños*`,
        `🏢 Docks del Puerto`,
        guards_1.SEP,
        `Rondas visibles hoy: ${rounds.length}`,
        `Sin asignar: ${unassigned}`,
        guards_1.SEP,
        `1️⃣  📋 Ver rondas del día`,
        `2️⃣  ⚠️ Ver sin asignar`,
        `3️⃣  👀 Ver por empleado`,
        `4️⃣  🧭 Crear programación desde la app`,
        guards_1.SEP,
        `0️⃣  Volver al menú principal`,
    ].join('\n');
}
async function handleAdminRondas(session, input) {
    if (input === '1') {
        await (0, session_1.navigateTo)(session, 'admin_rondas_unassigned', { page: 1, scope: 'all' });
        return buildAdminRondasUnassigned({ ...session, currentMenu: 'admin_rondas_unassigned', contextData: { page: 1, scope: 'all' } });
    }
    if (input === '2') {
        await (0, session_1.navigateTo)(session, 'admin_rondas_unassigned', { page: 1, scope: 'unassigned' });
        return buildAdminRondasUnassigned({ ...session, currentMenu: 'admin_rondas_unassigned', contextData: { page: 1, scope: 'unassigned' } });
    }
    if (input === '3') {
        await (0, session_1.navigateTo)(session, 'admin_rondas_by_employee', { page: 1 });
        return buildAdminRondasByEmployee({ ...session, currentMenu: 'admin_rondas_by_employee', contextData: { page: 1 } });
    }
    if (input === '4') {
        return buildAdminRondasCreate();
    }
    if (input === '0')
        return null;
    return (0, guards_1.invalidOption)(await buildAdminRondasMenu(session));
}
async function buildAdminRondasUnassigned(session) {
    const scope = session.contextData.scope === 'unassigned' ? 'unassigned' : 'all';
    const rounds = await listRounds(scope);
    const page = session.contextData.page ?? 1;
    const paged = (0, guards_1.paginate)(rounds, page, PAGE_SIZE);
    if (rounds.length === 0) {
        return [
            scope === 'unassigned' ? `🚻 *Rondas sin asignar*` : `🚻 *Rondas del día*`,
            guards_1.SEP,
            scope === 'unassigned' ? `✅ No hay rondas sin asignar.` : `✅ No hay rondas visibles para hoy.`,
            guards_1.SEP,
            `0️⃣  Volver`,
        ].join('\n');
    }
    const lines = [
        scope === 'unassigned' ? `🚻 *Rondas sin asignar* (${rounds.length})` : `🚻 *Rondas del día* (${rounds.length})`,
        guards_1.SEP,
    ];
    paged.items.forEach((item, index) => {
        const num = (page - 1) * PAGE_SIZE + index + 1;
        lines.push(`${num}️⃣  ${item.programadoAtLabel ?? '--:--'} — *${item.nombreRonda ?? 'Ronda operativa'}*`, `   👷 ${currentResponsible(item)} | ${assignmentStateLabel(item)}`, `   ⏱️ ${item.estado} | ${(0, guards_1.fmtDuration)(Number(item.tiempoAcumuladoSegundos ?? 0))}`);
    });
    lines.push(guards_1.SEP);
    if (paged.hasPrev)
        lines.push(`8️⃣  ◀️ Anterior`);
    if (paged.hasNext)
        lines.push(`9️⃣  ▶️ Ver más`);
    lines.push(`0️⃣  Volver`);
    return lines.join('\n');
}
async function handleAdminRondasUnassigned(session, input) {
    const scope = session.contextData.scope === 'unassigned' ? 'unassigned' : 'all';
    const rounds = await listRounds(scope);
    const page = session.contextData.page ?? 1;
    const paged = (0, guards_1.paginate)(rounds, page, PAGE_SIZE);
    if (input === '8' && paged.hasPrev) {
        await (0, session_1.navigateTo)(session, 'admin_rondas_unassigned', { page: page - 1, scope });
        return buildAdminRondasUnassigned({ ...session, contextData: { page: page - 1, scope } });
    }
    if (input === '9' && paged.hasNext) {
        await (0, session_1.navigateTo)(session, 'admin_rondas_unassigned', { page: page + 1, scope });
        return buildAdminRondasUnassigned({ ...session, contextData: { page: page + 1, scope } });
    }
    if (input === '0')
        return null;
    const opt = (0, guards_1.parseMenuOption)(input, paged.items.length);
    if (!opt)
        return (0, guards_1.invalidOption)(await buildAdminRondasUnassigned(session));
    const occurrence = paged.items[opt - 1];
    await (0, session_1.navigateTo)(session, 'admin_ronda_detalle', { rondaId: occurrence.id, scope, page });
    return buildAdminRondaDetalle(occurrence);
}
function buildAdminRondaDetalle(ronda) {
    const programmed = ronda.responsableProgramadoNombre ?? ronda.empleadoNombre ?? 'Sin programar';
    const current = currentResponsible(ronda);
    const sameResponsible = programmed === current;
    return [
        `🚻 *Ronda #${ronda.id}*`,
        guards_1.SEP,
        `Horario: ${ronda.programadoAtLabel ?? '--:--'}`,
        `Estado operativo: ${ronda.estado}`,
        `Asignación: ${assignmentStateLabel(ronda)}`,
        `Responsable actual: ${current}`,
        sameResponsible ? `Responsable programado: ${programmed}` : `Responsable programado: ${programmed} (difiere)`,
        `Tiempo acumulado: ${(0, guards_1.fmtDuration)(Number(ronda.tiempoAcumuladoSegundos ?? 0))}`,
        ronda.nota ? `Nota: ${ronda.nota}` : null,
        guards_1.SEP,
        `1️⃣  👷 ${ronda.responsableActualId ? 'Reasignar responsable' : 'Asignar responsable'}`,
        ronda.responsableActualId ? `2️⃣  🧹 Liberar ronda` : null,
        `0️⃣  Volver`,
    ].filter(Boolean).join('\n');
}
async function handleAdminRondaDetalle(session, input) {
    const occurrenceId = Number(session.contextData.rondaId);
    if (!Number.isFinite(occurrenceId))
        return (0, guards_1.errorMsg)('No se encontró la ronda.');
    const occurrence = await (0, db_1.getRoundOccurrenceById)(occurrenceId);
    if (!occurrence)
        return (0, guards_1.errorMsg)('Ronda no encontrada.');
    if (input === '1') {
        await (0, session_1.navigateTo)(session, 'admin_rondas_assign', { rondaId: occurrenceId });
        return buildAdminRondasAssign(occurrence);
    }
    if (input === '2' && occurrence.responsableActualId) {
        try {
            const released = await roundsService.releaseOccurrence({
                occurrenceId,
                actor: { id: session.userId, name: session.userName },
            });
            return [
                `✅ Ronda liberada para reasignación.`,
                ``,
                buildAdminRondaDetalle(released),
            ].join('\n');
        }
        catch (error) {
            return (0, guards_1.errorMsg)(error?.message ?? 'No se pudo liberar la ronda.');
        }
    }
    if (input === '0')
        return null;
    return (0, guards_1.invalidOption)(buildAdminRondaDetalle(occurrence));
}
async function buildAdminRondasAssign(_ronda) {
    const empleados = (await (0, db_1.getEmpleados)()).filter((empleado) => empleado.activo);
    if (empleados.length === 0) {
        return `⚠️ No hay empleados activos registrados.\n\n0️⃣  Volver`;
    }
    const lines = [
        `👷 *Seleccionar responsable*`,
        guards_1.SEP,
    ];
    empleados.slice(0, 8).forEach((empleado, index) => {
        lines.push(`${index + 1}️⃣  ${empleado.nombre}${empleado.especialidad ? ` — ${empleado.especialidad}` : ''}`);
    });
    lines.push(guards_1.SEP, `0️⃣  Cancelar`);
    return lines.join('\n');
}
async function handleAdminRondasAssign(session, input) {
    const occurrenceId = Number(session.contextData.rondaId);
    if (!Number.isFinite(occurrenceId))
        return (0, guards_1.errorMsg)('No se encontró la ronda.');
    if (input === '0')
        return null;
    const empleados = (await (0, db_1.getEmpleados)()).filter((empleado) => empleado.activo).slice(0, 8);
    const opt = (0, guards_1.parseMenuOption)(input, empleados.length);
    if (!opt)
        return (0, guards_1.invalidOption)(await buildAdminRondasAssign({ id: occurrenceId }));
    const empleado = empleados[opt - 1];
    try {
        const occurrence = await roundsService.assignOccurrence({
            occurrenceId,
            empleadoId: empleado.id,
            actor: { id: session.userId, name: session.userName },
        });
        return [
            `✅ Responsable actualizado a *${empleado.nombre}*.`,
            ``,
            buildAdminRondaDetalle(occurrence),
        ].join('\n');
    }
    catch (error) {
        return (0, guards_1.errorMsg)(error?.message ?? 'No se pudo asignar la ronda.');
    }
}
async function buildAdminRondasCreate() {
    return [
        `🧭 *Creación desde la app*`,
        guards_1.SEP,
        `Las programaciones nuevas de rondas se crean desde el panel web en *Operaciones*.`,
        `Desde este chat podés ver, asignar, reasignar o liberar las ocurrencias del día.`,
        guards_1.SEP,
        `0️⃣  Volver`,
    ].join('\n');
}
async function handleAdminRondasCreate(_session, input) {
    if (input === '0')
        return null;
    return (0, guards_1.invalidOption)(await buildAdminRondasCreate());
}
async function handleAdminRondasCreateCustom(_session, _input) {
    return buildAdminRondasCreate();
}
async function handleAdminRondasCreateLocation(_session, _input) {
    return buildAdminRondasCreate();
}
async function buildAdminRondasByEmployee(session) {
    const empleados = (await (0, db_1.getEmpleados)()).filter((empleado) => empleado.activo);
    const page = session.contextData.page ?? 1;
    const paged = (0, guards_1.paginate)(empleados, page, PAGE_SIZE);
    const lines = [
        `🚻 *Rondas por empleado*`,
        guards_1.SEP,
    ];
    for (const empleado of paged.items) {
        const rounds = await (0, db_1.listRoundOccurrencesForEmployee)(empleado.id);
        lines.push(`👷 ${empleado.nombre}`, `   Asignadas hoy: ${rounds.length}`, `   En curso: ${rounds.filter((item) => item.estado === 'en_progreso').length}`);
    }
    lines.push(guards_1.SEP);
    if (paged.hasPrev)
        lines.push(`8️⃣  ◀️ Anterior`);
    if (paged.hasNext)
        lines.push(`9️⃣  ▶️ Ver más`);
    lines.push(`0️⃣  Volver`);
    return lines.join('\n');
}
async function handleAdminRondasByEmployee(session, input) {
    const empleados = (await (0, db_1.getEmpleados)()).filter((empleado) => empleado.activo);
    const page = session.contextData.page ?? 1;
    const paged = (0, guards_1.paginate)(empleados, page, PAGE_SIZE);
    if (input === '8' && paged.hasPrev) {
        await (0, session_1.navigateTo)(session, 'admin_rondas_by_employee', { page: page - 1 });
        return buildAdminRondasByEmployee({ ...session, contextData: { page: page - 1 } });
    }
    if (input === '9' && paged.hasNext) {
        await (0, session_1.navigateTo)(session, 'admin_rondas_by_employee', { page: page + 1 });
        return buildAdminRondasByEmployee({ ...session, contextData: { page: page + 1 } });
    }
    if (input === '0')
        return null;
    return (0, guards_1.invalidOption)(await buildAdminRondasByEmployee(session));
}
