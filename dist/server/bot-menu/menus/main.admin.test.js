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
function adminSession(name = 'Juan') {
    return {
        id: 1,
        waNumber: '5491111111111',
        userType: 'admin',
        userId: 1,
        userName: name,
        currentMenu: 'main',
        contextData: {},
        menuHistory: [],
        lastActivityAt: new Date(),
        createdAt: new Date(),
    };
}
(0, vitest_1.describe)('admin bot main menu', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        dbMock.getReportes.mockResolvedValue([]);
        dbMock.listUnassignedLeads.mockResolvedValue([]);
    });
    (0, vitest_1.it)('renders a compact executive welcome with four category options', async () => {
        dbMock.getReportes.mockResolvedValue([
            { estado: 'pendiente', prioridad: 'urgente', asignadoId: null },
            { estado: 'en_progreso', prioridad: 'media', asignadoId: 3 },
            { estado: 'completado', prioridad: 'urgente', asignadoId: null },
        ]);
        dbMock.listUnassignedLeads.mockResolvedValue([{ id: 10 }]);
        const menu = await (0, main_1.buildAdminMainMenu)(adminSession('Juan'));
        (0, vitest_1.expect)(menu).toContain('👔 Hola, Juan. Panel de administración');
        (0, vitest_1.expect)(menu).toContain('📋 Abiertos: 2 | 🔴 Urgentes: 1 | 🎯 Leads: 1');
        (0, vitest_1.expect)(menu).toContain('Elegí un área:');
        (0, vitest_1.expect)(menu).toContain('1️⃣  Reclamos');
        (0, vitest_1.expect)(menu).toContain('2️⃣  Operación diaria');
        (0, vitest_1.expect)(menu).toContain('3️⃣  Rondas de baños');
        (0, vitest_1.expect)(menu).toContain('4️⃣  Comercial');
        (0, vitest_1.expect)(menu).not.toContain('5️⃣');
        (0, vitest_1.expect)(menu).not.toContain('9️⃣');
        (0, vitest_1.expect)(menu).not.toContain('Tareas vencidas');
    });
    (0, vitest_1.it)('renders zero counters without expanding the menu', async () => {
        const menu = await (0, main_1.buildAdminMainMenu)(adminSession('Sofía'));
        (0, vitest_1.expect)(menu).toContain('👔 Hola, Sofía. Panel de administración');
        (0, vitest_1.expect)(menu).toContain('📋 Abiertos: 0 | 🔴 Urgentes: 0 | 🎯 Leads: 0');
        (0, vitest_1.expect)(menu).toContain('4️⃣  Comercial');
    });
});
(0, vitest_1.describe)('admin category submenus', () => {
    (0, vitest_1.it)('renders the reclamos category actions', () => {
        const menu = (0, main_1.buildAdminReclamosMenu)(adminSession());
        (0, vitest_1.expect)(menu).toContain('📋 *Reclamos*');
        (0, vitest_1.expect)(menu).toContain('1️⃣  Ver pendientes');
        (0, vitest_1.expect)(menu).toContain('2️⃣  Urgentes sin asignar');
        (0, vitest_1.expect)(menu).toContain('3️⃣  Sin asignar');
        (0, vitest_1.expect)(menu).toContain('4️⃣  SLA vencidos');
        (0, vitest_1.expect)(menu).toContain('0️⃣  Volver');
    });
    (0, vitest_1.it)('renders the daily operations category actions', () => {
        const menu = (0, main_1.buildAdminOperationMenu)(adminSession());
        (0, vitest_1.expect)(menu).toContain('📊 *Operación diaria*');
        (0, vitest_1.expect)(menu).toContain('1️⃣  Estado general del día');
        (0, vitest_1.expect)(menu).toContain('2️⃣  Asignar tarea a empleado');
        (0, vitest_1.expect)(menu).toContain('0️⃣  Volver');
    });
});
