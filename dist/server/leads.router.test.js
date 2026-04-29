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
(0, vitest_1.describe)('leads router', () => {
    (0, vitest_1.it)('assigns a lead to the commercial bot and queues an automatic WhatsApp reply', async () => {
        const caller = routers_1.appRouter.createCaller(adminContext);
        await caller.configuracion.setBotComercialConfig({
            followup1Mensaje: 'Hola {{nombre}}, soy el bot comercial de Docks. Te respondemos por acá.',
        });
        const created = await caller.leads.crear({
            nombre: 'Maria Demo',
            telefono: '11 5555-0000',
            rubro: 'Indumentaria',
            fuente: 'web',
        });
        const result = await caller.leads.asignarBot({ id: created.id });
        (0, vitest_1.expect)(result).toMatchObject({ success: true, queued: true });
        const [queued] = await db_1.db.select().from(schema.botQueue);
        (0, vitest_1.expect)(queued).toMatchObject({
            waNumber: '5491155550000',
            status: 'pending',
        });
        (0, vitest_1.expect)(queued.message).toContain('Hola Maria Demo');
        const updated = await caller.leads.obtener({ id: created.id });
        (0, vitest_1.expect)(updated.asignadoA).toBe('Bot comercial');
        (0, vitest_1.expect)(updated.autoFollowupCount).toBe(1);
        (0, vitest_1.expect)(updated.lastBotMsgAt).toBeTruthy();
        (0, vitest_1.expect)(updated.firstContactedAt).toBeTruthy();
        (0, vitest_1.expect)(await (0, db_1.listUnassignedLeads)()).toHaveLength(0);
    });
});
(0, vitest_1.describe)('leads eventos', () => {
    (0, vitest_1.beforeEach)(async () => {
        const { resetTestDb } = await Promise.resolve().then(() => __importStar(require('./test/db-factory')));
        await resetTestDb();
    });
    (0, vitest_1.it)('creates and retrieves lead eventos', async () => {
        const leadId = await (0, db_1.crearLead)({
            nombre: 'Test Evento',
            telefono: '11 1234-5678',
            fuente: 'web',
        });
        await (0, db_1.createLeadEvento)({
            leadId,
            tipo: 'followup1_sent',
            descripcion: 'Follow-up 1 enviado automáticamente',
            metadataJson: JSON.stringify({ message: 'Hola Test' }),
        });
        const eventos = await (0, db_1.getLeadEventos)(leadId);
        (0, vitest_1.expect)(eventos).toHaveLength(1);
        (0, vitest_1.expect)(eventos[0]).toMatchObject({
            leadId,
            tipo: 'followup1_sent',
            descripcion: 'Follow-up 1 enviado automáticamente',
        });
        (0, vitest_1.expect)(eventos[0].createdAt).toBeTruthy();
        (0, vitest_1.expect)(eventos[0].metadataJson).toBe(JSON.stringify({ message: 'Hola Test' }));
    });
    (0, vitest_1.it)('leads.eventos tRPC query returns eventos for a lead', async () => {
        const caller = routers_1.appRouter.createCaller(adminContext);
        const { id: leadId } = await caller.leads.crear({
            nombre: 'Trpc Evento Test',
            telefono: '11 7777-0000',
            fuente: 'web',
        });
        await (0, db_1.createLeadEvento)({
            leadId,
            tipo: 'followup1_sent',
            descripcion: 'Follow-up 1 enviado automáticamente a Trpc Evento Test',
        });
        const eventos = await caller.leads.eventos({ id: leadId });
        (0, vitest_1.expect)(eventos).toHaveLength(1);
        (0, vitest_1.expect)(eventos[0]).toMatchObject({ tipo: 'followup1_sent', leadId });
    });
});
