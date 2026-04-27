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
const adminReclamosMock = vitest_1.vi.hoisted(() => ({
    buildReclamosPendientes: vitest_1.vi.fn(async () => 'reclamos pendientes'),
    handleReclamosPendientes: vitest_1.vi.fn(async () => 'handled reclamos'),
    buildAdminReclamoDetalle: vitest_1.vi.fn(() => 'detalle reclamo'),
    handleAdminReclamoDetalle: vitest_1.vi.fn(async () => 'handled detalle'),
    handleAsignarEmpleado: vitest_1.vi.fn(async () => 'handled asignar'),
    handleAsignarConfirmar: vitest_1.vi.fn(async () => 'handled confirmar'),
    handleCambiarPrioridad: vitest_1.vi.fn(async () => 'handled prioridad'),
    handleCancelarReclamo: vitest_1.vi.fn(async () => 'handled cancelar'),
    buildEstadoGeneral: vitest_1.vi.fn(async () => 'estado general'),
    buildEstadoRondas: vitest_1.vi.fn(async () => 'estado rondas'),
    buildSLAVencidos: vitest_1.vi.fn(async () => 'sla vencidos'),
}));
const adminRondasMock = vitest_1.vi.hoisted(() => ({
    buildAdminRondasMenu: vitest_1.vi.fn(async () => 'rondas menu'),
    handleAdminRondas: vitest_1.vi.fn(async () => 'handled rondas'),
    buildAdminRondasUnassigned: vitest_1.vi.fn(async () => 'rondas lista'),
    handleAdminRondasUnassigned: vitest_1.vi.fn(async () => 'handled rondas lista'),
    buildAdminRondaDetalle: vitest_1.vi.fn(() => 'ronda detalle'),
    handleAdminRondaDetalle: vitest_1.vi.fn(async () => 'handled ronda detalle'),
    buildAdminRondasAssign: vitest_1.vi.fn(async () => 'rondas assign'),
    handleAdminRondasAssign: vitest_1.vi.fn(async () => 'handled rondas assign'),
    buildAdminRondasCreate: vitest_1.vi.fn(() => 'rondas create'),
    handleAdminRondasCreate: vitest_1.vi.fn(async () => 'handled rondas create'),
    handleAdminRondasCreateCustom: vitest_1.vi.fn(async () => 'handled rondas custom'),
    handleAdminRondasCreateLocation: vitest_1.vi.fn(async () => 'handled rondas location'),
    buildAdminRondasByEmployee: vitest_1.vi.fn(async () => 'rondas by employee'),
    handleAdminRondasByEmployee: vitest_1.vi.fn(async () => 'handled rondas by employee'),
}));
const adminLeadsMock = vitest_1.vi.hoisted(() => ({
    buildAdminLeadsSinAsignar: vitest_1.vi.fn(async () => 'leads menu'),
    handleAdminLeadsSinAsignar: vitest_1.vi.fn(async () => 'handled leads'),
    handleAdminLeadDetalle: vitest_1.vi.fn(async () => 'handled lead detalle'),
    handleAdminLeadElegirVendedor: vitest_1.vi.fn(async () => 'handled elegir vendedor'),
    handleAdminLeadConfirmar: vitest_1.vi.fn(async () => 'handled lead confirmar'),
}));
const adminTasksMock = vitest_1.vi.hoisted(() => ({
    buildNuevaTareaP1: vitest_1.vi.fn(async () => 'nueva tarea p1'),
    handleNuevaTareaP1: vitest_1.vi.fn(async () => 'handled tarea p1'),
    buildNuevaTareaP2: vitest_1.vi.fn(() => 'nueva tarea p2'),
    handleNuevaTareaP2: vitest_1.vi.fn(async () => 'handled tarea p2'),
    buildNuevaTareaP3: vitest_1.vi.fn(() => 'nueva tarea p3'),
    handleNuevaTareaP3: vitest_1.vi.fn(async () => 'handled tarea p3'),
    buildNuevaTareaConfirmar: vitest_1.vi.fn(() => 'nueva tarea confirmar'),
    handleNuevaTareaConfirmar: vitest_1.vi.fn(async () => 'handled tarea confirmar'),
}));
vitest_1.vi.mock('./session', () => sessionMock);
vitest_1.vi.mock('./menus/main', () => mainMenuMock);
vitest_1.vi.mock('./menus/admin/reclamos', () => adminReclamosMock);
vitest_1.vi.mock('./menus/admin/rondas', () => adminRondasMock);
vitest_1.vi.mock('./menus/admin/leads', () => adminLeadsMock);
vitest_1.vi.mock('./menus/admin/tasks', () => adminTasksMock);
vitest_1.vi.mock('./menus/employee/tareas', () => ({
    buildTareasLista: vitest_1.vi.fn(),
    handleTareasLista: vitest_1.vi.fn(),
    buildTareaDetalle: vitest_1.vi.fn(),
    handleTareaDetalle: vitest_1.vi.fn(),
    handleConfirmarCompletar: vitest_1.vi.fn(),
    handlePausaMotivo: vitest_1.vi.fn(),
    handlePausaMotivoLibre: vitest_1.vi.fn(),
    handleProblema: vitest_1.vi.fn(),
    handleProblemaLibre: vitest_1.vi.fn(),
    handleNotaLibre: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('./menus/employee/asistencia', () => ({
    buildAsistenciaMenu: vitest_1.vi.fn(),
    handleAsistencia: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('./menus/employee/rondas', () => ({
    buildRondasLista: vitest_1.vi.fn(),
    handleRondasLista: vitest_1.vi.fn(),
    handleRondaDetalle: vitest_1.vi.fn(),
    handleRondaObservacion: vitest_1.vi.fn(),
    handleRondaObservacionLibre: vitest_1.vi.fn(),
    handleRondaRechazo: vitest_1.vi.fn(),
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
    handlePublicAlquilerP3Otro: vitest_1.vi.fn(),
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
function adminSession(currentMenu = 'main') {
    return {
        id: 1,
        waNumber: '5491111111111',
        userType: 'admin',
        userId: 1,
        userName: 'Juan',
        currentMenu,
        contextData: {},
        menuHistory: [],
        lastActivityAt: new Date(),
        createdAt: new Date(),
    };
}
(0, vitest_1.describe)('admin compact menu routing', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        sessionMock.getSession.mockResolvedValue(adminSession());
        sessionMock.isSessionExpired.mockReturnValue(false);
        sessionMock.updateSession.mockResolvedValue(undefined);
        sessionMock.navigateTo.mockImplementation(async (session, menu, contextData = {}) => ({
            ...session,
            currentMenu: menu,
            contextData,
            menuHistory: [...session.menuHistory, session.currentMenu],
        }));
    });
    (0, vitest_1.it)('opens the reclamos category from option 1', async () => {
        await (0, vitest_1.expect)((0, engine_1.handleIncomingMessage)('5491111111111', '1')).resolves.toBe('reclamos menu');
        (0, vitest_1.expect)(sessionMock.navigateTo).toHaveBeenCalledWith(vitest_1.expect.any(Object), 'admin_reclamos_home', {});
    });
    (0, vitest_1.it)('opens daily operations from option 2', async () => {
        await (0, vitest_1.expect)((0, engine_1.handleIncomingMessage)('5491111111111', '2')).resolves.toBe('operation menu');
        (0, vitest_1.expect)(sessionMock.navigateTo).toHaveBeenCalledWith(vitest_1.expect.any(Object), 'admin_operacion_home', {});
    });
    (0, vitest_1.it)('keeps rounds management on option 3', async () => {
        await (0, vitest_1.expect)((0, engine_1.handleIncomingMessage)('5491111111111', '3')).resolves.toBe('rondas menu');
        (0, vitest_1.expect)(sessionMock.navigateTo).toHaveBeenCalledWith(vitest_1.expect.any(Object), 'admin_rondas', { page: 1 });
    });
    (0, vitest_1.it)('opens commercial leads from option 4', async () => {
        await (0, vitest_1.expect)((0, engine_1.handleIncomingMessage)('5491111111111', '4')).resolves.toBe('leads menu');
        (0, vitest_1.expect)(sessionMock.navigateTo).toHaveBeenCalledWith(vitest_1.expect.any(Object), 'admin_leads_sin_asignar', { page: 1 });
    });
    (0, vitest_1.it)('routes reclamos category option 1 to pending complaints', async () => {
        sessionMock.getSession.mockResolvedValue(adminSession('admin_reclamos_home'));
        await (0, vitest_1.expect)((0, engine_1.handleIncomingMessage)('5491111111111', '1')).resolves.toBe('reclamos pendientes');
        (0, vitest_1.expect)(sessionMock.navigateTo).toHaveBeenCalledWith(vitest_1.expect.any(Object), 'admin_reclamos', { page: 1 });
    });
    (0, vitest_1.it)('routes reclamos category option 2 to urgent unassigned complaints', async () => {
        sessionMock.getSession.mockResolvedValue(adminSession('admin_reclamos_home'));
        await (0, vitest_1.expect)((0, engine_1.handleIncomingMessage)('5491111111111', '2')).resolves.toBe('reclamos pendientes');
        (0, vitest_1.expect)(sessionMock.navigateTo).toHaveBeenCalledWith(vitest_1.expect.any(Object), 'admin_urgentes', { page: 1 });
        (0, vitest_1.expect)(adminReclamosMock.buildReclamosPendientes).toHaveBeenCalledWith(vitest_1.expect.any(Object), 'urgentes');
    });
    (0, vitest_1.it)('routes reclamos category option 3 to unassigned complaints', async () => {
        sessionMock.getSession.mockResolvedValue(adminSession('admin_reclamos_home'));
        await (0, vitest_1.expect)((0, engine_1.handleIncomingMessage)('5491111111111', '3')).resolves.toBe('reclamos pendientes');
        (0, vitest_1.expect)(sessionMock.navigateTo).toHaveBeenCalledWith(vitest_1.expect.any(Object), 'admin_sin_asignar', { page: 1 });
        (0, vitest_1.expect)(adminReclamosMock.buildReclamosPendientes).toHaveBeenCalledWith(vitest_1.expect.any(Object), 'sin_asignar');
    });
    (0, vitest_1.it)('routes reclamos category option 4 to expired SLA view', async () => {
        sessionMock.getSession.mockResolvedValue(adminSession('admin_reclamos_home'));
        await (0, vitest_1.expect)((0, engine_1.handleIncomingMessage)('5491111111111', '4')).resolves.toBe('sla vencidos');
        (0, vitest_1.expect)(sessionMock.navigateTo).toHaveBeenCalledWith(vitest_1.expect.any(Object), 'admin_info', {});
    });
    (0, vitest_1.it)('routes operation option 1 to daily status', async () => {
        sessionMock.getSession.mockResolvedValue(adminSession('admin_operacion_home'));
        await (0, vitest_1.expect)((0, engine_1.handleIncomingMessage)('5491111111111', '1')).resolves.toBe('estado general');
        (0, vitest_1.expect)(sessionMock.navigateTo).toHaveBeenCalledWith(vitest_1.expect.any(Object), 'admin_info', {});
    });
    (0, vitest_1.it)('routes operation option 2 to new task assignment', async () => {
        sessionMock.getSession.mockResolvedValue(adminSession('admin_operacion_home'));
        await (0, vitest_1.expect)((0, engine_1.handleIncomingMessage)('5491111111111', '2')).resolves.toBe('nueva tarea p1');
        (0, vitest_1.expect)(sessionMock.navigateTo).toHaveBeenCalledWith(vitest_1.expect.any(Object), 'admin_nueva_tarea_p1', { page: 1 });
    });
});
