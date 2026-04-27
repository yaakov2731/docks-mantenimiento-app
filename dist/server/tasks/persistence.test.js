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
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const vitest_1 = require("vitest");
const schema = __importStar(require("../../drizzle/schema"));
(0, vitest_1.describe)('operational tasks persistence', () => {
    (0, vitest_1.it)('exports the task tables and bootstraps their base schema', () => {
        (0, vitest_1.expect)(schema.tareasOperativas).toBeTruthy();
        (0, vitest_1.expect)(schema.tareasOperativasEvento).toBeTruthy();
        const dbBootstrap = (0, node_fs_1.readFileSync)((0, node_path_1.join)(__dirname, '..', 'db.ts'), 'utf8');
        (0, vitest_1.expect)(dbBootstrap).toContain('CREATE TABLE IF NOT EXISTS tareas_operativas');
        (0, vitest_1.expect)(dbBootstrap).toContain('CREATE TABLE IF NOT EXISTS tareas_operativas_evento');
        (0, vitest_1.expect)(dbBootstrap).toContain('origen TEXT NOT NULL');
        (0, vitest_1.expect)(dbBootstrap).toContain('tipo_trabajo TEXT NOT NULL');
        (0, vitest_1.expect)(dbBootstrap).toContain('trabajo_acumulado_segundos INTEGER NOT NULL DEFAULT 0');
        (0, vitest_1.expect)(dbBootstrap).toContain('tarea_id INTEGER NOT NULL');
        (0, vitest_1.expect)(dbBootstrap).toContain("estado TEXT NOT NULL DEFAULT 'pendiente_asignacion'");
    });
});
