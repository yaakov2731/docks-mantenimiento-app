"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const server_1 = require("@trpc/server");
const routers_1 = require("./routers");
const db_1 = require("./db");
const db_factory_1 = require("./test/db-factory");
const adminContext = {
    req: {},
    res: { cookie() { }, clearCookie() { } },
    user: { id: 10, username: 'admin', name: 'Admin', role: 'admin' },
};
const employeeContext = {
    req: {},
    res: { cookie() { }, clearCookie() { } },
    user: { id: 11, username: 'empleado', name: 'Empleado', role: 'employee' },
};
(0, vitest_1.describe)('attendance router', () => {
    (0, vitest_1.beforeEach)(async () => {
        vitest_1.vi.useFakeTimers();
        vitest_1.vi.setSystemTime(new Date('2026-04-10T12:00:00.000Z'));
        await (0, db_factory_1.resetTestDb)();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.useRealTimers();
    });
    async function createEmpleadoId() {
        await (0, db_1.crearEmpleado)({ nombre: 'Juan' });
        const [empleado] = await (0, db_1.getEmpleados)();
        return empleado.id;
    }
    (0, vitest_1.it)('registers live panel attendance and returns current status', async () => {
        const empleadoId = await createEmpleadoId();
        const caller = routers_1.appRouter.createCaller(adminContext);
        const entry = await caller.asistencia.registrar({
            empleadoId,
            accion: 'entrada',
            nota: 'inicio de turno',
        });
        const status = await caller.asistencia.estadoEmpleado({ empleadoId });
        (0, vitest_1.expect)(entry.success).toBe(true);
        (0, vitest_1.expect)(entry.status.onShift).toBe(true);
        (0, vitest_1.expect)(entry.status.lastAction).toBe('entrada');
        (0, vitest_1.expect)(entry.status.lastChannel).toBe('panel');
        (0, vitest_1.expect)(status.onShift).toBe(true);
        (0, vitest_1.expect)(status.lastChannel).toBe('panel');
        (0, vitest_1.expect)(status.todayEntries).toBe(1);
    });
    (0, vitest_1.it)('returns a live attendance summary for the admin dashboard', async () => {
        const empleadoId = await createEmpleadoId();
        const caller = routers_1.appRouter.createCaller(adminContext);
        await caller.asistencia.registrar({
            empleadoId,
            accion: 'entrada',
            nota: 'inicio desde panel',
        });
        const summary = await caller.asistencia.resumen({ periodo: 'dia' });
        (0, vitest_1.expect)(summary.periodo).toMatchObject({
            tipo: 'dia',
        });
        (0, vitest_1.expect)(summary.resumenEquipo).toMatchObject({
            empleadosActivos: 1,
            enTurno: 1,
        });
        (0, vitest_1.expect)(summary.empleados).toHaveLength(1);
        (0, vitest_1.expect)(summary.empleados[0]).toMatchObject({
            empleadoId,
            nombre: 'Juan',
            attendance: {
                onShift: true,
                lastAction: 'entrada',
            },
            turnos: [
                {
                    fecha: '2026-04-10',
                    turnoAbierto: true,
                },
            ],
            hoy: {
                primerIngresoAt: vitest_1.expect.anything(),
            },
        });
        (0, vitest_1.expect)(summary.eventos[0]).toMatchObject({
            empleadoId,
            empleadoNombre: 'Juan',
            tipo: 'entrada',
            canal: 'panel',
        });
    });
    (0, vitest_1.it)('uses the configured employee rate for the selected payroll period', async () => {
        await (0, db_1.crearEmpleado)({
            nombre: 'Juan',
            pagoDiario: 15000,
            pagoSemanal: 90000,
            pagoQuincenal: 180000,
            pagoMensual: 360000,
        });
        const [empleado] = await (0, db_1.getEmpleados)();
        const caller = routers_1.appRouter.createCaller(adminContext);
        await caller.asistencia.registrar({
            empleadoId: empleado.id,
            accion: 'entrada',
        });
        vitest_1.vi.setSystemTime(new Date('2026-04-10T18:00:00.000Z'));
        await caller.asistencia.registrar({
            empleadoId: empleado.id,
            accion: 'salida',
        });
        const summary = await caller.asistencia.resumen({ periodo: 'semana' });
        (0, vitest_1.expect)(summary.empleados[0]).toMatchObject({
            pagoDiario: 15000,
            pagoSemanal: 90000,
            pagoQuincenal: 180000,
            pagoMensual: 360000,
        });
        (0, vitest_1.expect)(summary.empleados[0].liquidacion).toMatchObject({
            tarifaPeriodo: 'semana',
            tarifaMonto: 90000,
            totalPagar: 90000,
            tarifaOrigen: 'configurado',
        });
        (0, vitest_1.expect)(summary.resumenEquipo.totalPagar).toBe(90000);
    });
    (0, vitest_1.it)('derives weekly payroll from daily rate when only daily pay is configured', async () => {
        await (0, db_1.crearEmpleado)({
            nombre: 'Juan',
            pagoDiario: 15000,
            pagoSemanal: 0,
            pagoQuincenal: 0,
            pagoMensual: 0,
        });
        const [empleado] = await (0, db_1.getEmpleados)();
        const caller = routers_1.appRouter.createCaller(adminContext);
        await caller.asistencia.registrar({
            empleadoId: empleado.id,
            accion: 'entrada',
        });
        vitest_1.vi.setSystemTime(new Date('2026-04-10T18:00:00.000Z'));
        await caller.asistencia.registrar({
            empleadoId: empleado.id,
            accion: 'salida',
        });
        const summary = await caller.asistencia.resumen({ periodo: 'semana' });
        (0, vitest_1.expect)(summary.empleados[0].liquidacion).toMatchObject({
            diasTrabajados: 1,
            tarifaPeriodo: 'dia',
            tarifaMonto: 15000,
            totalPagar: 15000,
            tarifaOrigen: 'derivado',
        });
        (0, vitest_1.expect)(summary.resumenEquipo.totalPagar).toBe(15000);
    });
    (0, vitest_1.it)('updates employee name and payroll amounts from the admin router', async () => {
        await (0, db_1.crearEmpleado)({ nombre: 'Juan' });
        const [empleado] = await (0, db_1.getEmpleados)();
        const caller = routers_1.appRouter.createCaller(adminContext);
        const result = await caller.empleados.actualizar({
            id: empleado.id,
            nombre: 'Juan Carlos',
            email: 'juan@example.com',
            telefono: '1133445566',
            especialidad: 'Electricista',
            waId: '5491133445566',
            pagoDiario: 12000,
            pagoSemanal: 72000,
            pagoQuincenal: 144000,
            pagoMensual: 288000,
        });
        const [updated] = await (0, db_1.getEmpleados)();
        (0, vitest_1.expect)(result.success).toBe(true);
        (0, vitest_1.expect)(updated).toMatchObject({
            nombre: 'Juan Carlos',
            email: 'juan@example.com',
            telefono: '1133445566',
            especialidad: 'Electricista',
            waId: '5491133445566',
            pagoDiario: 12000,
            pagoSemanal: 72000,
            pagoQuincenal: 144000,
            pagoMensual: 288000,
        });
    });
    (0, vitest_1.it)('closes and marks a payroll period as paid', async () => {
        const empleadoId = await createEmpleadoId();
        const caller = routers_1.appRouter.createCaller(adminContext);
        await caller.asistencia.registrar({
            empleadoId,
            accion: 'entrada',
        });
        vitest_1.vi.setSystemTime(new Date('2026-04-10T18:00:00.000Z'));
        await caller.asistencia.registrar({
            empleadoId,
            accion: 'salida',
        });
        const closed = await caller.asistencia.cerrarLiquidacion({ periodo: 'dia' });
        (0, vitest_1.expect)(closed.success).toBe(true);
        let summary = await caller.asistencia.resumen({ periodo: 'dia' });
        (0, vitest_1.expect)(summary.cierre).toMatchObject({
            cerrado: true,
            pagado: false,
            closedBy: 'Admin',
        });
        (0, vitest_1.expect)(summary.empleados[0].cierre).toMatchObject({
            cerradoPorNombre: 'Admin',
        });
        const paid = await caller.asistencia.marcarPagado({ periodo: 'dia' });
        (0, vitest_1.expect)(paid.success).toBe(true);
        summary = await caller.asistencia.resumen({ periodo: 'dia' });
        (0, vitest_1.expect)(summary.cierre).toMatchObject({
            cerrado: true,
            pagado: true,
            paidBy: 'Admin',
        });
        (0, vitest_1.expect)(summary.empleados[0].cierre).toMatchObject({
            pagadoPorNombre: 'Admin',
        });
    });
    (0, vitest_1.it)('tracks lunch state and blocks exit while lunch is open', async () => {
        const empleadoId = await createEmpleadoId();
        const caller = routers_1.appRouter.createCaller(adminContext);
        await caller.asistencia.registrar({
            empleadoId,
            accion: 'entrada',
        });
        vitest_1.vi.setSystemTime(new Date('2026-04-10T13:00:00.000Z'));
        const lunchStart = await caller.asistencia.registrar({
            empleadoId,
            accion: 'inicio_almuerzo',
        });
        (0, vitest_1.expect)(lunchStart.success).toBe(true);
        (0, vitest_1.expect)(lunchStart.status.onShift).toBe(true);
        (0, vitest_1.expect)(lunchStart.status.onLunch).toBe(true);
        (0, vitest_1.expect)(lunchStart.status.lastAction).toBe('inicio_almuerzo');
        (0, vitest_1.expect)(lunchStart.status.lastLunchStartAt).toEqual(new Date('2026-04-10T13:00:00.000Z'));
        await (0, vitest_1.expect)(caller.asistencia.registrar({
            empleadoId,
            accion: 'salida',
        })).rejects.toMatchObject({
            code: 'CONFLICT',
            message: 'Primero cerrá el almuerzo para registrar la salida.',
        });
        vitest_1.vi.setSystemTime(new Date('2026-04-10T13:30:00.000Z'));
        const lunchEnd = await caller.asistencia.registrar({
            empleadoId,
            accion: 'fin_almuerzo',
        });
        (0, vitest_1.expect)(lunchEnd.success).toBe(true);
        (0, vitest_1.expect)(lunchEnd.status.onShift).toBe(true);
        (0, vitest_1.expect)(lunchEnd.status.onLunch).toBe(false);
        (0, vitest_1.expect)(lunchEnd.status.todayLunchSeconds).toBe(1800);
        (0, vitest_1.expect)(lunchEnd.status.todayLunchStarts).toBe(1);
        (0, vitest_1.expect)(lunchEnd.status.todayLunchEnds).toBe(1);
        vitest_1.vi.setSystemTime(new Date('2026-04-10T16:00:00.000Z'));
        const exit = await caller.asistencia.registrar({
            empleadoId,
            accion: 'salida',
        });
        (0, vitest_1.expect)(exit.success).toBe(true);
        (0, vitest_1.expect)(exit.status.onShift).toBe(false);
        (0, vitest_1.expect)(exit.status.onLunch).toBe(false);
        (0, vitest_1.expect)(exit.status.grossWorkedSecondsToday).toBe(0);
        (0, vitest_1.expect)(exit.status.todayLunchSeconds).toBe(1800);
        (0, vitest_1.expect)(exit.status.workedSecondsToday).toBe(0);
        (0, vitest_1.expect)(exit.status.currentShiftGrossSeconds).toBe(0);
        (0, vitest_1.expect)(exit.status.currentShiftLunchSeconds).toBe(0);
        (0, vitest_1.expect)(exit.status.lastShiftGrossSeconds).toBe(14400);
        (0, vitest_1.expect)(exit.status.lastShiftLunchSeconds).toBe(1800);
        (0, vitest_1.expect)(exit.status.lastShiftWorkedSeconds).toBe(12600);
        (0, vitest_1.expect)(exit.status.todayExits).toBe(1);
        (0, vitest_1.expect)(exit.status.lastAction).toBe('salida');
    });
    (0, vitest_1.it)('separates multiple shifts from the same day into independent turns', async () => {
        const empleadoId = await createEmpleadoId();
        const caller = routers_1.appRouter.createCaller(adminContext);
        await caller.asistencia.registrar({ empleadoId, accion: 'entrada' });
        vitest_1.vi.setSystemTime(new Date('2026-04-10T14:00:00.000Z'));
        await caller.asistencia.registrar({ empleadoId, accion: 'salida' });
        vitest_1.vi.setSystemTime(new Date('2026-04-10T15:00:00.000Z'));
        await caller.asistencia.registrar({ empleadoId, accion: 'entrada' });
        vitest_1.vi.setSystemTime(new Date('2026-04-10T18:00:00.000Z'));
        await caller.asistencia.registrar({ empleadoId, accion: 'salida' });
        const summary = await caller.asistencia.resumen({ periodo: 'dia' });
        (0, vitest_1.expect)(summary.empleados[0].turnos).toHaveLength(2);
        (0, vitest_1.expect)(summary.empleados[0].turnos[0]).toMatchObject({
            fecha: '2026-04-10',
            workedSeconds: 7200,
            turnoAbierto: false,
        });
        (0, vitest_1.expect)(summary.empleados[0].turnos[1]).toMatchObject({
            fecha: '2026-04-10',
            workedSeconds: 10800,
            turnoAbierto: false,
        });
        (0, vitest_1.expect)(summary.empleados[0].liquidacion?.segundosTrabajados).toBe(18000);
    });
    (0, vitest_1.it)('does not add overnight carryover hours to today when the employee clocks in again on the same day', async () => {
        const empleadoId = await createEmpleadoId();
        const caller = routers_1.appRouter.createCaller(adminContext);
        await caller.asistencia.crearManual({
            empleadoId,
            tipo: 'entrada',
            fechaHora: new Date('2026-04-09T12:00:00.000Z'),
        });
        await caller.asistencia.crearManual({
            empleadoId,
            tipo: 'salida',
            fechaHora: new Date('2026-04-10T12:00:00.000Z'),
        });
        vitest_1.vi.setSystemTime(new Date('2026-04-10T15:00:00.000Z'));
        await caller.asistencia.crearManual({
            empleadoId,
            tipo: 'entrada',
            fechaHora: new Date('2026-04-10T12:05:00.000Z'),
        });
        const summary = await caller.asistencia.resumen({ periodo: 'dia' });
        const today = summary.empleados[0].liquidacion?.dias.find((day) => day.fecha === '2026-04-10');
        (0, vitest_1.expect)(today).toMatchObject({
            fecha: '2026-04-10',
            workedSeconds: 10500,
            entradas: 1,
            salidas: 1,
            turnoAbierto: true,
        });
    });
    (0, vitest_1.it)('lets an admin create and correct manual attendance with audit trail', async () => {
        const empleadoId = await createEmpleadoId();
        const caller = routers_1.appRouter.createCaller(adminContext);
        await caller.asistencia.crearManual({
            empleadoId,
            tipo: 'entrada',
            fechaHora: new Date('2026-04-08T08:00:00.000Z'),
            nota: 'carga manual',
        });
        const eventos = await caller.asistencia.eventosEmpleado({ empleadoId });
        await caller.asistencia.corregirManual({
            attendanceEventId: eventos[0].id,
            tipo: 'salida',
            fechaHora: new Date('2026-04-08T12:00:00.000Z'),
            nota: 'ajustada',
            motivo: 'correccion administrativa',
        });
        const eventosActualizados = await caller.asistencia.eventosEmpleado({ empleadoId });
        const auditoria = await caller.asistencia.auditoriaEmpleado({ empleadoId });
        (0, vitest_1.expect)(eventosActualizados).toHaveLength(1);
        (0, vitest_1.expect)(eventosActualizados[0].tipo).toBe('salida');
        (0, vitest_1.expect)(eventosActualizados[0].canal).toBe('manual_admin');
        (0, vitest_1.expect)(auditoria).toHaveLength(1);
        (0, vitest_1.expect)(auditoria[0].valorAnteriorTipo).toBe('entrada');
        (0, vitest_1.expect)(auditoria[0].valorNuevoTipo).toBe('salida');
    });
    (0, vitest_1.it)('forbids non-admin users from manual attendance mutations', async () => {
        const empleadoId = await createEmpleadoId();
        const caller = routers_1.appRouter.createCaller(employeeContext);
        await (0, vitest_1.expect)(caller.asistencia.crearManual({
            empleadoId,
            tipo: 'entrada',
            fechaHora: new Date('2026-04-08T08:00:00.000Z'),
        })).rejects.toBeInstanceOf(server_1.TRPCError);
    });
    (0, vitest_1.it)('blocks attendance access for deactivated employees', async () => {
        const empleadoId = await createEmpleadoId();
        await (0, db_1.actualizarEmpleado)(empleadoId, { activo: false });
        const caller = routers_1.appRouter.createCaller(adminContext);
        await (0, vitest_1.expect)(caller.asistencia.estadoEmpleado({ empleadoId })).rejects.toMatchObject({
            code: 'NOT_FOUND',
        });
    });
});
