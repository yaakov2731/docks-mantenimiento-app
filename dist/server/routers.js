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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appRouter = void 0;
const zod_1 = require("zod");
const server_1 = require("@trpc/server");
const drizzle_orm_1 = require("drizzle-orm");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const trpc_1 = require("./_core/trpc");
const notification_1 = require("./_core/notification");
const env_1 = require("./_core/env");
const database = __importStar(require("./db"));
const schema = __importStar(require("../drizzle/schema"));
const service_1 = require("./rounds/service");
const schedule_1 = require("./rounds/schedule");
const reporte_assignment_1 = require("./reporte-assignment");
const db_1 = require("./db");
const roundsService = (0, service_1.createRoundsService)(database);
const attendanceActionEnum = zod_1.z.enum(db_1.ATTENDANCE_ACTIONS);
const attendancePeriodEnum = zod_1.z.enum(['dia', 'semana', 'quincena', 'mes']);
const payrollAmountSchema = zod_1.z.number().int().min(0).default(0);
const operationalTaskPriorityEnum = zod_1.z.enum(['baja', 'media', 'alta', 'urgente']);
const cobranzaSaldoEstadoEnum = zod_1.z.enum(['pendiente', 'notificado', 'pagado', 'ignorado', 'error_contacto']);
const cobranzaImportRowSchema = zod_1.z.object({
    locatarioNombre: zod_1.z.string().min(1),
    local: zod_1.z.string().optional(),
    periodo: zod_1.z.string().min(1),
    ingreso: zod_1.z.number().nullable().optional(),
    saldo: zod_1.z.number().positive(),
    diasAtraso: zod_1.z.number().int().nullable().optional(),
    telefonoWa: zod_1.z.string().nullable().optional(),
    raw: zod_1.z.unknown().optional(),
});
const operationalTaskImportItemSchema = zod_1.z.object({
    tipoTrabajo: zod_1.z.string().min(2),
    titulo: zod_1.z.string().min(3),
    descripcion: zod_1.z.string().min(3),
    ubicacion: zod_1.z.string().min(2),
    prioridad: operationalTaskPriorityEnum,
    empleadoId: zod_1.z.number().int().positive().optional(),
    ordenAsignacion: zod_1.z.number().int().min(0).optional(),
});
const BA_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
function assertAdmin(user) {
    if (user.role !== 'admin') {
        throw new server_1.TRPCError({ code: 'FORBIDDEN', message: 'Solo un admin puede realizar esta acción.' });
    }
}
function toAttendanceMs(value) {
    if (!value)
        return 0;
    if (value instanceof Date)
        return value.getTime();
    return new Date(value).getTime();
}
function formatBaDateKey(value) {
    const shifted = new Date(value - BA_OFFSET_MS);
    const year = shifted.getUTCFullYear();
    const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
    const day = String(shifted.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function getBaDayStart(value) {
    const shifted = new Date(value - BA_OFFSET_MS);
    return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) + BA_OFFSET_MS;
}
function getAttendancePeriodRange(periodo, reference = Date.now()) {
    const shifted = new Date(reference - BA_OFFSET_MS);
    const year = shifted.getUTCFullYear();
    const month = shifted.getUTCMonth();
    const day = shifted.getUTCDate();
    const weekday = shifted.getUTCDay();
    let startMs = Date.UTC(year, month, day) + BA_OFFSET_MS;
    let endMs = startMs + DAY_MS;
    if (periodo === 'semana') {
        const diffToMonday = (weekday + 6) % 7;
        startMs = Date.UTC(year, month, day - diffToMonday) + BA_OFFSET_MS;
        endMs = startMs + (7 * DAY_MS);
    }
    else if (periodo === 'quincena') {
        const startDay = day <= 15 ? 1 : 16;
        startMs = Date.UTC(year, month, startDay) + BA_OFFSET_MS;
        endMs = day <= 15
            ? Date.UTC(year, month, 16) + BA_OFFSET_MS
            : Date.UTC(year, month + 1, 1) + BA_OFFSET_MS;
    }
    else if (periodo === 'mes') {
        startMs = Date.UTC(year, month, 1) + BA_OFFSET_MS;
        endMs = Date.UTC(year, month + 1, 1) + BA_OFFSET_MS;
    }
    const desde = formatBaDateKey(startMs);
    const hasta = formatBaDateKey(endMs - 1);
    return {
        tipo: periodo,
        label: periodo === 'dia' ? 'Hoy' : periodo === 'semana' ? 'Semana' : periodo === 'quincena' ? 'Quincena' : 'Mes',
        desde,
        hasta,
        startMs,
        endMs,
    };
}
function getPeriodDayBuckets(startMs, endMs) {
    const buckets = new Map();
    for (let cursor = startMs; cursor < endMs; cursor += DAY_MS) {
        const key = formatBaDateKey(cursor);
        buckets.set(key, {
            fecha: key,
            etiqueta: new Date(cursor).toLocaleDateString('es-AR', {
                weekday: 'short',
                day: '2-digit',
            }),
            grossSeconds: 0,
            lunchSeconds: 0,
            workedSeconds: 0,
            entradas: 0,
            iniciosAlmuerzo: 0,
            finesAlmuerzo: 0,
            salidas: 0,
            turnoAbierto: false,
        });
    }
    return buckets;
}
function addSecondsToBuckets(buckets, rangeStartMs, rangeEndMs, segmentStartMs, segmentEndMs, field) {
    if (segmentStartMs === null)
        return;
    let cursor = Math.max(segmentStartMs, rangeStartMs);
    const limit = Math.min(segmentEndMs, rangeEndMs);
    while (cursor < limit) {
        const dayStart = getBaDayStart(cursor);
        const nextDay = dayStart + DAY_MS;
        const pieceEnd = Math.min(limit, nextDay);
        const bucket = buckets.get(formatBaDateKey(cursor));
        if (bucket) {
            bucket[field] += Math.max(0, Math.floor((pieceEnd - cursor) / 1000));
        }
        cursor = pieceEnd;
    }
}
function buildEmployeePeriodDays(events, period, currentAttendance) {
    const buckets = getPeriodDayBuckets(period.startMs, period.endMs);
    const sortedEvents = [...events].sort((left, right) => toAttendanceMs(left.timestamp ?? left.createdAt) - toAttendanceMs(right.timestamp ?? right.createdAt));
    for (const event of sortedEvents) {
        const eventMs = toAttendanceMs(event.timestamp ?? event.createdAt);
        const bucket = buckets.get(formatBaDateKey(eventMs));
        if (bucket && eventMs >= period.startMs && eventMs < period.endMs) {
            if (event.tipo === 'entrada')
                bucket.entradas += 1;
            if (event.tipo === 'inicio_almuerzo')
                bucket.iniciosAlmuerzo += 1;
            if (event.tipo === 'fin_almuerzo')
                bucket.finesAlmuerzo += 1;
            if (event.tipo === 'salida')
                bucket.salidas += 1;
        }
    }
    const turns = (0, db_1.buildAttendanceTurns)(events, Date.now());
    for (const turn of turns) {
        const bucket = buckets.get(turn.fecha);
        if (!bucket)
            continue;
        bucket.grossSeconds += Number(turn.grossSeconds ?? 0);
        bucket.lunchSeconds += Number(turn.lunchSeconds ?? 0);
    }
    const todayKey = formatBaDateKey(Date.now());
    return [...buckets.values()].map((bucket) => ({
        ...bucket,
        workedSeconds: Math.max(0, bucket.grossSeconds - bucket.lunchSeconds),
        turnoAbierto: currentAttendance?.onShift ? bucket.fecha === todayKey : false,
    }));
}
function getExactRateForPeriod(empleado, periodo) {
    if (periodo === 'semana')
        return Number(empleado.pagoSemanal ?? 0);
    if (periodo === 'quincena')
        return Number(empleado.pagoQuincenal ?? 0);
    if (periodo === 'mes')
        return Number(empleado.pagoMensual ?? 0);
    return Number(empleado.pagoDiario ?? 0);
}
function buildConfiguredLiquidacion(params) {
    const hasWorkedPeriod = params.diasTrabajados > 0 || params.segundosTrabajados > 0;
    const tarifaExacta = Math.max(0, getExactRateForPeriod(params.empleado, params.periodo));
    const tarifaDiaria = Math.max(0, Number(params.empleado.pagoDiario ?? 0));
    if (tarifaExacta > 0) {
        return {
            diasTrabajados: params.diasTrabajados,
            segundosTrabajados: params.segundosTrabajados,
            promedioSegundosPorDia: params.diasTrabajados > 0 ? Math.floor(params.segundosTrabajados / params.diasTrabajados) : 0,
            tarifaPeriodo: params.periodo,
            tarifaMonto: tarifaExacta,
            totalPagar: hasWorkedPeriod ? tarifaExacta : 0,
            tarifaOrigen: 'configurado',
            dias: params.dailyBuckets,
        };
    }
    if (params.periodo !== 'dia' && tarifaDiaria > 0) {
        return {
            diasTrabajados: params.diasTrabajados,
            segundosTrabajados: params.segundosTrabajados,
            promedioSegundosPorDia: params.diasTrabajados > 0 ? Math.floor(params.segundosTrabajados / params.diasTrabajados) : 0,
            tarifaPeriodo: 'dia',
            tarifaMonto: tarifaDiaria,
            totalPagar: hasWorkedPeriod ? tarifaDiaria * params.diasTrabajados : 0,
            tarifaOrigen: 'derivado',
            dias: params.dailyBuckets,
        };
    }
    return {
        diasTrabajados: params.diasTrabajados,
        segundosTrabajados: params.segundosTrabajados,
        promedioSegundosPorDia: params.diasTrabajados > 0 ? Math.floor(params.segundosTrabajados / params.diasTrabajados) : 0,
        tarifaPeriodo: params.periodo,
        tarifaMonto: 0,
        totalPagar: 0,
        tarifaOrigen: 'sin_configurar',
        dias: params.dailyBuckets,
    };
}
function mapAggregateClosure(closures) {
    if (closures.length === 0)
        return null;
    const latestClosed = [...closures].sort((left, right) => toAttendanceMs(right.closedAt) - toAttendanceMs(left.closedAt))[0];
    const latestPaid = [...closures]
        .filter((closure) => closure.pagadoAt)
        .sort((left, right) => toAttendanceMs(right.pagadoAt) - toAttendanceMs(left.pagadoAt))[0] ?? null;
    const singleClosedBy = new Set(closures.map((closure) => closure.cerradoPorNombre)).size === 1
        ? latestClosed.cerradoPorNombre
        : 'Varios';
    const allPaid = closures.every((closure) => closure.pagadoAt);
    const paidBy = allPaid
        ? new Set(closures.map((closure) => closure.pagadoPorNombre ?? '')).size === 1
            ? latestPaid?.pagadoPorNombre ?? ''
            : 'Varios'
        : null;
    return {
        cerrado: true,
        pagado: allPaid,
        closedAt: latestClosed.closedAt ?? null,
        closedBy: singleClosedBy,
        paidAt: latestPaid?.pagadoAt ?? null,
        paidBy,
        totalPagado: closures.reduce((total, closure) => total + Number(closure.totalPagar ?? 0), 0),
    };
}
async function buildAttendanceSummary(params) {
    const period = getAttendancePeriodRange(params.periodo, params.referenceDateMs);
    const [empleadosRaw, eventosRaw, cierresRaw, reportesRaw, tareasOperativasRaw] = await Promise.all([
        (0, db_1.getEmpleados)(),
        database.db.select().from(schema.empleadoAsistencia),
        database.db.select().from(schema.empleadoLiquidacionCierre),
        database.db.select().from(schema.reportes),
        (0, db_1.listOperationalTasks)(),
    ]);
    const empleados = params.empleadoId
        ? empleadosRaw.filter((empleado) => empleado.id === params.empleadoId)
        : empleadosRaw;
    const cierresPeriodo = cierresRaw.filter((cierre) => cierre.periodoTipo === params.periodo &&
        cierre.periodoDesde === period.desde &&
        cierre.periodoHasta === period.hasta);
    const cierresByEmpleado = new Map();
    for (const cierre of cierresPeriodo) {
        const current = cierresByEmpleado.get(cierre.empleadoId);
        if (!current || toAttendanceMs(cierre.closedAt) > toAttendanceMs(current.closedAt)) {
            cierresByEmpleado.set(cierre.empleadoId, cierre);
        }
    }
    const eventos = eventosRaw
        .filter((evento) => {
        const eventoMs = toAttendanceMs(evento.timestamp ?? evento.createdAt);
        return eventoMs >= period.startMs && eventoMs < period.endMs;
    })
        .filter((evento) => !params.empleadoId || evento.empleadoId === params.empleadoId)
        .sort((left, right) => toAttendanceMs(right.timestamp ?? right.createdAt) - toAttendanceMs(left.timestamp ?? left.createdAt))
        .map((evento) => {
        const empleado = empleadosRaw.find((item) => item.id === evento.empleadoId);
        return {
            ...evento,
            empleadoId: evento.empleadoId,
            empleadoNombre: empleado?.nombre ?? `Empleado ${evento.empleadoId}`,
            especialidad: empleado?.especialidad ?? null,
        };
    });
    const todayKey = formatBaDateKey(Date.now());
    const empleadosSummary = await Promise.all(empleados.map(async (empleado) => {
        const employeeEvents = eventosRaw.filter((evento) => evento.empleadoId === empleado.id);
        const attendance = await (0, db_1.getEmpleadoAttendanceStatus)(empleado.id);
        const dailyBuckets = buildEmployeePeriodDays(employeeEvents, period, attendance);
        const periodTurns = (0, db_1.buildAttendanceTurns)(employeeEvents)
            .filter((turn) => {
            const entryMs = turn.entradaAt instanceof Date ? turn.entradaAt.getTime() : 0;
            const exitMs = turn.salidaAt instanceof Date ? turn.salidaAt.getTime() : Date.now();
            return exitMs > period.startMs && entryMs < period.endMs;
        })
            .map((turn) => ({
            ...turn,
            fecha: turn.fecha,
            etiqueta: turn.entradaAt instanceof Date
                ? turn.entradaAt.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
                : turn.fecha,
        }));
        const todayEvents = employeeEvents.filter((evento) => formatBaDateKey(toAttendanceMs(evento.timestamp ?? evento.createdAt)) === todayKey);
        const todayEntries = todayEvents
            .filter((evento) => evento.tipo === 'entrada')
            .sort((left, right) => toAttendanceMs(left.timestamp ?? left.createdAt) - toAttendanceMs(right.timestamp ?? right.createdAt));
        const todayExits = todayEvents
            .filter((evento) => evento.tipo === 'salida')
            .sort((left, right) => toAttendanceMs(right.timestamp ?? right.createdAt) - toAttendanceMs(left.timestamp ?? left.createdAt));
        const reportes = reportesRaw.filter((reporte) => reporte.asignadoId === empleado.id &&
            !['completado', 'cancelado'].includes(reporte.estado));
        const tareasOperativas = tareasOperativasRaw.filter((task) => task.empleadoId === empleado.id &&
            !['terminada', 'cancelada', 'rechazada'].includes(task.estado));
        const cierre = cierresByEmpleado.get(empleado.id) ?? null;
        const segundosTrabajados = dailyBuckets.reduce((total, day) => total + Number(day.workedSeconds ?? 0), 0);
        const diasTrabajados = dailyBuckets.filter((day) => day.workedSeconds > 0 ||
            day.entradas > 0 ||
            day.salidas > 0 ||
            day.iniciosAlmuerzo > 0 ||
            day.finesAlmuerzo > 0).length;
        const liquidacion = cierre ? {
            diasTrabajados: cierre.diasTrabajados,
            segundosTrabajados: cierre.segundosTrabajados,
            promedioSegundosPorDia: cierre.promedioSegundosPorDia,
            tarifaPeriodo: cierre.tarifaPeriodo,
            tarifaMonto: cierre.tarifaMonto,
            totalPagar: cierre.totalPagar,
            tarifaOrigen: 'cierre',
            dias: dailyBuckets,
        } : buildConfiguredLiquidacion({
            empleado,
            periodo: params.periodo,
            diasTrabajados,
            segundosTrabajados,
            dailyBuckets,
        });
        return {
            empleadoId: empleado.id,
            nombre: empleado.nombre,
            especialidad: empleado.especialidad ?? null,
            attendance,
            turnos: periodTurns,
            hoy: {
                primerIngresoAt: todayEntries[0] ? (todayEntries[0].timestamp ?? todayEntries[0].createdAt) : null,
                ultimaSalidaAt: todayExits[0] ? (todayExits[0].timestamp ?? todayExits[0].createdAt) : null,
            },
            liquidacion,
            pagoDiario: Number(empleado.pagoDiario ?? 0),
            pagoSemanal: Number(empleado.pagoSemanal ?? 0),
            pagoQuincenal: Number(empleado.pagoQuincenal ?? 0),
            pagoMensual: Number(empleado.pagoMensual ?? 0),
            cierre,
            tareasEnCurso: reportes.filter((reporte) => reporte.estado === 'en_progreso').length +
                tareasOperativas.filter((task) => task.estado === 'en_progreso').length,
            tareasPausadas: reportes.filter((reporte) => reporte.estado === 'pausado').length +
                tareasOperativas.filter((task) => task.estado === 'pausada').length,
            tareasPendientes: reportes.filter((reporte) => reporte.estado === 'pendiente').length +
                tareasOperativas.filter((task) => ['pendiente_asignacion', 'pendiente_confirmacion'].includes(task.estado)).length,
            pendientesConfirmacion: reportes.filter((reporte) => reporte.asignacionEstado === 'pendiente_confirmacion').length +
                tareasOperativas.filter((task) => task.estado === 'pendiente_confirmacion').length,
        };
    }));
    const includedClosures = empleadosSummary
        .map((empleado) => empleado.cierre)
        .filter(Boolean);
    const topLevelClosure = includedClosures.length === empleadosSummary.length && empleadosSummary.length > 0
        ? mapAggregateClosure(includedClosures)
        : null;
    return {
        periodo: period,
        empleados: empleadosSummary,
        eventos,
        resumenEquipo: {
            empleadosActivos: empleadosSummary.length,
            enTurno: empleadosSummary.filter((empleado) => empleado.attendance?.onShift).length,
            horasPeriodoSegundos: empleadosSummary.reduce((total, empleado) => total + Number(empleado.liquidacion?.segundosTrabajados ?? 0), 0),
            diasLiquidados: empleadosSummary.reduce((total, empleado) => total + Number(empleado.liquidacion?.diasTrabajados ?? 0), 0),
            totalPagar: empleadosSummary.reduce((total, empleado) => total + Number(empleado.liquidacion?.totalPagar ?? 0), 0),
            pendientesConfirmacion: empleadosSummary.reduce((total, empleado) => total + Number(empleado.pendientesConfirmacion ?? 0), 0),
        },
        cierre: topLevelClosure,
    };
}
async function replaceLiquidacionClosure(params) {
    const summary = await buildAttendanceSummary(params);
    const period = summary.periodo;
    for (const empleado of summary.empleados) {
        await database.db.delete(schema.empleadoLiquidacionCierre).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.empleadoLiquidacionCierre.empleadoId, empleado.empleadoId), (0, drizzle_orm_1.eq)(schema.empleadoLiquidacionCierre.periodoTipo, params.periodo), (0, drizzle_orm_1.eq)(schema.empleadoLiquidacionCierre.periodoDesde, period.desde), (0, drizzle_orm_1.eq)(schema.empleadoLiquidacionCierre.periodoHasta, period.hasta))).run();
        await database.db.insert(schema.empleadoLiquidacionCierre).values({
            empleadoId: empleado.empleadoId,
            periodoTipo: params.periodo,
            periodoDesde: period.desde,
            periodoHasta: period.hasta,
            diasTrabajados: empleado.liquidacion?.diasTrabajados ?? 0,
            segundosTrabajados: empleado.liquidacion?.segundosTrabajados ?? 0,
            promedioSegundosPorDia: empleado.liquidacion?.promedioSegundosPorDia ?? 0,
            pagoDiario: empleado.pagoDiario ?? 0,
            pagoSemanal: empleado.pagoSemanal ?? 0,
            pagoQuincenal: empleado.pagoQuincenal ?? 0,
            pagoMensual: empleado.pagoMensual ?? 0,
            tarifaPeriodo: empleado.liquidacion?.tarifaPeriodo ?? params.periodo,
            tarifaMonto: empleado.liquidacion?.tarifaMonto ?? 0,
            totalPagar: empleado.liquidacion?.totalPagar ?? 0,
            cerradoPorId: params.admin.id,
            cerradoPorNombre: params.admin.name,
            closedAt: new Date(),
            pagadoAt: null,
            pagadoPorId: null,
            pagadoPorNombre: null,
        }).run();
    }
    return { success: true, closed: summary.empleados.length };
}
async function markLiquidacionAsPaid(params) {
    const period = getAttendancePeriodRange(params.periodo);
    const empleados = params.empleadoId ? [params.empleadoId] : (await (0, db_1.getEmpleados)()).map((empleado) => empleado.id);
    let updated = 0;
    for (const empleadoId of empleados) {
        const rows = await database.db.select().from(schema.empleadoLiquidacionCierre).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.empleadoLiquidacionCierre.empleadoId, empleadoId), (0, drizzle_orm_1.eq)(schema.empleadoLiquidacionCierre.periodoTipo, params.periodo), (0, drizzle_orm_1.eq)(schema.empleadoLiquidacionCierre.periodoDesde, period.desde), (0, drizzle_orm_1.eq)(schema.empleadoLiquidacionCierre.periodoHasta, period.hasta)));
        const current = rows[0] ?? null;
        if (!current)
            continue;
        await database.db.update(schema.empleadoLiquidacionCierre).set({
            pagadoAt: new Date(),
            pagadoPorId: params.admin.id,
            pagadoPorNombre: params.admin.name,
        }).where((0, drizzle_orm_1.eq)(schema.empleadoLiquidacionCierre.id, current.id)).run();
        updated += 1;
    }
    return { success: true, updated };
}
exports.appRouter = (0, trpc_1.router)({
    auth: (0, trpc_1.router)({
        me: trpc_1.publicProcedure.query(({ ctx }) => ctx.user ?? null),
        login: trpc_1.publicProcedure
            .input(zod_1.z.object({ username: zod_1.z.string(), password: zod_1.z.string() }))
            .mutation(async ({ input, ctx }) => {
            const user = await (0, db_1.getUserByUsername)(input.username);
            if (!user)
                throw new server_1.TRPCError({ code: 'UNAUTHORIZED', message: 'Usuario o contraseña incorrectos' });
            const ok = await bcryptjs_1.default.compare(input.password, user.password);
            if (!ok)
                throw new server_1.TRPCError({ code: 'UNAUTHORIZED', message: 'Usuario o contraseña incorrectos' });
            const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, name: user.name, role: user.role }, (0, env_1.readEnv)('SESSION_SECRET') ?? 'dev-secret-change-me', { expiresIn: '7d' });
            ctx.res.cookie(trpc_1.JWT_COOKIE, token, {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            return { success: true, user: { id: user.id, name: user.name, role: user.role } };
        }),
        logout: trpc_1.publicProcedure.mutation(({ ctx }) => {
            ctx.res.clearCookie(trpc_1.JWT_COOKIE);
            return { success: true };
        }),
    }),
    reportes: (0, trpc_1.router)({
        crear: trpc_1.publicProcedure
            .input(zod_1.z.object({
            locatario: zod_1.z.string().min(1),
            local: zod_1.z.string().min(1),
            planta: zod_1.z.enum(['baja', 'alta']),
            contacto: zod_1.z.string().optional(),
            emailLocatario: zod_1.z.string().optional(),
            categoria: zod_1.z.enum(['electrico', 'plomeria', 'estructura', 'limpieza', 'seguridad', 'climatizacion', 'otro']),
            prioridad: zod_1.z.enum(['baja', 'media', 'alta', 'urgente']),
            titulo: zod_1.z.string().min(1).max(500),
            descripcion: zod_1.z.string().min(10),
            fotos: zod_1.z.string().optional(),
        }))
            .mutation(async ({ input }) => {
            const id = await (0, db_1.crearReporte)(input);
            (0, notification_1.notifyOwner)({
                title: `[${input.prioridad.toUpperCase()}] Nuevo reclamo — ${input.local}`,
                content: `${input.locatario} reportó: ${input.titulo}`,
                urgent: input.prioridad === 'urgente',
            }).catch(console.error);
            return { success: true, id };
        }),
        listar: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            estado: zod_1.z.string().optional(),
            prioridad: zod_1.z.string().optional(),
            busqueda: zod_1.z.string().optional(),
        }).optional())
            .query(({ input }) => (0, db_1.getReportes)(input)),
        obtener: trpc_1.protectedProcedure
            .input(zod_1.z.object({ id: zod_1.z.number() }))
            .query(async ({ input }) => {
            const reporte = await (0, db_1.getReporteById)(input.id);
            if (!reporte)
                throw new server_1.TRPCError({ code: 'NOT_FOUND' });
            const actualizaciones = await (0, db_1.getActualizacionesByReporte)(input.id);
            return { ...reporte, actualizaciones };
        }),
        actualizarEstado: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            id: zod_1.z.number(),
            estado: zod_1.z.enum(['pendiente', 'en_progreso', 'pausado', 'completado', 'cancelado']),
            nota: zod_1.z.string().optional(),
        }))
            .mutation(async ({ input, ctx }) => {
            const reporte = await (0, db_1.getReporteById)(input.id);
            if (!reporte)
                throw new server_1.TRPCError({ code: 'NOT_FOUND' });
            if (input.estado === 'en_progreso') {
                // Block: can't go to en_progreso until employee accepts via WhatsApp
                if (reporte.asignacionEstado === 'pendiente_confirmacion') {
                    throw new server_1.TRPCError({
                        code: 'PRECONDITION_FAILED',
                        message: 'Esperando confirmación del empleado vía WhatsApp',
                    });
                }
                await (0, db_1.iniciarTrabajoReporte)(input.id);
            }
            else if (input.estado === 'pausado') {
                await (0, db_1.pausarTrabajoReporte)(input.id);
            }
            else if (input.estado === 'completado') {
                await (0, db_1.completarTrabajoReporte)(input.id);
            }
            else {
                await (0, db_1.actualizarReporte)(input.id, { estado: input.estado });
            }
            await (0, db_1.crearActualizacion)({
                reporteId: input.id,
                usuarioId: ctx.user.id,
                usuarioNombre: ctx.user.name,
                tipo: input.estado === 'completado' ? 'completado' : 'estado',
                descripcion: input.nota ?? `Estado actualizado a: ${input.estado}`,
                estadoAnterior: reporte.estado,
                estadoNuevo: input.estado,
            });
            if (input.estado === 'completado') {
                (0, notification_1.notifyCompleted)({ title: `Reclamo #${input.id} completado`, content: reporte.titulo }).catch(console.error);
            }
            return { success: true };
        }),
        asignar: trpc_1.protectedProcedure
            .input(zod_1.z.object({ id: zod_1.z.number(), empleadoNombre: zod_1.z.string(), empleadoId: zod_1.z.number().optional() }))
            .mutation(async ({ input, ctx }) => {
            try {
                await (0, reporte_assignment_1.assignReporteToEmployee)({
                    reporteId: input.id,
                    empleadoId: input.empleadoId,
                    empleadoNombre: input.empleadoNombre,
                    actor: { id: ctx.user.id, name: ctx.user.name },
                });
            }
            catch (error) {
                if (error?.message === 'Reporte no encontrado') {
                    throw new server_1.TRPCError({ code: 'NOT_FOUND', message: error.message });
                }
                if (error?.message === 'Empleado no encontrado') {
                    throw new server_1.TRPCError({ code: 'NOT_FOUND', message: error.message });
                }
                throw error;
            }
            return { success: true };
        }),
        agregarNota: trpc_1.protectedProcedure
            .input(zod_1.z.object({ id: zod_1.z.number(), nota: zod_1.z.string().min(1) }))
            .mutation(async ({ input, ctx }) => {
            await (0, db_1.crearActualizacion)({
                reporteId: input.id,
                usuarioId: ctx.user.id,
                usuarioNombre: ctx.user.name,
                tipo: 'nota',
                descripcion: input.nota,
            });
            return { success: true };
        }),
        eliminar: trpc_1.protectedProcedure
            .input(zod_1.z.object({ id: zod_1.z.number() }))
            .mutation(async ({ input, ctx }) => {
            assertAdmin(ctx.user);
            await (0, db_1.eliminarReporte)(input.id);
            return { success: true };
        }),
        estadisticas: trpc_1.protectedProcedure.query(() => (0, db_1.getEstadisticas)()),
    }),
    leads: (0, trpc_1.router)({
        crear: trpc_1.publicProcedure
            .input(zod_1.z.object({
            nombre: zod_1.z.string().min(1),
            telefono: zod_1.z.string().optional(),
            email: zod_1.z.string().optional(),
            waId: zod_1.z.string().optional(),
            rubro: zod_1.z.string().optional(),
            tipoLocal: zod_1.z.string().optional(),
            mensaje: zod_1.z.string().optional(),
            turnoFecha: zod_1.z.string().optional(),
            turnoHora: zod_1.z.string().optional(),
            fuente: zod_1.z.enum(['whatsapp', 'web', 'otro']).default('web'),
        }))
            .mutation(async ({ input }) => {
            const id = await (0, db_1.crearLead)(input);
            (0, notification_1.notifyOwner)({
                title: `Nuevo lead de alquiler`,
                content: `${input.nombre} (${input.telefono ?? input.email ?? 'sin contacto'}) — ${input.rubro ?? 'sin rubro'}`,
            }).catch(console.error);
            return { success: true, id };
        }),
        listar: trpc_1.protectedProcedure
            .input(zod_1.z.object({ estado: zod_1.z.string().optional() }).optional())
            .query(({ input }) => (0, db_1.getLeads)(input)),
        obtener: trpc_1.protectedProcedure
            .input(zod_1.z.object({ id: zod_1.z.number() }))
            .query(async ({ input }) => {
            const lead = await (0, db_1.getLeadById)(input.id);
            if (!lead)
                throw new server_1.TRPCError({ code: 'NOT_FOUND' });
            return lead;
        }),
        actualizar: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            id: zod_1.z.number(),
            estado: zod_1.z.enum(['nuevo', 'contactado', 'visito', 'cerrado', 'descartado']).optional(),
            turnoFecha: zod_1.z.string().optional(),
            turnoHora: zod_1.z.string().optional(),
            notas: zod_1.z.string().optional(),
            asignadoA: zod_1.z.string().optional(),
            asignadoId: zod_1.z.number().optional(),
        }))
            .mutation(async ({ input }) => {
            const { id, ...data } = input;
            const leadBeforeUpdate = await (0, db_1.getLeadById)(id);
            if (!leadBeforeUpdate)
                throw new server_1.TRPCError({ code: 'NOT_FOUND', message: 'Lead no encontrado' });
            await (0, db_1.actualizarLead)(id, data);
            let notificationSent = false;
            let notificationWarning = null;
            if (typeof input.asignadoId === 'number') {
                const assignedUser = await (0, db_1.getUserById)(input.asignadoId);
                if (assignedUser?.waId) {
                    const message = buildLeadAssignmentMessage({
                        lead: { ...leadBeforeUpdate, ...data },
                        assignedUserName: assignedUser.name,
                    });
                    await (0, db_1.enqueueBotMessage)(assignedUser.waId, message);
                    notificationSent = true;
                }
                else {
                    notificationWarning = 'El usuario asignado no tiene WhatsApp cargado.';
                }
            }
            return { success: true, notificationSent, notificationWarning };
        }),
        eliminar: trpc_1.protectedProcedure
            .input(zod_1.z.object({ id: zod_1.z.number() }))
            .mutation(async ({ input, ctx }) => {
            assertAdmin(ctx.user);
            await (0, db_1.deleteLeadById)(input.id);
            return { success: true };
        }),
    }),
    rondas: (0, trpc_1.router)({
        crearPlantilla: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            nombre: zod_1.z.string().min(3),
            descripcion: zod_1.z.string().optional(),
            intervaloHoras: zod_1.z.number().min(1).max(12),
            checklistObjetivo: zod_1.z.string().optional(),
        }))
            .mutation(({ input }) => (0, db_1.createRoundTemplate)(input)),
        guardarProgramacion: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            plantillaId: zod_1.z.number(),
            modoProgramacion: zod_1.z.enum(['semanal', 'fecha_especial']),
            diaSemana: zod_1.z.number().min(0).max(6).optional(),
            fechaEspecial: zod_1.z.string().optional(),
            horaInicio: zod_1.z.string(),
            horaFin: zod_1.z.string(),
            empleadoId: zod_1.z.number(),
            supervisorUserId: zod_1.z.number().optional(),
            escalacionHabilitada: zod_1.z.boolean().default(true),
        }))
            .mutation(({ input }) => (0, schedule_1.saveRoundScheduleAndSyncToday)({
            saveRoundSchedule: db_1.saveRoundSchedule,
            createDailyOccurrences: (dateKey) => roundsService.createDailyOccurrences(dateKey),
        }, input)),
        resumenHoy: trpc_1.protectedProcedure.query(() => (0, db_1.getRoundOverviewForDashboard)()),
        timeline: trpc_1.protectedProcedure
            .input(zod_1.z.object({ fechaOperativa: zod_1.z.string() }))
            .query(({ input }) => (0, db_1.getRoundTimeline)(input.fechaOperativa)),
        asignarOcurrencia: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            occurrenceId: zod_1.z.number(),
            empleadoId: zod_1.z.number(),
        }))
            .mutation(async ({ input, ctx }) => {
            assertAdmin(ctx.user);
            return roundsService.assignOccurrence({
                occurrenceId: input.occurrenceId,
                empleadoId: input.empleadoId,
                actor: {
                    id: ctx.user.id,
                    name: ctx.user.name,
                },
            });
        }),
        liberarOcurrencia: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            occurrenceId: zod_1.z.number(),
        }))
            .mutation(async ({ input, ctx }) => {
            assertAdmin(ctx.user);
            return roundsService.releaseOccurrence({
                occurrenceId: input.occurrenceId,
                actor: {
                    id: ctx.user.id,
                    name: ctx.user.name,
                },
            });
        }),
        eliminarOcurrencia: trpc_1.protectedProcedure
            .input(zod_1.z.object({ occurrenceId: zod_1.z.number() }))
            .mutation(async ({ input, ctx }) => {
            assertAdmin(ctx.user);
            await (0, db_1.deleteRoundOccurrence)(input.occurrenceId);
        }),
        reprogramarOcurrencia: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            occurrenceId: zod_1.z.number(),
            programadoAt: zod_1.z.string(), // ISO datetime string
            fechaOperativa: zod_1.z.string(), // YYYY-MM-DD
        }))
            .mutation(async ({ input, ctx }) => {
            assertAdmin(ctx.user);
            const date = new Date(input.programadoAt);
            const label = date.toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'America/Argentina/Buenos_Aires',
            });
            await (0, db_1.reprogramarRoundOccurrence)(input.occurrenceId, date, input.fechaOperativa, label);
        }),
    }),
    tareasOperativas: (0, trpc_1.router)({
        crear: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            tipoTrabajo: zod_1.z.string().min(2),
            titulo: zod_1.z.string().min(3),
            descripcion: zod_1.z.string().min(3),
            ubicacion: zod_1.z.string().min(2),
            prioridad: operationalTaskPriorityEnum,
            empleadoId: zod_1.z.number().optional(),
        }))
            .mutation(async ({ input }) => {
            let empleado = null;
            if (typeof input.empleadoId === 'number') {
                empleado = await (0, db_1.getEmpleadoById)(input.empleadoId);
                if (!empleado)
                    throw new server_1.TRPCError({ code: 'NOT_FOUND', message: 'Empleado no encontrado' });
            }
            const id = await (0, db_1.createOperationalTask)({
                origen: 'manual',
                tipoTrabajo: input.tipoTrabajo,
                titulo: input.titulo,
                descripcion: input.descripcion,
                ubicacion: input.ubicacion,
                prioridad: input.prioridad,
                empleadoId: input.empleadoId,
                empleadoNombre: empleado?.nombre ?? undefined,
                empleadoWaId: empleado?.waId ?? undefined,
            });
            if (empleado) {
                await notifyOperationalTaskAssignment(id, empleado);
            }
            return { success: true, id };
        }),
        importarExcel: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            nombreArchivo: zod_1.z.string().max(180).optional(),
            tareas: zod_1.z.array(operationalTaskImportItemSchema).min(1).max(300),
        }))
            .mutation(async ({ input, ctx }) => {
            assertAdmin(ctx.user);
            const employeeIds = [...new Set(input.tareas
                    .map((task) => task.empleadoId)
                    .filter((id) => typeof id === 'number'))];
            const empleadosById = new Map();
            for (const empleadoId of employeeIds) {
                const empleado = await (0, db_1.getEmpleadoById)(empleadoId);
                if (!empleado) {
                    throw new server_1.TRPCError({ code: 'NOT_FOUND', message: `Empleado ${empleadoId} no encontrado` });
                }
                empleadosById.set(empleadoId, empleado);
            }
            const orderByEmployee = new Map();
            const created = [];
            for (const [index, task] of input.tareas.entries()) {
                const empleado = task.empleadoId ? empleadosById.get(task.empleadoId) ?? null : null;
                const employeeKey = empleado?.id ? String(empleado.id) : 'sin-asignar';
                const nextOrder = (orderByEmployee.get(employeeKey) ?? 0) + 1;
                orderByEmployee.set(employeeKey, nextOrder);
                const id = await (0, db_1.createOperationalTask)({
                    origen: 'manual',
                    tipoTrabajo: task.tipoTrabajo.trim(),
                    titulo: task.titulo.trim(),
                    descripcion: task.descripcion.trim(),
                    ubicacion: task.ubicacion.trim(),
                    prioridad: task.prioridad,
                    empleadoId: empleado?.id,
                    empleadoNombre: empleado?.nombre ?? undefined,
                    empleadoWaId: empleado?.waId ?? undefined,
                    ordenAsignacion: task.ordenAsignacion ?? nextOrder ?? index + 1,
                });
                created.push({
                    id,
                    titulo: task.titulo.trim(),
                    ubicacion: task.ubicacion.trim(),
                    prioridad: task.prioridad,
                    empleadoId: empleado?.id,
                });
            }
            let notificaciones = 0;
            for (const empleadoId of employeeIds) {
                const empleado = empleadosById.get(empleadoId);
                if (!empleado)
                    continue;
                const tareas = created.filter((task) => task.empleadoId === empleadoId);
                if (tareas.length === 0)
                    continue;
                const notified = await notifyOperationalTaskBatchAssignment({
                    employee: empleado,
                    tasks: tareas,
                    sourceName: input.nombreArchivo,
                });
                if (notified)
                    notificaciones += 1;
            }
            return {
                success: true,
                creadas: created.length,
                asignadas: created.filter((task) => task.empleadoId).length,
                sinAsignar: created.filter((task) => !task.empleadoId).length,
                notificaciones,
                ids: created.map((task) => task.id),
            };
        }),
        crearDesdeReclamo: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            reporteId: zod_1.z.number(),
            tipoTrabajo: zod_1.z.string().min(2),
            empleadoId: zod_1.z.number().optional(),
        }))
            .mutation(async ({ input }) => {
            try {
                const empleado = typeof input.empleadoId === 'number'
                    ? await (0, db_1.getEmpleadoById)(input.empleadoId)
                    : null;
                const result = await (0, db_1.createOperationalTaskFromReporte)(input);
                if (empleado) {
                    await notifyOperationalTaskAssignment(result.id, empleado);
                }
                return {
                    success: true,
                    ...result,
                };
            }
            catch (error) {
                if (error?.message === 'Reporte no encontrado') {
                    throw new server_1.TRPCError({ code: 'NOT_FOUND', message: error.message });
                }
                if (error?.message === 'Empleado no encontrado') {
                    throw new server_1.TRPCError({ code: 'NOT_FOUND', message: error.message });
                }
                throw error;
            }
        }),
        listar: trpc_1.protectedProcedure.query(() => (0, db_1.listOperationalTasks)()),
        listarPorEmpleado: trpc_1.protectedProcedure
            .input(zod_1.z.object({ empleadoId: zod_1.z.number() }))
            .query(({ input }) => (0, db_1.listOperationalTasksByEmployee)(input.empleadoId)),
        eliminarLote: trpc_1.protectedProcedure
            .input(zod_1.z.object({ ids: zod_1.z.array(zod_1.z.number()).min(1) }))
            .mutation(async ({ input, ctx }) => {
            assertAdmin(ctx.user);
            const deleted = await (0, db_1.deleteOperationalTasks)(input.ids);
            return { success: true, deleted };
        }),
        resumenHoy: trpc_1.protectedProcedure.query(() => (0, db_1.getOperationalTasksOverview)()),
    }),
    cobranzas: (0, trpc_1.router)({
        resumen: trpc_1.protectedProcedure.query(async ({ ctx }) => {
            assertCollectionsAccess(ctx.user);
            const [saldos, importaciones, notificaciones] = await Promise.all([
                (0, db_1.listCobranzaSaldos)(),
                (0, db_1.listCobranzaImportaciones)(),
                (0, db_1.listCobranzaNotificaciones)(),
            ]);
            const accionables = saldos.filter((saldo) => Number(saldo.saldo ?? 0) > 0 && !['pagado', 'ignorado'].includes(saldo.estado));
            return {
                totalSaldo: accionables.reduce((total, saldo) => total + Number(saldo.saldo ?? 0), 0),
                pendientes: saldos.filter((saldo) => saldo.estado === 'pendiente').length,
                sinWhatsapp: saldos.filter((saldo) => saldo.estado === 'error_contacto' || !saldo.telefonoWa).length,
                notificados: saldos.filter((saldo) => saldo.estado === 'notificado').length,
                importaciones: importaciones.length,
                envios: notificaciones.filter((item) => item.status === 'queued').length,
            };
        }),
        listarLocatarios: trpc_1.protectedProcedure.query(({ ctx }) => {
            assertCollectionsAccess(ctx.user);
            return (0, db_1.listLocatariosCobranza)();
        }),
        guardarLocatario: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            id: zod_1.z.number().optional(),
            nombre: zod_1.z.string().min(1),
            local: zod_1.z.string().min(1),
            telefonoWa: zod_1.z.string().optional().nullable(),
            email: zod_1.z.string().optional().nullable(),
            cuit: zod_1.z.string().optional().nullable(),
            notas: zod_1.z.string().optional().nullable(),
        }))
            .mutation(async ({ input, ctx }) => {
            assertCollectionsAccess(ctx.user);
            const id = await (0, db_1.upsertLocatarioCobranza)(input);
            return { success: true, id };
        }),
        guardarImportacion: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            filename: zod_1.z.string().min(1).max(220),
            sourceType: zod_1.z.enum(['pdf', 'xlsx', 'csv', 'manual']),
            periodLabel: zod_1.z.string().min(1).max(80),
            fechaCorte: zod_1.z.string().optional().nullable(),
            totalRows: zod_1.z.number().int().min(0),
            rows: zod_1.z.array(cobranzaImportRowSchema).min(1).max(500),
        }))
            .mutation(async ({ input, ctx }) => {
            assertCollectionsAccess(ctx.user);
            const result = await (0, db_1.saveCobranzaImportacion)({
                ...input,
                importedBy: { id: ctx.user.id, name: ctx.user.name },
            });
            return { success: true, ...result };
        }),
        listarImportaciones: trpc_1.protectedProcedure.query(({ ctx }) => {
            assertCollectionsAccess(ctx.user);
            return (0, db_1.listCobranzaImportaciones)();
        }),
        listarSaldos: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            estado: cobranzaSaldoEstadoEnum.optional(),
            importacionId: zod_1.z.number().optional(),
            busqueda: zod_1.z.string().optional(),
        }).optional())
            .query(({ input, ctx }) => {
            assertCollectionsAccess(ctx.user);
            return (0, db_1.listCobranzaSaldos)(input);
        }),
        actualizarContactoSaldo: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            id: zod_1.z.number(),
            telefonoWa: zod_1.z.string().optional().nullable(),
            locatarioId: zod_1.z.number().optional().nullable(),
        }))
            .mutation(async ({ input, ctx }) => {
            assertCollectionsAccess(ctx.user);
            await (0, db_1.updateCobranzaSaldoContacto)(input.id, input.telefonoWa, input.locatarioId);
            return { success: true };
        }),
        marcarEstado: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            id: zod_1.z.number(),
            estado: cobranzaSaldoEstadoEnum,
        }))
            .mutation(async ({ input, ctx }) => {
            assertCollectionsAccess(ctx.user);
            await (0, db_1.updateCobranzaSaldoEstado)(input.id, input.estado);
            return { success: true };
        }),
        prepararMensajes: trpc_1.protectedProcedure
            .input(zod_1.z.object({ saldoIds: zod_1.z.array(zod_1.z.number()).min(1).max(100) }))
            .query(async ({ input, ctx }) => {
            assertCollectionsAccess(ctx.user);
            const saldos = await Promise.all(input.saldoIds.map((id) => (0, db_1.getCobranzaSaldoById)(id)));
            return saldos
                .filter(Boolean)
                .map((saldo) => ({
                saldoId: saldo.id,
                locatarioNombre: saldo.locatarioNombre,
                local: saldo.local,
                saldo: saldo.saldo,
                telefonoWa: saldo.telefonoWa,
                puedeEnviar: Boolean(saldo.telefonoWa) && Number(saldo.saldo ?? 0) > 0,
                message: buildCobranzaMessage(saldo),
            }));
        }),
        encolarNotificaciones: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            mensajes: zod_1.z.array(zod_1.z.object({
                saldoId: zod_1.z.number(),
                waNumber: zod_1.z.string().optional().nullable(),
                message: zod_1.z.string().min(10).max(1200),
            })).min(1).max(100),
            reenviar: zod_1.z.boolean().default(false),
        }))
            .mutation(async ({ input, ctx }) => {
            assertCollectionsAccess(ctx.user);
            const saldoIds = input.mensajes.map((item) => item.saldoId);
            const existing = await (0, db_1.getCobranzaNotificationsBySaldoIds)(saldoIds);
            const alreadyQueued = new Set(existing.filter((item) => item.status === 'queued').map((item) => item.saldoId));
            let queued = 0;
            let skipped = 0;
            for (const item of input.mensajes) {
                const saldo = await (0, db_1.getCobranzaSaldoById)(item.saldoId);
                if (!saldo) {
                    skipped += 1;
                    continue;
                }
                const waNumber = item.waNumber || saldo.telefonoWa;
                if (!waNumber || (!input.reenviar && alreadyQueued.has(item.saldoId))) {
                    await (0, db_1.createCobranzaNotification)({
                        saldo,
                        waNumber,
                        message: item.message,
                        status: 'skipped',
                        sentBy: { id: ctx.user.id, name: ctx.user.name },
                    });
                    skipped += 1;
                    continue;
                }
                const botQueueId = await (0, db_1.enqueueBotMessage)(waNumber, item.message);
                if (!botQueueId) {
                    await (0, db_1.createCobranzaNotification)({
                        saldo,
                        waNumber,
                        message: item.message,
                        status: 'skipped',
                        sentBy: { id: ctx.user.id, name: ctx.user.name },
                    });
                    await (0, db_1.updateCobranzaSaldoEstado)(saldo.id, 'error_contacto');
                    skipped += 1;
                    continue;
                }
                await (0, db_1.createCobranzaNotification)({
                    saldo,
                    waNumber,
                    message: item.message,
                    status: 'queued',
                    botQueueId,
                    sentBy: { id: ctx.user.id, name: ctx.user.name },
                });
                await (0, db_1.updateCobranzaSaldoEstado)(saldo.id, 'notificado');
                queued += 1;
            }
            return { success: true, queued, skipped };
        }),
        historialEnvios: trpc_1.protectedProcedure.query(({ ctx }) => {
            assertCollectionsAccess(ctx.user);
            return (0, db_1.listCobranzaNotificaciones)();
        }),
        borrarLista: trpc_1.protectedProcedure.mutation(async ({ ctx }) => {
            assertCollectionsAccess(ctx.user);
            const result = await (0, db_1.clearCobranzaLista)();
            return { success: true, ...result };
        }),
    }),
    usuarios: (0, trpc_1.router)({
        listar: trpc_1.protectedProcedure.query(({ ctx }) => {
            assertAdmin(ctx.user);
            return (0, db_1.getUsers)();
        }),
        listarComerciales: trpc_1.protectedProcedure.query(() => (0, db_1.getSalesUsers)()),
        crear: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            username: zod_1.z.string().min(3),
            password: zod_1.z.string().min(6),
            name: zod_1.z.string().min(1),
            role: zod_1.z.enum(['admin', 'sales', 'collections']),
            waId: zod_1.z.string().optional(),
        }))
            .mutation(async ({ input, ctx }) => {
            assertAdmin(ctx.user);
            const existing = await (0, db_1.getUserByUsername)(input.username);
            if (existing)
                throw new server_1.TRPCError({ code: 'CONFLICT', message: 'Ese usuario ya existe' });
            await (0, db_1.createPanelUser)(input);
            return { success: true };
        }),
        cambiarClave: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            id: zod_1.z.number(),
            password: zod_1.z.string().min(6),
        }))
            .mutation(async ({ input, ctx }) => {
            assertAdmin(ctx.user);
            const user = await (0, db_1.getUserById)(input.id);
            if (!user)
                throw new server_1.TRPCError({ code: 'NOT_FOUND', message: 'Usuario no encontrado' });
            await (0, db_1.updateUserPassword)(input.id, input.password);
            return { success: true };
        }),
        actualizarWhatsapp: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            id: zod_1.z.number(),
            waId: zod_1.z.string().optional(),
        }))
            .mutation(async ({ input, ctx }) => {
            assertAdmin(ctx.user);
            const user = await (0, db_1.getUserById)(input.id);
            if (!user)
                throw new server_1.TRPCError({ code: 'NOT_FOUND', message: 'Usuario no encontrado' });
            await (0, db_1.updateUserWhatsapp)(input.id, input.waId);
            return { success: true };
        }),
        desactivar: trpc_1.protectedProcedure
            .input(zod_1.z.object({ id: zod_1.z.number() }))
            .mutation(async ({ input, ctx }) => {
            assertAdmin(ctx.user);
            if (ctx.user.id === input.id) {
                throw new server_1.TRPCError({ code: 'BAD_REQUEST', message: 'No podés desactivar tu propio usuario' });
            }
            await (0, db_1.deactivateUser)(input.id);
            return { success: true };
        }),
    }),
    empleados: (0, trpc_1.router)({
        listar: trpc_1.protectedProcedure.query(() => (0, db_1.getEmpleados)()),
        crear: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            nombre: zod_1.z.string().min(1),
            email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
            telefono: zod_1.z.string().optional(),
            especialidad: zod_1.z.string().optional(),
            waId: zod_1.z.string().optional(),
            pagoDiario: payrollAmountSchema,
            pagoSemanal: payrollAmountSchema,
            pagoQuincenal: payrollAmountSchema,
            pagoMensual: payrollAmountSchema,
        }))
            .mutation(async ({ input }) => {
            await (0, db_1.crearEmpleado)(input);
            return { success: true };
        }),
        actualizar: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            id: zod_1.z.number(),
            nombre: zod_1.z.string().min(1),
            email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
            telefono: zod_1.z.string().optional(),
            especialidad: zod_1.z.string().optional(),
            waId: zod_1.z.string().optional(),
            pagoDiario: payrollAmountSchema,
            pagoSemanal: payrollAmountSchema,
            pagoQuincenal: payrollAmountSchema,
            pagoMensual: payrollAmountSchema,
        }))
            .mutation(async ({ input }) => {
            const { id, ...data } = input;
            await (0, db_1.actualizarEmpleado)(id, data);
            return { success: true };
        }),
        desactivar: trpc_1.protectedProcedure
            .input(zod_1.z.object({ id: zod_1.z.number() }))
            .mutation(async ({ input }) => {
            await (0, db_1.actualizarEmpleado)(input.id, { activo: false });
            return { success: true };
        }),
    }),
    asistencia: (0, trpc_1.router)({
        resumen: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            periodo: attendancePeriodEnum,
            empleadoId: zod_1.z.number().optional(),
            referenceDateMs: zod_1.z.number().optional(),
        }))
            .query(async ({ input, ctx }) => {
            assertAdmin(ctx.user);
            return buildAttendanceSummary(input);
        }),
        estadoEmpleado: trpc_1.protectedProcedure
            .input(zod_1.z.object({ empleadoId: zod_1.z.number() }))
            .query(async ({ input, ctx }) => {
            assertAdmin(ctx.user);
            const empleado = await (0, db_1.getEmpleadoActivoById)(input.empleadoId);
            if (!empleado)
                throw new server_1.TRPCError({ code: 'NOT_FOUND', message: 'Empleado no encontrado' });
            return (0, db_1.getEmpleadoAttendanceStatus)(input.empleadoId);
        }),
        eventosEmpleado: trpc_1.protectedProcedure
            .input(zod_1.z.object({ empleadoId: zod_1.z.number() }))
            .query(async ({ input, ctx }) => {
            assertAdmin(ctx.user);
            const empleado = await (0, db_1.getEmpleadoActivoById)(input.empleadoId);
            if (!empleado)
                throw new server_1.TRPCError({ code: 'NOT_FOUND', message: 'Empleado no encontrado' });
            return (0, db_1.getEmpleadoAttendanceEvents)(input.empleadoId);
        }),
        auditoriaEmpleado: trpc_1.protectedProcedure
            .input(zod_1.z.object({ empleadoId: zod_1.z.number() }))
            .query(async ({ input, ctx }) => {
            assertAdmin(ctx.user);
            const empleado = await (0, db_1.getEmpleadoActivoById)(input.empleadoId);
            if (!empleado)
                throw new server_1.TRPCError({ code: 'NOT_FOUND', message: 'Empleado no encontrado' });
            return (0, db_1.getAttendanceAuditTrailForEmpleado)(input.empleadoId);
        }),
        registrar: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            empleadoId: zod_1.z.number(),
            accion: attendanceActionEnum,
            nota: zod_1.z.string().optional(),
        }))
            .mutation(async ({ input, ctx }) => {
            assertAdmin(ctx.user);
            const empleado = await (0, db_1.getEmpleadoActivoById)(input.empleadoId);
            if (!empleado)
                throw new server_1.TRPCError({ code: 'NOT_FOUND', message: 'Empleado no encontrado' });
            const result = await (0, db_1.registerEmpleadoAttendance)(input.empleadoId, input.accion, 'panel', input.nota);
            if (!result.success) {
                const messageByCode = {
                    already_on_shift: 'El empleado ya tiene una jornada abierta.',
                    not_on_shift: 'El empleado no tiene una entrada abierta.',
                    already_on_lunch: 'El empleado ya está en almuerzo.',
                    not_on_lunch: 'El empleado no tiene un almuerzo abierto.',
                    on_lunch: 'Primero cerrá el almuerzo para registrar la salida.',
                };
                if (result.code === 'ok') {
                    throw new server_1.TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Estado de asistencia inconsistente.',
                    });
                }
                throw new server_1.TRPCError({
                    code: 'CONFLICT',
                    message: messageByCode[result.code],
                });
            }
            return { success: true, status: result.status };
        }),
        crearManual: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            empleadoId: zod_1.z.number(),
            tipo: attendanceActionEnum,
            fechaHora: zod_1.z.coerce.date(),
            nota: zod_1.z.string().optional(),
        }))
            .mutation(async ({ input, ctx }) => {
            assertAdmin(ctx.user);
            const empleado = await (0, db_1.getEmpleadoActivoById)(input.empleadoId);
            if (!empleado)
                throw new server_1.TRPCError({ code: 'NOT_FOUND', message: 'Empleado no encontrado' });
            return (0, db_1.createManualAttendanceEvent)(input);
        }),
        corregirManual: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            attendanceEventId: zod_1.z.number(),
            tipo: attendanceActionEnum,
            fechaHora: zod_1.z.coerce.date(),
            nota: zod_1.z.string().optional(),
            motivo: zod_1.z.string().min(1),
        }))
            .mutation(async ({ input, ctx }) => {
            assertAdmin(ctx.user);
            return (0, db_1.correctManualAttendanceEvent)({
                ...input,
                admin: {
                    id: ctx.user.id,
                    name: ctx.user.name,
                },
            });
        }),
        cerrarLiquidacion: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            periodo: attendancePeriodEnum,
            empleadoId: zod_1.z.number().optional(),
        }))
            .mutation(async ({ input, ctx }) => {
            assertAdmin(ctx.user);
            return replaceLiquidacionClosure({
                ...input,
                admin: {
                    id: ctx.user.id,
                    name: ctx.user.name,
                },
            });
        }),
        marcarPagado: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            periodo: attendancePeriodEnum,
            empleadoId: zod_1.z.number().optional(),
        }))
            .mutation(async ({ input, ctx }) => {
            assertAdmin(ctx.user);
            return markLiquidacionAsPaid({
                ...input,
                admin: {
                    id: ctx.user.id,
                    name: ctx.user.name,
                },
            });
        }),
    }),
    configuracion: (0, trpc_1.router)({
        listarNotificaciones: trpc_1.protectedProcedure.query(() => (0, db_1.getNotificaciones)()),
        agregarNotificacion: trpc_1.protectedProcedure
            .input(zod_1.z.object({
            tipo: zod_1.z.enum(['email', 'telegram']),
            nombre: zod_1.z.string().min(1),
            destino: zod_1.z.string().min(1),
            recibeNuevos: zod_1.z.boolean().default(true),
            recibeUrgentes: zod_1.z.boolean().default(true),
            recibeCompletados: zod_1.z.boolean().default(false),
        }))
            .mutation(async ({ input }) => { await (0, db_1.crearNotificacion)(input); return { success: true }; }),
        toggleNotificacion: trpc_1.protectedProcedure
            .input(zod_1.z.object({ id: zod_1.z.number(), activo: zod_1.z.boolean() }))
            .mutation(async ({ input }) => { await (0, db_1.actualizarNotificacion)(input.id, { activo: input.activo }); return { success: true }; }),
        eliminarNotificacion: trpc_1.protectedProcedure
            .input(zod_1.z.object({ id: zod_1.z.number() }))
            .mutation(async ({ input }) => { await (0, db_1.eliminarNotificacion)(input.id); return { success: true }; }),
        limpiarDatosDemo: trpc_1.protectedProcedure
            .mutation(async ({ ctx }) => {
            assertAdmin(ctx.user);
            const result = await (0, db_1.limpiarDatosDemo)();
            return { success: true, ...result };
        }),
        reiniciarMetricas: trpc_1.protectedProcedure
            .mutation(async ({ ctx }) => {
            assertAdmin(ctx.user);
            const result = await (0, db_1.reiniciarMetricasOperacion)();
            return { success: true, ...result };
        }),
    }),
});
async function notifyOperationalTaskAssignment(taskId, employee) {
    if (!employee.waId)
        return;
    const task = await (0, db_1.getOperationalTaskById)(taskId);
    if (!task)
        return;
    const lines = [
        '*Nueva tarea operativa — Docks del Puerto*',
        '',
        `Asignado a: ${employee.nombre}`,
        `Tarea #${task.id}`,
        task.titulo ? `Trabajo: ${task.titulo}` : '',
        task.tipoTrabajo ? `Tipo: ${task.tipoTrabajo}` : '',
        task.ubicacion ? `Ubicación: ${task.ubicacion}` : '',
        task.prioridad ? `Prioridad: ${String(task.prioridad).toUpperCase()}` : '',
        '',
        task.descripcion ?? '',
        '',
        'Respondé con una opción:',
        '1. Aceptar tarea',
        '2. No puedo realizarla',
        '3. Ver cola del día',
        '',
        'Cuando la aceptes, el reloj de trabajo queda en marcha y después vas a poder pausar o finalizar desde el bot.',
    ];
    await (0, db_1.enqueueBotMessage)(employee.waId, lines.filter(Boolean).join('\n'));
}
function formatMoneyArs(value) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
    }).format(value);
}
function buildCobranzaMessage(saldo) {
    const fechaCorte = new Date().toLocaleDateString('es-AR');
    const referencia = [saldo.periodo, saldo.local ? `local ${saldo.local}` : ''].filter(Boolean).join(' / ');
    return [
        '🏢 *Docks del Puerto - Administración*',
        '📌 *Aviso de saldo pendiente*',
        '',
        `Hola ${saldo.locatarioNombre}, te contactamos desde el área de Administración de Docks del Puerto.`,
        '',
        `💳 Según nuestro registro al ${fechaCorte}, figura un saldo pendiente de *${formatMoneyArs(Number(saldo.saldo ?? 0))}*${referencia ? ` correspondiente a ${referencia}` : ''}.`,
        '',
        '📲 ¿Nos confirmás por este medio la fecha estimada de regularización?',
        '',
        'Muchas gracias.',
    ].join('\n');
}
function assertCollectionsAccess(user) {
    if (user.role !== 'admin' && user.role !== 'collections') {
        throw new server_1.TRPCError({ code: 'FORBIDDEN', message: 'No tenés acceso al módulo de cobranzas.' });
    }
}
async function notifyOperationalTaskBatchAssignment({ employee, tasks, sourceName, }) {
    if (!employee.waId || tasks.length === 0)
        return false;
    const visibleTasks = tasks.slice(0, 10);
    const lines = [
        '*Lista de tareas diarias — Docks del Puerto*',
        '',
        `${employee.nombre}, tenés ${tasks.length} tarea${tasks.length === 1 ? '' : 's'} nueva${tasks.length === 1 ? '' : 's'} asignada${tasks.length === 1 ? '' : 's'}.`,
        sourceName ? `Origen: ${sourceName}` : '',
        '',
        ...visibleTasks.flatMap((task, index) => [
            `${index + 1}. #${task.id} — ${task.titulo}`,
            `   ${task.ubicacion} · Prioridad ${task.prioridad.toUpperCase()}`,
        ]),
        tasks.length > visibleTasks.length ? `...y ${tasks.length - visibleTasks.length} más.` : '',
        '',
        'Abrí *Mis tareas* en el bot para aceptar cada trabajo y seguir el flujo normal.',
    ];
    await (0, db_1.enqueueBotMessage)(employee.waId, lines.filter(Boolean).join('\n'));
    return true;
}
function buildLeadAssignmentMessage({ lead, assignedUserName, }) {
    const receivedAt = lead.createdAt
        ? new Date(lead.createdAt).toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        })
        : null;
    const lines = [
        '*Nuevo lead asignado — Docks del Puerto*',
        '',
        `Asignado a: ${assignedUserName}`,
        `Lead #${lead.id}`,
        `Nombre: ${lead.nombre}`,
        lead.telefono ? `Teléfono: ${lead.telefono}` : '',
        lead.email ? `Email: ${lead.email}` : '',
        lead.waId ? `WhatsApp del interesado: ${lead.waId}` : '',
        lead.rubro ? `Rubro: ${lead.rubro}` : '',
        lead.tipoLocal ? `Tipo de local: ${lead.tipoLocal}` : '',
        `Estado: ${lead.estado ?? 'nuevo'}`,
        `Origen: ${lead.fuente ?? 'web'}`,
        receivedAt ? `Recibido: ${receivedAt}` : '',
        lead.turnoFecha ? `Turno: ${lead.turnoFecha}${lead.turnoHora ? ` ${lead.turnoHora}` : ''}` : '',
        lead.notas ? `Notas internas: ${lead.notas}` : '',
        lead.mensaje ? `Consulta: ${lead.mensaje}` : '',
        '',
        'Abrí el panel y seguí el lead desde la sección Leads.',
    ];
    return lines.filter(Boolean).join('\n');
}
