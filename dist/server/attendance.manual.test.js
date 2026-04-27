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
const vitest_1 = require("vitest");
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("./db");
const db_factory_1 = require("./test/db-factory");
const schema = __importStar(require("../drizzle/schema"));
(0, vitest_1.describe)('manual attendance support', () => {
    (0, vitest_1.beforeEach)(async () => {
        vitest_1.vi.useFakeTimers();
        vitest_1.vi.setSystemTime(new Date('2026-04-10T19:00:00.000Z'));
        await (0, db_factory_1.resetTestDb)();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.useRealTimers();
    });
    (0, vitest_1.it)('creates a past manual admin entry', async () => {
        await (0, db_1.crearEmpleado)({ nombre: 'Juan' });
        const created = await (0, db_1.createManualAttendanceEvent)({
            empleadoId: 1,
            tipo: 'entrada',
            fechaHora: new Date('2026-04-08T08:00:00.000Z'),
            nota: 'cargada por admin',
        });
        const rows = await (0, db_1.getEmpleadoAttendanceEvents)(1);
        (0, vitest_1.expect)(created.success).toBe(true);
        (0, vitest_1.expect)(rows).toHaveLength(1);
        (0, vitest_1.expect)(rows[0].tipo).toBe('entrada');
        (0, vitest_1.expect)(rows[0].canal).toBe('manual_admin');
        (0, vitest_1.expect)(rows[0].nota).toBe('cargada por admin');
    });
    (0, vitest_1.it)('supports lunch events and discounts them from worked time', async () => {
        await (0, db_1.crearEmpleado)({ nombre: 'Juan' });
        await (0, db_1.createManualAttendanceEvent)({
            empleadoId: 1,
            tipo: 'entrada',
            fechaHora: new Date('2026-04-10T12:00:00.000Z'),
        });
        await (0, db_1.createManualAttendanceEvent)({
            empleadoId: 1,
            tipo: 'inicio_almuerzo',
            fechaHora: new Date('2026-04-10T14:00:00.000Z'),
        });
        await (0, db_1.createManualAttendanceEvent)({
            empleadoId: 1,
            tipo: 'fin_almuerzo',
            fechaHora: new Date('2026-04-10T14:45:00.000Z'),
        });
        await (0, db_1.createManualAttendanceEvent)({
            empleadoId: 1,
            tipo: 'salida',
            fechaHora: new Date('2026-04-10T18:00:00.000Z'),
        });
        const rows = await (0, db_1.getEmpleadoAttendanceEvents)(1);
        const status = await (0, db_1.getEmpleadoAttendanceStatus)(1);
        (0, vitest_1.expect)(rows.map(row => row.tipo)).toEqual(['entrada', 'inicio_almuerzo', 'fin_almuerzo', 'salida']);
        (0, vitest_1.expect)(status.onShift).toBe(false);
        (0, vitest_1.expect)(status.onLunch).toBe(false);
        (0, vitest_1.expect)(status.grossWorkedSecondsToday).toBe(0);
        (0, vitest_1.expect)(status.todayLunchSeconds).toBe(2700);
        (0, vitest_1.expect)(status.workedSecondsToday).toBe(0);
        (0, vitest_1.expect)(status.lastShiftGrossSeconds).toBe(21600);
        (0, vitest_1.expect)(status.lastShiftLunchSeconds).toBe(2700);
        (0, vitest_1.expect)(status.lastShiftWorkedSeconds).toBe(18900);
        (0, vitest_1.expect)(status.todayEntries).toBe(1);
        (0, vitest_1.expect)(status.todayLunchStarts).toBe(1);
        (0, vitest_1.expect)(status.todayLunchEnds).toBe(1);
        (0, vitest_1.expect)(status.todayExits).toBe(1);
        (0, vitest_1.expect)(status.lastLunchStartAt).toEqual(new Date('2026-04-10T14:00:00.000Z'));
        (0, vitest_1.expect)(status.lastLunchEndAt).toEqual(new Date('2026-04-10T14:45:00.000Z'));
    });
    (0, vitest_1.it)('keeps legacy entry and exit functions synchronized with live attendance status', async () => {
        await (0, db_1.crearEmpleado)({ nombre: 'Juan' });
        const entrada = await (0, db_1.registrarEntradaEmpleado)(1, {
            fuente: 'whatsapp',
            nota: 'inicio legacy',
        });
        let status = await (0, db_1.getEmpleadoAttendanceStatus)(1);
        (0, vitest_1.expect)(entrada.alreadyOpen).toBe(false);
        (0, vitest_1.expect)(status.onShift).toBe(true);
        (0, vitest_1.expect)(status.lastAction).toBe('entrada');
        (0, vitest_1.expect)(status.lastChannel).toBe('whatsapp');
        (0, vitest_1.expect)(status.todayEntries).toBe(1);
        vitest_1.vi.setSystemTime(new Date('2026-04-10T21:00:00.000Z'));
        const salida = await (0, db_1.registrarSalidaEmpleado)(1, { nota: 'fin legacy' });
        status = await (0, db_1.getEmpleadoAttendanceStatus)(1);
        (0, vitest_1.expect)(salida).not.toBeNull();
        (0, vitest_1.expect)(status.onShift).toBe(false);
        (0, vitest_1.expect)(status.lastAction).toBe('salida');
        (0, vitest_1.expect)(status.lastChannel).toBe('whatsapp');
        (0, vitest_1.expect)(status.todayExits).toBe(1);
        (0, vitest_1.expect)(status.workedSecondsToday).toBe(0);
        (0, vitest_1.expect)(status.lastShiftWorkedSeconds).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('rejects a future manual event', async () => {
        await (0, db_1.crearEmpleado)({ nombre: 'Juan' });
        await (0, vitest_1.expect)((0, db_1.createManualAttendanceEvent)({
            empleadoId: 1,
            tipo: 'entrada',
            fechaHora: new Date(Date.now() + 60000),
        })).rejects.toThrow('No se permiten marcaciones futuras');
    });
    (0, vitest_1.it)('blocks manual creation for an event inside a closed payroll period', async () => {
        await (0, db_1.crearEmpleado)({ nombre: 'Juan' });
        await db_1.db.insert(schema.empleadoLiquidacionCierre).values({
            empleadoId: 1,
            periodoTipo: 'dia',
            periodoDesde: '2026-04-08',
            periodoHasta: '2026-04-08',
            diasTrabajados: 1,
            segundosTrabajados: 0,
            promedioSegundosPorDia: 0,
            pagoDiario: 0,
            pagoSemanal: 0,
            pagoQuincenal: 0,
            pagoMensual: 0,
            tarifaPeriodo: 'dia',
            tarifaMonto: 0,
            totalPagar: 0,
            cerradoPorId: 99,
            cerradoPorNombre: 'Admin',
            closedAt: new Date('2026-04-08T18:00:00.000Z'),
        }).run();
        await (0, vitest_1.expect)((0, db_1.createManualAttendanceEvent)({
            empleadoId: 1,
            tipo: 'entrada',
            fechaHora: new Date('2026-04-08T08:00:00.000Z'),
        })).rejects.toThrow('No se puede crear una marcacion en un periodo cerrado');
    });
    (0, vitest_1.it)('corrects an existing event and stores audit trail', async () => {
        await (0, db_1.crearEmpleado)({ nombre: 'Juan' });
        await (0, db_1.createManualAttendanceEvent)({
            empleadoId: 1,
            tipo: 'entrada',
            fechaHora: new Date('2026-04-08T08:00:00.000Z'),
        });
        const [createdEvent] = await (0, db_1.getEmpleadoAttendanceEvents)(1);
        await (0, db_1.correctManualAttendanceEvent)({
            attendanceEventId: createdEvent.id,
            tipo: 'salida',
            fechaHora: new Date('2026-04-08T12:00:00.000Z'),
            nota: 'corregida por supervisor',
            motivo: 'el empleado salio al mediodia',
            admin: { id: 99, name: 'Admin' },
        });
        const rows = await (0, db_1.getEmpleadoAttendanceEvents)(1);
        const audit = await (0, db_1.getAttendanceAuditTrailForEmpleado)(1);
        (0, vitest_1.expect)(rows).toHaveLength(1);
        (0, vitest_1.expect)(rows[0].tipo).toBe('salida');
        (0, vitest_1.expect)(rows[0].canal).toBe('manual_admin');
        (0, vitest_1.expect)(rows[0].nota).toBe('corregida por supervisor');
        (0, vitest_1.expect)(audit).toHaveLength(1);
        (0, vitest_1.expect)(audit[0].motivo).toBe('el empleado salio al mediodia');
        (0, vitest_1.expect)(audit[0].valorAnteriorTipo).toBe('entrada');
        (0, vitest_1.expect)(audit[0].valorNuevoTipo).toBe('salida');
    });
    (0, vitest_1.it)('blocks correction for an event inside a closed payroll period', async () => {
        await (0, db_1.crearEmpleado)({ nombre: 'Juan' });
        await (0, db_1.createManualAttendanceEvent)({
            empleadoId: 1,
            tipo: 'entrada',
            fechaHora: new Date('2026-04-08T08:00:00.000Z'),
        });
        const [createdEvent] = await (0, db_1.getEmpleadoAttendanceEvents)(1);
        await db_1.db.insert(schema.empleadoLiquidacionCierre).values({
            empleadoId: 1,
            periodoTipo: 'dia',
            periodoDesde: '2026-04-08',
            periodoHasta: '2026-04-08',
            diasTrabajados: 1,
            segundosTrabajados: 0,
            promedioSegundosPorDia: 0,
            pagoDiario: 0,
            pagoSemanal: 0,
            pagoQuincenal: 0,
            pagoMensual: 0,
            tarifaPeriodo: 'dia',
            tarifaMonto: 0,
            totalPagar: 0,
            cerradoPorId: 99,
            cerradoPorNombre: 'Admin',
            closedAt: new Date('2026-04-08T18:00:00.000Z'),
        }).run();
        await (0, vitest_1.expect)((0, db_1.correctManualAttendanceEvent)({
            attendanceEventId: createdEvent.id,
            tipo: 'salida',
            fechaHora: new Date('2026-04-08T12:00:00.000Z'),
            motivo: 'correccion tardia',
            admin: { id: 99, name: 'Admin' },
        })).rejects.toThrow('No se puede corregir una marcacion de un periodo cerrado');
    });
    (0, vitest_1.it)('upgrades legacy attendance tables without timestamp column', async () => {
        await db_1.db.run((0, drizzle_orm_1.sql) `DROP TABLE IF EXISTS empleado_asistencia`);
        await db_1.db.run((0, drizzle_orm_1.sql) `
      CREATE TABLE empleado_asistencia (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empleado_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        canal TEXT NOT NULL,
        nota TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
        await (0, db_1.initDb)();
        await (0, db_1.crearEmpleado)({ nombre: 'Juan' });
        await (0, vitest_1.expect)((0, db_1.createManualAttendanceEvent)({
            empleadoId: 1,
            tipo: 'entrada',
            fechaHora: new Date('2026-04-08T08:00:00.000Z'),
        })).resolves.toEqual({ success: true });
        const rows = await (0, db_1.getEmpleadoAttendanceEvents)(1);
        (0, vitest_1.expect)(rows).toHaveLength(1);
    });
});
