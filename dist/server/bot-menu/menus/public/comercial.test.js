"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sessionMock = vitest_1.vi.hoisted(() => ({
    navigateTo: vitest_1.vi.fn(),
    resetToMain: vitest_1.vi.fn(),
}));
const dbMock = vitest_1.vi.hoisted(() => ({
    initDb: vitest_1.vi.fn(),
    db: {
        delete: vitest_1.vi.fn(() => ({ run: vitest_1.vi.fn() })),
        run: vitest_1.vi.fn(),
    },
    crearLead: vitest_1.vi.fn(),
    getUsers: vitest_1.vi.fn(),
    enqueueBotMessage: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../../session', () => sessionMock);
vitest_1.vi.mock('../../../db', () => dbMock);
const comercial_1 = require("./comercial");
function publicSession(contextData = {}, currentMenu = 'main') {
    return {
        id: 1,
        waNumber: '5491111111111',
        userType: 'public',
        userId: 0,
        userName: 'Visitante',
        currentMenu,
        contextData,
        menuHistory: [],
        lastActivityAt: new Date(),
        createdAt: new Date(),
    };
}
(0, vitest_1.describe)('public commercial bot menu', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        sessionMock.navigateTo.mockResolvedValue(undefined);
        sessionMock.resetToMain.mockResolvedValue(undefined);
        dbMock.crearLead.mockResolvedValue(101);
        dbMock.getUsers.mockResolvedValue([]);
    });
    (0, vitest_1.it)('shows the conversion-focused public menu', () => {
        const menu = (0, comercial_1.buildPublicMainMenu)();
        (0, vitest_1.expect)(menu).toContain('alquilar un local');
        (0, vitest_1.expect)(menu).toContain('Coordinar una visita');
        (0, vitest_1.expect)(menu).toContain('llegar');
        (0, vitest_1.expect)(menu).toContain('Hablar con un asesor');
        (0, vitest_1.expect)(menu).toContain('locatario');
    });
    (0, vitest_1.it)('routes main menu options to the new public flows', async () => {
        const session = publicSession();
        await (0, vitest_1.expect)((0, comercial_1.handlePublicMain)(session, '1')).resolves.toContain('Consulta comercial');
        (0, vitest_1.expect)(sessionMock.navigateTo).toHaveBeenLastCalledWith(session, 'public_alquiler_p1', { pendingText: true });
        await (0, vitest_1.expect)((0, comercial_1.handlePublicMain)(session, '2')).resolves.toContain('Coordinar visita');
        (0, vitest_1.expect)(sessionMock.navigateTo).toHaveBeenLastCalledWith(session, 'public_visita_p1', { pendingText: true });
        await (0, vitest_1.expect)((0, comercial_1.handlePublicMain)(session, '3')).resolves.toContain('Ubicación y horarios');
        (0, vitest_1.expect)(sessionMock.navigateTo).toHaveBeenLastCalledWith(session, 'public_ubicacion', {});
        await (0, vitest_1.expect)((0, comercial_1.handlePublicMain)(session, '4')).resolves.toContain('Hablar con un asesor');
        (0, vitest_1.expect)(sessionMock.navigateTo).toHaveBeenLastCalledWith(session, 'public_asesor_p1', { pendingText: true });
        await (0, vitest_1.expect)((0, comercial_1.handlePublicMain)(session, '5')).resolves.toContain('Ayuda para locatarios');
        (0, vitest_1.expect)(sessionMock.navigateTo).toHaveBeenLastCalledWith(session, 'public_reclamo_p1', { pendingText: true });
    });
    (0, vitest_1.it)('stores the selected follow-up preference in rental leads', async () => {
        const session = publicSession({
            alquilerNombre: 'Laura Perez',
            alquilerMarca: 'Casa Rio',
            alquilerRubro: 'Deco / Hogar',
            alquilerInstagram: '@casario',
            alquilerTipoEspacio: 'Stand / Módulo',
            alquilerDesdeCuando: 'lo antes posible',
            alquilerSeguimiento: 'Quiere coordinar una visita',
        }, 'public_alquiler_confirmar');
        await (0, vitest_1.expect)((0, comercial_1.handlePublicAlquilerConfirmar)(session, '1')).resolves.toContain('registrada');
        (0, vitest_1.expect)(dbMock.crearLead).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            nombre: 'Laura Perez',
            telefono: '5491111111111',
            waId: '5491111111111',
            rubro: 'Deco / Hogar',
            fuente: 'whatsapp',
            estado: 'nuevo',
            mensaje: vitest_1.expect.stringContaining('Seguimiento: Quiere coordinar una visita'),
        }));
    });
    (0, vitest_1.it)('creates visit leads as whatsapp leads in nuevo state', async () => {
        const session = publicSession({
            visitaNombre: 'Martin Soto',
            visitaMarcaRubro: 'Indumentaria premium',
        }, 'public_visita_p3');
        await (0, vitest_1.expect)((0, comercial_1.handlePublicVisitaP3)(session, '3')).resolves.toContain('Visita solicitada');
        (0, vitest_1.expect)(dbMock.crearLead).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            nombre: 'Martin Soto',
            telefono: '5491111111111',
            waId: '5491111111111',
            rubro: 'visita_comercial',
            fuente: 'whatsapp',
            estado: 'nuevo',
            mensaje: vitest_1.expect.stringContaining('Preferencia visita: Fin de semana'),
        }));
    });
});
