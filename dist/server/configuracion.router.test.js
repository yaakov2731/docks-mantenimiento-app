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
const db_factory_1 = require("./test/db-factory");
const adminContext = {
    req: {},
    res: { cookie() { }, clearCookie() { } },
    user: { id: 10, username: 'admin', name: 'Admin', role: 'admin' },
};
(0, vitest_1.describe)('configuracion router', () => {
    (0, vitest_1.beforeEach)(async () => {
        await (0, db_factory_1.resetTestDb)();
    });
    (0, vitest_1.it)('reinicia las metricas operativas sin tocar la configuracion base', async () => {
        const caller = routers_1.appRouter.createCaller(adminContext);
        await db_1.db.insert(schema.users).values({
            username: 'admin',
            password: 'secret',
            name: 'Admin',
            role: 'admin',
        });
        const [empleado] = await db_1.db.insert(schema.empleados).values({
            nombre: 'Diego',
            waId: '5492222222222',
        }).returning({ id: schema.empleados.id });
        await db_1.db.insert(schema.notificaciones).values({
            tipo: 'email',
            nombre: 'Supervisor',
            destino: 'supervisor@docks.test',
        });
        const [reporte] = await db_1.db.insert(schema.reportes).values({
            locatario: 'Local demo',
            local: '42',
            planta: 'baja',
            categoria: 'limpieza',
            prioridad: 'media',
            titulo: 'Repaso general',
            descripcion: 'Limpieza profunda',
        }).returning({ id: schema.reportes.id });
        await db_1.db.insert(schema.actualizaciones).values({
            reporteId: reporte.id,
            usuarioNombre: 'Admin',
            tipo: 'nota',
            descripcion: 'Seguimiento',
        });
        await db_1.db.insert(schema.leads).values({
            nombre: 'Lead demo',
            fuente: 'whatsapp',
        });
        await db_1.db.insert(schema.botQueue).values({
            waNumber: '5491111111111',
            message: 'Mensaje pendiente',
        });
        const [task] = await db_1.db.insert(schema.tareasOperativas).values({
            origen: 'manual',
            tipoTrabajo: 'limpieza',
            titulo: 'Limpieza baños',
            descripcion: 'Completar repaso',
            ubicacion: 'Baños',
            prioridad: 'alta',
            empleadoId: empleado.id,
            empleadoNombre: 'Diego',
            empleadoWaId: '5492222222222',
        }).returning({ id: schema.tareasOperativas.id });
        await db_1.db.insert(schema.tareasOperativasEvento).values({
            tareaId: task.id,
            tipo: 'asignacion',
            descripcion: 'Asignada al empleado',
        });
        const attendanceAt = new Date('2026-04-10T09:00:00.000Z');
        const [attendance] = await db_1.db.insert(schema.empleadoAsistencia).values({
            empleadoId: empleado.id,
            tipo: 'entrada',
            timestamp: attendanceAt,
            canal: 'panel',
        }).returning({ id: schema.empleadoAsistencia.id });
        await db_1.db.insert(schema.empleadoAsistenciaAuditoria).values({
            attendanceEventId: attendance.id,
            accion: 'correccion_manual',
            valorAnteriorTipo: 'entrada',
            valorNuevoTipo: 'entrada',
            motivo: 'Ajuste',
            adminUserId: 10,
            adminUserName: 'Admin',
        });
        await db_1.db.insert(schema.empleadoLiquidacionCierre).values({
            empleadoId: empleado.id,
            periodoTipo: 'dia',
            periodoDesde: '2026-04-10',
            periodoHasta: '2026-04-10',
            cerradoPorNombre: 'Admin',
            tarifaPeriodo: 'dia',
        });
        await db_1.db.insert(schema.marcacionesEmpleados).values({
            empleadoId: empleado.id,
            entradaAt: attendanceAt,
            fuente: 'panel',
        });
        const [plantilla] = await db_1.db.insert(schema.rondasPlantilla).values({
            nombre: 'Ronda baños',
            intervaloHoras: 2,
        }).returning({ id: schema.rondasPlantilla.id });
        const [programacion] = await db_1.db.insert(schema.rondasProgramacion).values({
            plantillaId: plantilla.id,
            modoProgramacion: 'semanal',
            diaSemana: 1,
            horaInicio: '08:00',
            horaFin: '20:00',
            empleadoId: empleado.id,
            empleadoNombre: 'Diego',
            empleadoWaId: '5492222222222',
        }).returning({ id: schema.rondasProgramacion.id });
        await db_1.db.insert(schema.rondasOcurrencia).values({
            id: 5001,
            plantillaId: plantilla.id,
            programacionId: programacion.id,
            fechaOperativa: '2026-04-10',
            programadoAt: new Date('2026-04-10T12:00:00.000Z'),
            empleadoId: empleado.id,
            empleadoNombre: 'Diego',
            empleadoWaId: '5492222222222',
            nombreRonda: 'Ronda baños',
        });
        await db_1.db.insert(schema.rondasEvento).values({
            ocurrenciaId: 5001,
            tipo: 'recordatorio',
            descripcion: 'Aviso enviado',
        });
        const result = await caller.configuracion.reiniciarMetricas();
        (0, vitest_1.expect)(result).toMatchObject({
            success: true,
            reportes: 1,
            tareas: 1,
            asistencia: 1,
            rondas: 1,
            total: 12,
        });
        (0, vitest_1.expect)(await db_1.db.select().from(schema.reportes)).toHaveLength(0);
        (0, vitest_1.expect)(await db_1.db.select().from(schema.actualizaciones)).toHaveLength(0);
        (0, vitest_1.expect)(await db_1.db.select().from(schema.leads)).toHaveLength(0);
        (0, vitest_1.expect)(await db_1.db.select().from(schema.botQueue)).toHaveLength(0);
        (0, vitest_1.expect)(await db_1.db.select().from(schema.tareasOperativas)).toHaveLength(0);
        (0, vitest_1.expect)(await db_1.db.select().from(schema.tareasOperativasEvento)).toHaveLength(0);
        (0, vitest_1.expect)(await db_1.db.select().from(schema.empleadoAsistencia)).toHaveLength(0);
        (0, vitest_1.expect)(await db_1.db.select().from(schema.empleadoAsistenciaAuditoria)).toHaveLength(0);
        (0, vitest_1.expect)(await db_1.db.select().from(schema.empleadoLiquidacionCierre)).toHaveLength(0);
        (0, vitest_1.expect)(await db_1.db.select().from(schema.marcacionesEmpleados)).toHaveLength(0);
        (0, vitest_1.expect)(await db_1.db.select().from(schema.rondasOcurrencia)).toHaveLength(0);
        (0, vitest_1.expect)(await db_1.db.select().from(schema.rondasEvento)).toHaveLength(0);
        (0, vitest_1.expect)(await db_1.db.select().from(schema.users)).toHaveLength(1);
        (0, vitest_1.expect)(await db_1.db.select().from(schema.empleados)).toHaveLength(1);
        (0, vitest_1.expect)(await db_1.db.select().from(schema.notificaciones)).toHaveLength(1);
        (0, vitest_1.expect)(await db_1.db.select().from(schema.rondasPlantilla)).toHaveLength(1);
        (0, vitest_1.expect)(await db_1.db.select().from(schema.rondasProgramacion)).toHaveLength(1);
    });
});
