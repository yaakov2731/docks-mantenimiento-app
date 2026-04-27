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
const db_factory_1 = require("./test/db-factory");
const schema = __importStar(require("../drizzle/schema"));
const adminContext = {
    req: {},
    res: { cookie() { }, clearCookie() { } },
    user: { id: 10, username: 'admin', name: 'Admin', role: 'admin' },
};
(0, vitest_1.describe)('tareas operativas router', () => {
    (0, vitest_1.beforeEach)(async () => {
        await (0, db_factory_1.resetTestDb)();
    });
    (0, vitest_1.it)('deletes the selected operational tasks and their event history', async () => {
        const firstId = await (0, db_1.createOperationalTask)({
            origen: 'manual',
            tipoTrabajo: 'Limpieza',
            titulo: 'Baño planta alta',
            descripcion: 'Repaso completo',
            ubicacion: 'Baños',
            prioridad: 'media',
        });
        const secondId = await (0, db_1.createOperationalTask)({
            origen: 'manual',
            tipoTrabajo: 'Reposición',
            titulo: 'Insumos hall',
            descripcion: 'Control de stock',
            ubicacion: 'Hall central',
            prioridad: 'alta',
        });
        await (0, db_1.addOperationalTaskEvent)({
            tareaId: firstId,
            tipo: 'admin_update',
            descripcion: 'Creada por admin',
            actorTipo: 'admin',
            actorId: 10,
            actorNombre: 'Admin',
        });
        const caller = routers_1.appRouter.createCaller(adminContext);
        const result = await caller.tareasOperativas.eliminarLote({ ids: [firstId] });
        const remainingTasks = await (0, db_1.listOperationalTasks)();
        const remainingEvents = await db_1.db.select().from(schema.tareasOperativasEvento);
        (0, vitest_1.expect)(result).toEqual({ success: true, deleted: 1 });
        (0, vitest_1.expect)(remainingTasks.map(task => task.id)).toEqual([secondId]);
        (0, vitest_1.expect)(remainingEvents).toHaveLength(0);
    });
});
