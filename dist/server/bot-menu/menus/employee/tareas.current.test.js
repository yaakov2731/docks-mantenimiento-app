"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sessionMock = vitest_1.vi.hoisted(() => ({
    navigateTo: vitest_1.vi.fn(),
    navigateBack: vitest_1.vi.fn(),
}));
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
vitest_1.vi.mock('../../session', () => sessionMock);
vitest_1.vi.mock('../../../db', () => dbMock);
vitest_1.vi.mock('../../../tasks/service', () => ({
    createOperationalTasksService: vitest_1.vi.fn(() => tasksServiceMock),
}));
vitest_1.vi.mock('../../../_core/notification', () => ({
    notifyOwner: vitest_1.vi.fn(() => Promise.resolve()),
}));
const tareas_1 = require("./tareas");
function employeeSession() {
    return {
        id: 7,
        waNumber: '5491111111111',
        userType: 'employee',
        userId: 7,
        userName: 'Diego',
        currentMenu: 'tarea_actual',
        contextData: {},
        menuHistory: ['main'],
        lastActivityAt: new Date(),
        createdAt: new Date(),
    };
}
(0, vitest_1.describe)('employee current task screen', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        dbMock.getTareasEmpleado.mockResolvedValue([]);
        dbMock.listOperationalTasksByEmployee.mockResolvedValue([]);
        sessionMock.navigateTo.mockResolvedValue(undefined);
        sessionMock.navigateBack.mockResolvedValue({ session: employeeSession(), previousMenu: 'main' });
    });
    (0, vitest_1.it)('prioritizes a task pending confirmation and offers direct acceptance', async () => {
        dbMock.getTareasEmpleado.mockResolvedValue([
            {
                id: 101,
                titulo: 'Limpieza baño planta alta',
                local: 'Baños',
                prioridad: 'media',
                estado: 'en_progreso',
                asignacionEstado: 'aceptada',
                descripcion: 'Repaso completo',
            },
        ]);
        dbMock.listOperationalTasksByEmployee.mockResolvedValue([
            {
                id: 202,
                titulo: 'Control baños',
                ubicacion: 'Pasillo norte',
                prioridad: 'alta',
                estado: 'pendiente_confirmacion',
                descripcion: 'Verificar insumos',
            },
        ]);
        dbMock.getOperationalTaskById.mockResolvedValue({
            id: 202,
            titulo: 'Control baños',
            ubicacion: 'Pasillo norte',
            prioridad: 'alta',
            estado: 'pendiente_confirmacion',
            descripcion: 'Verificar insumos',
            checklistObjetivo: 'Reponer jabón',
        });
        const menu = await (0, tareas_1.buildTareaActual)(employeeSession());
        (0, vitest_1.expect)(menu).toContain('🎯 *Tu tarea actual*');
        (0, vitest_1.expect)(menu).toContain('Op. #202');
        (0, vitest_1.expect)(menu).toContain('Pendiente de confirmación');
        (0, vitest_1.expect)(menu).toContain('1️⃣  ✅ Aceptar e iniciar');
        (0, vitest_1.expect)(menu).toContain('2️⃣  ❌ No puedo tomarla');
        (0, vitest_1.expect)(menu).toContain('4️⃣  📋 Ver todas mis tareas');
    });
    (0, vitest_1.it)('renders a fallback state when there is no current task', async () => {
        const menu = await (0, tareas_1.buildTareaActual)(employeeSession());
        (0, vitest_1.expect)(menu).toContain('🎯 *Tu tarea actual*');
        (0, vitest_1.expect)(menu).toContain('✅ No tenés una tarea activa ahora.');
        (0, vitest_1.expect)(menu).toContain('1️⃣  📋 Ver todas mis tareas');
        (0, vitest_1.expect)(menu).toContain('2️⃣  🕐 Registrar asistencia');
        (0, vitest_1.expect)(menu).toContain('3️⃣  🚻 Ver rondas');
    });
    (0, vitest_1.it)('returns a clear message when a new operational task cannot be accepted because another one is already in progress', async () => {
        dbMock.getTareasEmpleado.mockResolvedValue([]);
        dbMock.listOperationalTasksByEmployee.mockResolvedValue([
            {
                id: 202,
                titulo: 'Control baños',
                ubicacion: 'Pasillo norte',
                prioridad: 'alta',
                estado: 'pendiente_confirmacion',
                descripcion: 'Verificar insumos',
            },
            {
                id: 203,
                titulo: 'Reposición cocina',
                ubicacion: 'Cocina',
                prioridad: 'media',
                estado: 'en_progreso',
                descripcion: 'Reponer descartables',
            },
        ]);
        dbMock.getOperationalTaskById.mockResolvedValue({
            id: 202,
            titulo: 'Control baños',
            ubicacion: 'Pasillo norte',
            prioridad: 'alta',
            estado: 'pendiente_confirmacion',
            descripcion: 'Verificar insumos',
            checklistObjetivo: 'Reponer jabón',
        });
        tasksServiceMock.acceptTask.mockRejectedValue(new Error('Employee already has an active operational task'));
        await (0, vitest_1.expect)((0, tareas_1.handleTareaActual)(employeeSession(), '1')).resolves.toMatch(/ya ten[eé]s.*en curso|termin[aá] o paus[aá]/i);
    });
});
