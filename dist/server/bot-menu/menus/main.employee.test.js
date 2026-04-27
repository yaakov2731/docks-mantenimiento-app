"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const dbMock = vitest_1.vi.hoisted(() => ({
    initDb: vitest_1.vi.fn(async () => undefined),
    db: {
        delete: vitest_1.vi.fn(() => ({ run: vitest_1.vi.fn(async () => undefined) })),
        run: vitest_1.vi.fn(async () => undefined),
    },
    getTareasEmpleado: vitest_1.vi.fn(),
    listOperationalTasksByEmployee: vitest_1.vi.fn(),
    getReportes: vitest_1.vi.fn(),
    getEmpleadoAttendanceStatus: vitest_1.vi.fn(),
    listUnassignedLeads: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../../db', () => dbMock);
const main_1 = require("./main");
function employeeSession(name = 'Diego') {
    return {
        id: 7,
        waNumber: '5491111111111',
        userType: 'employee',
        userId: 7,
        userName: name,
        currentMenu: 'main',
        contextData: {},
        menuHistory: [],
        lastActivityAt: new Date(),
        createdAt: new Date(),
    };
}
(0, vitest_1.describe)('employee bot main menu', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        dbMock.getTareasEmpleado.mockResolvedValue([]);
        dbMock.listOperationalTasksByEmployee.mockResolvedValue([]);
    });
    (0, vitest_1.it)('renders the current-task-first menu with a concise task summary', async () => {
        dbMock.getTareasEmpleado.mockResolvedValue([
            {
                id: 101,
                titulo: 'Limpieza baño planta alta',
                local: 'Baños',
                prioridad: 'media',
                estado: 'en_progreso',
                asignacionEstado: 'aceptada',
            },
        ]);
        dbMock.listOperationalTasksByEmployee.mockResolvedValue([
            {
                id: 202,
                titulo: 'Control baños',
                ubicacion: 'Pasillo norte',
                prioridad: 'alta',
                estado: 'pendiente_confirmacion',
            },
        ]);
        const menu = await (0, main_1.buildEmployeeMainMenu)(employeeSession('Diego'));
        (0, vitest_1.expect)(menu).toContain('👷 *Diego* — Menú principal');
        (0, vitest_1.expect)(menu).toContain('🎯 Siguiente: Op. #202 — Control baños');
        (0, vitest_1.expect)(menu).toContain('📋 Tenés 2 tareas activas (1 por aceptar, 1 en curso)');
        (0, vitest_1.expect)(menu).toContain('1️⃣  🎯 Ver mi tarea actual');
        (0, vitest_1.expect)(menu).toContain('2️⃣  📋 Ver todas mis tareas');
        (0, vitest_1.expect)(menu).toContain('3️⃣  🕐 Registrar asistencia');
        (0, vitest_1.expect)(menu).toContain('4️⃣  🚻 Control de baños');
    });
    (0, vitest_1.it)('renders an empty state when the employee has no active tasks', async () => {
        const menu = await (0, main_1.buildEmployeeMainMenu)(employeeSession('Sofía'));
        (0, vitest_1.expect)(menu).toContain('👷 *Sofía* — Menú principal');
        (0, vitest_1.expect)(menu).toContain('✅ No tenés tareas activas ahora.');
        (0, vitest_1.expect)(menu).toContain('1️⃣  🎯 Ver mi tarea actual');
        (0, vitest_1.expect)(menu).toContain('2️⃣  📋 Ver todas mis tareas');
    });
});
