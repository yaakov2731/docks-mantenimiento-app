"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const dbMock = vitest_1.vi.hoisted(() => ({
    initDb: vitest_1.vi.fn(async () => undefined),
    db: {
        delete: vitest_1.vi.fn(() => ({ run: vitest_1.vi.fn(async () => undefined) })),
        run: vitest_1.vi.fn(async () => undefined),
    },
    getEmpleadoAttendanceStatus: vitest_1.vi.fn(),
    registerEmpleadoAttendance: vitest_1.vi.fn(),
}));
const assignmentMock = vitest_1.vi.hoisted(() => ({
    autoDistributePoolTasksOnEntry: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../../../db', () => dbMock);
vitest_1.vi.mock('../../../operational-task-assignment', () => assignmentMock);
const asistencia_1 = require("./asistencia");
function employeeSession() {
    return {
        id: 7,
        waNumber: '5491111111111',
        userType: 'employee',
        userId: 7,
        userName: 'Walter',
        currentMenu: 'asistencia',
        contextData: {},
        menuHistory: ['main'],
        lastActivityAt: new Date(),
        createdAt: new Date(),
    };
}
(0, vitest_1.describe)('attendance menu text shortcuts', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        dbMock.getEmpleadoAttendanceStatus.mockResolvedValue({
            onShift: true,
            onLunch: false,
            lastEntryAt: '2026-04-25T11:00:00.000Z',
            workedSecondsToday: 3600,
            todayLunchSeconds: 0,
        });
        dbMock.registerEmpleadoAttendance.mockResolvedValue({
            success: true,
            code: 'ok',
            status: {
                workedSecondsToday: 3600,
                todayLunchSeconds: 0,
            },
        });
        assignmentMock.autoDistributePoolTasksOnEntry.mockResolvedValue([]);
    });
    (0, vitest_1.it)('accepts "salida" as a valid attendance action', async () => {
        const reply = await (0, asistencia_1.handleAsistencia)(employeeSession(), 'salida');
        (0, vitest_1.expect)(dbMock.registerEmpleadoAttendance).toHaveBeenCalledWith(7, 'salida', 'whatsapp');
        (0, vitest_1.expect)(reply).toContain('Salida registrada');
    });
    (0, vitest_1.it)('shows the correct friendly message for lowercase attendance error codes', async () => {
        dbMock.registerEmpleadoAttendance.mockResolvedValue({
            success: false,
            code: 'not_on_shift',
            status: {
                onShift: false,
                onLunch: false,
            },
        });
        const reply = await (0, asistencia_1.handleAsistencia)(employeeSession(), 'salida');
        (0, vitest_1.expect)(reply).toContain('Primero registrá la entrada');
    });
});
