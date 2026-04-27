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
exports.resetTestDb = resetTestDb;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../db");
const schema = __importStar(require("../../drizzle/schema"));
async function resetTestDb() {
    await (0, db_1.initDb)();
    for (const table of [
        schema.actualizaciones,
        schema.reportes,
        schema.leads,
        schema.botQueue,
        schema.notificaciones,
        schema.tareasOperativasEvento,
        schema.tareasOperativas,
        schema.rondasEvento,
        schema.rondasOcurrencia,
        schema.rondasProgramacion,
        schema.rondasPlantilla,
        schema.empleadoAsistenciaAuditoria,
        schema.empleadoAsistencia,
        schema.empleadoLiquidacionCierre,
        schema.marcacionesEmpleados,
        schema.empleados,
        schema.users,
    ]) {
        await db_1.db.delete(table).run();
    }
    try {
        await db_1.db.run((0, drizzle_orm_1.sql) `DELETE FROM sqlite_sequence`);
    }
    catch {
        // sqlite_sequence is only present after AUTOINCREMENT tables have been used.
    }
}
