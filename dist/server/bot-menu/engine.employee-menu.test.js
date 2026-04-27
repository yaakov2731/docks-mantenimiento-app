"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sessionMock = vitest_1.vi.hoisted(() => ({
    getSession: vitest_1.vi.fn(),
    createSession: vitest_1.vi.fn(),
    navigateBack: vitest_1.vi.fn(),
    resetToMain: vitest_1.vi.fn(),
    isSessionExpired: vitest_1.vi.fn(),
    updateSession: vitest_1.vi.fn(),
    navigateTo: vitest_1.vi.fn(),
}));
const mainMenuMock = vitest_1.vi.hoisted(() => ({
    buildEmployeeMainMenu: vitest_1.vi.fn(async () => 'employee main'),
    buildAdminMainMenu: vitest_1.vi.fn(async () => 'admin main'),
    buildSalesMainMenu: vitest_1.vi.fn(() => 'sales main'),
    buildHelpMessage: vitest_1.vi.fn(() => 'help'),
    buildAdminReclamosMenu: vitest_1.vi.fn(() => 'reclamos menu'),
    buildAdminOperationMenu: vitest_1.vi.fn(() => 'operation menu'),
}));
const employeeTasksMock = vitest_1.vi.hoisted(() => ({
    buildTareaActual: vitest_1.vi.fn(async () => 'current task'),
    handleTareaActual: vitest_1.vi.fn(async () => 'handled current task'),
    buildTareasLista: vitest_1.vi.fn(async () => 'task list'),
    handleTareasLista: vitest_1.vi.fn(async () => 'handled task list'),
    buildTareaDetalle: vitest_1.vi.fn(async () => 'task detail'),
    handleTareaDetalle: vitest_1.vi.fn(async () => 'handled task detail'),
    handleConfirmarCompletar: vitest_1.vi.fn(async () => 'handled confirm'),
    handlePausaMotivo: vitest_1.vi.fn(async () => 'handled pause reason'),
    handlePausaMotivoLibre: vitest_1.vi.fn(async () => 'handled free pause'),
    handleProblema: vitest_1.vi.fn(async () => 'handled problem'),
    handleProblemaLibre: vitest_1.vi.fn(async () => 'handled free problem'),
    handleNotaLibre: vitest_1.vi.fn(async () => 'handled free note'),
}));
vitest_1.vi.mock('./session', () => sessionMock);
vitest_1.vi.mock('./menus/main', () => mainMenuMock);
vitest_1.vi.mock('./menus/employee/tareas', () => employeeTasksMock);
vitest_1.vi.mock('./menus/employee/asistencia', () => ({
    buildAsistenciaMenu: vitest_1.vi.fn(async () => 'attendance menu'),
    handleAsistencia: vitest_1.vi.fn(async () => 'handled attendance'),
}));
vitest_1.vi.mock('./menus/employee/rondas', () => ({
    buildRondasLista: vitest_1.vi.fn(async () => 'rounds list'),
    handleRondasLista: vitest_1.vi.fn(async () => 'handled rounds'),
    handleRondaDetalle: vitest_1.vi.fn(async () => 'handled round detail'),
    handleRondaObservacion: vitest_1.vi.fn(async () => 'handled round observation'),
    handleRondaObservacionLibre: vitest_1.vi.fn(async () => 'handled free round observation'),
    handleRondaRechazo: vitest_1.vi.fn(async () => 'handled round reject'),
}));
vitest_1.vi.mock('./menus/admin/reclamos', () => ({
    buildReclamosPendientes: vitest_1.vi.fn(),
    handleReclamosPendientes: vitest_1.vi.fn(),
    buildAdminReclamoDetalle: vitest_1.vi.fn(),
    handleAdminReclamoDetalle: vitest_1.vi.fn(),
    handleAsignarEmpleado: vitest_1.vi.fn(),
    handleAsignarConfirmar: vitest_1.vi.fn(),
    handleCambiarPrioridad: vitest_1.vi.fn(),
    handleCancelarReclamo: vitest_1.vi.fn(),
    buildEstadoGeneral: vitest_1.vi.fn(),
    buildSLAVencidos: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('./menus/admin/rondas', () => ({
    buildAdminRondasMenu: vitest_1.vi.fn(),
    handleAdminRondas: vitest_1.vi.fn(),
    buildAdminRondasUnassigned: vitest_1.vi.fn(),
    handleAdminRondasUnassigned: vitest_1.vi.fn(),
    buildAdminRondaDetalle: vitest_1.vi.fn(),
    handleAdminRondaDetalle: vitest_1.vi.fn(),
    buildAdminRondasAssign: vitest_1.vi.fn(),
    handleAdminRondasAssign: vitest_1.vi.fn(),
    buildAdminRondasCreate: vitest_1.vi.fn(),
    handleAdminRondasCreate: vitest_1.vi.fn(),
    handleAdminRondasCreateCustom: vitest_1.vi.fn(),
    handleAdminRondasCreateLocation: vitest_1.vi.fn(),
    buildAdminRondasByEmployee: vitest_1.vi.fn(),
    handleAdminRondasByEmployee: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('./menus/admin/leads', () => ({
    buildAdminLeadsSinAsignar: vitest_1.vi.fn(),
    handleAdminLeadsSinAsignar: vitest_1.vi.fn(),
    handleAdminLeadDetalle: vitest_1.vi.fn(),
    handleAdminLeadElegirVendedor: vitest_1.vi.fn(),
    handleAdminLeadConfirmar: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('./menus/admin/tasks', () => ({
    buildNuevaTareaP1: vitest_1.vi.fn(),
    handleNuevaTareaP1: vitest_1.vi.fn(),
    buildNuevaTareaP2: vitest_1.vi.fn(),
    handleNuevaTareaP2: vitest_1.vi.fn(),
    buildNuevaTareaP3: vitest_1.vi.fn(),
    handleNuevaTareaP3: vitest_1.vi.fn(),
    buildNuevaTareaConfirmar: vitest_1.vi.fn(),
    handleNuevaTareaConfirmar: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('./menus/sales/leads', () => ({
    buildLeadsLista: vitest_1.vi.fn(),
    handleLeadsLista: vitest_1.vi.fn(),
    handleLeadDetalle: vitest_1.vi.fn(),
    handleLeadNota: vitest_1.vi.fn(),
    buildNuevoLeadPaso1: vitest_1.vi.fn(),
    handleNuevoLeadPaso1: vitest_1.vi.fn(),
    handleNuevoLeadPaso2: vitest_1.vi.fn(),
    handleNuevoLeadPaso3: vitest_1.vi.fn(),
    handleNuevoLeadPaso4: vitest_1.vi.fn(),
    handleNuevoLeadConfirmar: vitest_1.vi.fn(),
    buildEstadoLeads: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('./menus/public/comercial', () => ({
    buildPublicMainMenu: vitest_1.vi.fn(() => 'public main'),
    handlePublicMain: vitest_1.vi.fn(),
    buildPublicAlquilerP1: vitest_1.vi.fn(),
    handlePublicAlquilerP1: vitest_1.vi.fn(),
    buildPublicAlquilerP2: vitest_1.vi.fn(),
    handlePublicAlquilerP2: vitest_1.vi.fn(),
    buildPublicAlquilerP3: vitest_1.vi.fn(),
    handlePublicAlquilerP3: vitest_1.vi.fn(),
    buildPublicAlquilerP4: vitest_1.vi.fn(),
    handlePublicAlquilerP4: vitest_1.vi.fn(),
    buildPublicAlquilerP5: vitest_1.vi.fn(),
    handlePublicAlquilerP5: vitest_1.vi.fn(),
    buildPublicAlquilerP6: vitest_1.vi.fn(),
    handlePublicAlquilerP6: vitest_1.vi.fn(),
    buildPublicAlquilerP7: vitest_1.vi.fn(),
    handlePublicAlquilerP7: vitest_1.vi.fn(),
    buildPublicAlquilerConfirmar: vitest_1.vi.fn(),
    handlePublicAlquilerConfirmar: vitest_1.vi.fn(),
    buildPublicVisitaP1: vitest_1.vi.fn(),
    handlePublicVisitaP1: vitest_1.vi.fn(),
    buildPublicVisitaP2: vitest_1.vi.fn(),
    handlePublicVisitaP2: vitest_1.vi.fn(),
    buildPublicVisitaP3: vitest_1.vi.fn(),
    handlePublicVisitaP3: vitest_1.vi.fn(),
    buildPublicUbicacion: vitest_1.vi.fn(),
    handlePublicUbicacion: vitest_1.vi.fn(),
    buildPublicAsesorP1: vitest_1.vi.fn(),
    handlePublicAsesorP1: vitest_1.vi.fn(),
    buildPublicAsesorP2: vitest_1.vi.fn(),
    handlePublicAsesorP2: vitest_1.vi.fn(),
    buildPublicReclamoP1: vitest_1.vi.fn(),
    handlePublicReclamoP1: vitest_1.vi.fn(),
    buildPublicReclamoP2: vitest_1.vi.fn(),
    handlePublicReclamoP2: vitest_1.vi.fn(),
    buildPublicMensajeP1: vitest_1.vi.fn(),
    handlePublicMensajeP1: vitest_1.vi.fn(),
    buildPublicMensajeP2: vitest_1.vi.fn(),
    handlePublicMensajeP2: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../db', () => ({
    initDb: vitest_1.vi.fn(async () => undefined),
    db: {
        delete: vitest_1.vi.fn(() => ({ run: vitest_1.vi.fn(async () => undefined) })),
        run: vitest_1.vi.fn(async () => undefined),
    },
    getEmpleadoByWaId: vitest_1.vi.fn(),
    getUsers: vitest_1.vi.fn(),
}));
const engine_1 = require("./engine");
function employeeSession(currentMenu = 'main') {
    return {
        id: 7,
        waNumber: '5491111111111',
        userType: 'employee',
        userId: 7,
        userName: 'Diego',
        currentMenu,
        contextData: {},
        menuHistory: [],
        lastActivityAt: new Date(),
        createdAt: new Date(),
    };
}
(0, vitest_1.describe)('employee current-task-first routing', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        sessionMock.getSession.mockResolvedValue(employeeSession());
        sessionMock.isSessionExpired.mockReturnValue(false);
        sessionMock.updateSession.mockResolvedValue(undefined);
        sessionMock.navigateTo.mockImplementation(async (session, menu, contextData = {}) => ({
            ...session,
            currentMenu: menu,
            contextData,
            menuHistory: [...session.menuHistory, session.currentMenu],
        }));
    });
    (0, vitest_1.it)('opens the current task from option 1', async () => {
        await (0, vitest_1.expect)((0, engine_1.handleIncomingMessage)('5491111111111', '1')).resolves.toBe('current task');
        (0, vitest_1.expect)(sessionMock.navigateTo).toHaveBeenCalledWith(vitest_1.expect.any(Object), 'tarea_actual', {});
    });
    (0, vitest_1.it)('opens the full task list from option 2', async () => {
        await (0, vitest_1.expect)((0, engine_1.handleIncomingMessage)('5491111111111', '2')).resolves.toBe('task list');
        (0, vitest_1.expect)(sessionMock.navigateTo).toHaveBeenCalledWith(vitest_1.expect.any(Object), 'tareas_lista', { page: 1 });
    });
    (0, vitest_1.it)('keeps attendance on option 3', async () => {
        await (0, vitest_1.expect)((0, engine_1.handleIncomingMessage)('5491111111111', '3')).resolves.toBe('attendance menu');
        (0, vitest_1.expect)(sessionMock.navigateTo).toHaveBeenCalledWith(vitest_1.expect.any(Object), 'asistencia', {});
    });
    (0, vitest_1.it)('routes direct attendance text from the main menu', async () => {
        await (0, vitest_1.expect)((0, engine_1.handleIncomingMessage)('5491111111111', 'salida')).resolves.toBe('handled attendance');
        (0, vitest_1.expect)(sessionMock.navigateTo).toHaveBeenCalledWith(vitest_1.expect.any(Object), 'asistencia', {});
    });
    (0, vitest_1.it)('keeps rounds on option 4', async () => {
        await (0, vitest_1.expect)((0, engine_1.handleIncomingMessage)('5491111111111', '4')).resolves.toBe('rounds list');
        (0, vitest_1.expect)(sessionMock.navigateTo).toHaveBeenCalledWith(vitest_1.expect.any(Object), 'rondas_lista', { page: 1 });
    });
});
