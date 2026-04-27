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
    getReporteById: vitest_1.vi.fn(),
    iniciarTrabajoReporte: vitest_1.vi.fn(),
    pausarTrabajoReporte: vitest_1.vi.fn(),
    completarTrabajoReporte: vitest_1.vi.fn(),
    actualizarReporte: vitest_1.vi.fn(),
    crearActualizacion: vitest_1.vi.fn(),
    getOperationalTaskById: vitest_1.vi.fn(),
    enqueueBotMessage: vitest_1.vi.fn(),
    addOperationalTaskEvent: vitest_1.vi.fn(),
}));
const tasksServiceMock = vitest_1.vi.hoisted(() => ({
    acceptTask: vitest_1.vi.fn(),
    resumeTask: vitest_1.vi.fn(),
    pauseTask: vitest_1.vi.fn(),
    finishTask: vitest_1.vi.fn(),
    cancelTask: vitest_1.vi.fn(),
    rejectTask: vitest_1.vi.fn(),
}));
const sessionMock = vitest_1.vi.hoisted(() => ({
    navigateTo: vitest_1.vi.fn(async () => undefined),
    navigateBack: vitest_1.vi.fn(async () => ({ session: null, previousMenu: 'main' })),
}));
vitest_1.vi.mock('../../../db', () => dbMock);
vitest_1.vi.mock('../../../tasks/service', () => ({
    createOperationalTasksService: vitest_1.vi.fn(() => tasksServiceMock),
}));
vitest_1.vi.mock('../../../_core/notification', () => ({
    notifyOwner: vitest_1.vi.fn(() => Promise.resolve()),
}));
vitest_1.vi.mock('../../session', async () => {
    const actual = await vitest_1.vi.importActual('../../session');
    return {
        ...actual,
        navigateTo: sessionMock.navigateTo,
        navigateBack: sessionMock.navigateBack,
    };
});
const tareas_1 = require("./tareas");
function employeeSession(page = 1) {
    return {
        id: 7,
        waNumber: '5491111111111',
        userType: 'employee',
        userId: 7,
        userName: 'Walter',
        currentMenu: 'tareas_lista',
        contextData: { page },
        menuHistory: ['main'],
        lastActivityAt: new Date(),
        createdAt: new Date(),
    };
}
function makeReporte(id) {
    return {
        id,
        titulo: `Tarea ${id}`,
        local: `Local ${id}`,
        planta: 'PB',
        prioridad: 'media',
        estado: 'pendiente',
        asignacionEstado: 'aceptada',
        descripcion: `Descripcion ${id}`,
        trabajoAcumuladoSegundos: 0,
        createdAt: new Date(`2026-04-${String(id).padStart(2, '0')}T10:00:00.000Z`),
    };
}
(0, vitest_1.describe)('employee task list pagination', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        dbMock.getTareasEmpleado.mockResolvedValue([
            makeReporte(1),
            makeReporte(2),
            makeReporte(3),
            makeReporte(4),
            makeReporte(5),
            makeReporte(6),
            makeReporte(7),
        ]);
        dbMock.listOperationalTasksByEmployee.mockResolvedValue([]);
        dbMock.getReporteById.mockImplementation(async (id) => makeReporte(id));
    });
    (0, vitest_1.it)('renders page-local numbering on later pages so task options do not collide with pagination controls', async () => {
        const menu = await (0, tareas_1.buildTareasLista)(employeeSession(2));
        (0, vitest_1.expect)(menu).toContain('1️⃣  🟡 Rec. #6 — Tarea 6');
        (0, vitest_1.expect)(menu).toContain('2️⃣  🟡 Rec. #7 — Tarea 7');
        (0, vitest_1.expect)(menu).not.toContain('6️⃣  🟡 Rec. #6 — Tarea 6');
        (0, vitest_1.expect)(menu).not.toContain('7️⃣  🟡 Rec. #7 — Tarea 7');
        (0, vitest_1.expect)(menu).toContain('8️⃣  ◀️ Página anterior');
    });
    (0, vitest_1.it)('opens the correct task when selecting the first option on the second page', async () => {
        const result = await (0, tareas_1.handleTareasLista)(employeeSession(2), '1');
        (0, vitest_1.expect)(sessionMock.navigateTo).toHaveBeenCalledWith(vitest_1.expect.any(Object), 'tarea_detalle', {
            tareaId: 6,
            origen: 'reclamo',
            page: 1,
        });
        (0, vitest_1.expect)(result).toContain('📌 *Reclamo #6*');
    });
});
