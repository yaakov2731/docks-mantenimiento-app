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
const routers_1 = require("./routers");
const db_1 = require("./db");
const schema = __importStar(require("../drizzle/schema"));
const adminContext = {
    req: {},
    res: { cookie() { }, clearCookie() { } },
    user: { id: 10, username: 'admin', name: 'Admin', role: 'admin' },
};
const collectionsContext = {
    req: {},
    res: { cookie() { }, clearCookie() { } },
    user: { id: 11, username: 'tesoreria', name: 'Tesorería', role: 'collections' },
};
const employeeContext = {
    req: {},
    res: { cookie() { }, clearCookie() { } },
    user: { id: 12, username: 'operario', name: 'Operario', role: 'employee' },
};
(0, vitest_1.describe)('cobranzas router', () => {
    (0, vitest_1.it)('allows treasury users to import balances and queue reviewed WhatsApp messages', async () => {
        const caller = routers_1.appRouter.createCaller(collectionsContext);
        await caller.cobranzas.guardarLocatario({
            nombre: 'Café Puerto',
            local: '12',
            telefonoWa: '11 5555-0000',
        });
        const importResult = await caller.cobranzas.guardarImportacion({
            filename: 'saldos.xlsx',
            sourceType: 'xlsx',
            periodLabel: 'Abril 2026',
            fechaCorte: '2026-04-27',
            totalRows: 1,
            rows: [{
                    locatarioNombre: 'Cafe Puerto',
                    local: '12',
                    periodo: 'Abril 2026',
                    saldo: 150000,
                    ingreso: 0,
                }],
        });
        (0, vitest_1.expect)(importResult).toMatchObject({ success: true, creados: 1 });
        const saldos = await caller.cobranzas.listarSaldos();
        (0, vitest_1.expect)(saldos).toHaveLength(1);
        (0, vitest_1.expect)(saldos[0]).toMatchObject({
            locatarioNombre: 'Cafe Puerto',
            telefonoWa: '5491155550000',
            estado: 'pendiente',
        });
        const [prepared] = await caller.cobranzas.prepararMensajes({ saldoIds: [saldos[0].id] });
        (0, vitest_1.expect)(prepared.puedeEnviar).toBe(true);
        (0, vitest_1.expect)(prepared.message).toContain('Administración de Docks del Puerto');
        const sent = await caller.cobranzas.encolarNotificaciones({
            mensajes: [{ saldoId: saldos[0].id, message: prepared.message }],
            reenviar: false,
        });
        (0, vitest_1.expect)(sent).toMatchObject({ success: true, queued: 1, skipped: 0 });
        (0, vitest_1.expect)(await db_1.db.select().from(schema.botQueue)).toHaveLength(1);
        (0, vitest_1.expect)(await db_1.db.select().from(schema.cobranzasNotificaciones)).toHaveLength(1);
        const duplicate = await caller.cobranzas.encolarNotificaciones({
            mensajes: [{ saldoId: saldos[0].id, message: prepared.message }],
            reenviar: false,
        });
        (0, vitest_1.expect)(duplicate).toMatchObject({ queued: 0, skipped: 1 });
        (0, vitest_1.expect)(await db_1.db.select().from(schema.botQueue)).toHaveLength(1);
    });
    (0, vitest_1.it)('blocks non-collections roles and lets admins create treasury users', async () => {
        const employeeCaller = routers_1.appRouter.createCaller(employeeContext);
        await (0, vitest_1.expect)(employeeCaller.cobranzas.resumen()).rejects.toMatchObject({ code: 'FORBIDDEN' });
        const adminCaller = routers_1.appRouter.createCaller(adminContext);
        await adminCaller.usuarios.crear({
            username: 'tesoreria',
            password: 'secreto1',
            name: 'Tesorería',
            role: 'collections',
        });
        const [user] = await db_1.db.select().from(schema.users);
        (0, vitest_1.expect)(user.role).toBe('collections');
    });
    (0, vitest_1.it)('clears the imported collections list without deleting tenant contacts or bot queue', async () => {
        const caller = routers_1.appRouter.createCaller(collectionsContext);
        await caller.cobranzas.guardarLocatario({
            nombre: 'Locatario Uno',
            local: '1',
            telefonoWa: '5491111111111',
        });
        const importResult = await caller.cobranzas.guardarImportacion({
            filename: 'abril.pdf',
            sourceType: 'pdf',
            periodLabel: 'Abril 2026',
            totalRows: 1,
            rows: [{ locatarioNombre: 'Locatario Uno', local: '1', periodo: 'Abril 2026', saldo: 1000 }],
        });
        const [saldo] = await caller.cobranzas.listarSaldos();
        await caller.cobranzas.encolarNotificaciones({
            mensajes: [{ saldoId: saldo.id, message: 'Mensaje de cobranza para prueba' }],
            reenviar: false,
        });
        const result = await caller.cobranzas.borrarLista();
        (0, vitest_1.expect)(result).toMatchObject({
            success: true,
            importaciones: 1,
            saldos: 1,
            notificaciones: 1,
            total: 3,
        });
        (0, vitest_1.expect)(importResult.creados).toBe(1);
        (0, vitest_1.expect)(await db_1.db.select().from(schema.cobranzasImportaciones)).toHaveLength(0);
        (0, vitest_1.expect)(await db_1.db.select().from(schema.cobranzasSaldos)).toHaveLength(0);
        (0, vitest_1.expect)(await db_1.db.select().from(schema.cobranzasNotificaciones)).toHaveLength(0);
        (0, vitest_1.expect)(await db_1.db.select().from(schema.locatariosCobranza)).toHaveLength(1);
        (0, vitest_1.expect)(await db_1.db.select().from(schema.botQueue)).toHaveLength(1);
    });
});
