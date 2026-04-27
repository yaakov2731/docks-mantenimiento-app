"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_2 = require("@trpc/server/adapters/express");
const routers_1 = require("../server/routers");
const trpc_1 = require("../server/_core/trpc");
const bot_api_1 = __importDefault(require("../server/bot-api"));
const http_1 = __importDefault(require("../server/rounds/http"));
const db_1 = require("../server/db");
const env_1 = require("../server/_core/env");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const allowedOrigin = (0, env_1.readEnv)('CLIENT_URL') ?? '*';
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: allowedOrigin, credentials: true }));
app.use(express_1.default.json({ limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
// Initialize DB before handling any request
let initPromise = null;
function getInitPromise() {
    if (!initPromise) {
        initPromise = (async () => {
            await (0, db_1.initDb)();
            if (await (0, db_1.countUsers)() === 0) {
                const username = (0, env_1.readEnv)('ADMIN_USERNAME') ?? 'admin';
                const password = (0, env_1.readEnv)('ADMIN_PASSWORD') ?? 'admin123';
                if (!(0, env_1.readEnv)('ADMIN_USERNAME') || !(0, env_1.readEnv)('ADMIN_PASSWORD')) {
                    console.warn('[API] ⚠️  ADVERTENCIA: Usando credenciales de admin por defecto. Configura ADMIN_USERNAME y ADMIN_PASSWORD en producción.');
                }
                const hash = await bcryptjs_1.default.hash(password, 10);
                await (0, db_1.createUser)({ username, password: hash, name: 'Administrador', role: 'admin' });
            }
        })().catch(err => {
            // Reset so next request retries
            initPromise = null;
            throw err;
        });
    }
    return initPromise;
}
app.use(async (_req, _res, next) => {
    try {
        await getInitPromise();
        next();
    }
    catch (err) {
        next(err);
    }
});
app.use('/trpc', (0, express_2.createExpressMiddleware)({ router: routers_1.appRouter, createContext: trpc_1.createContext }));
app.use('/api/bot', bot_api_1.default);
app.use('/api', http_1.default);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
// Global error handler — returns JSON so client can parse it
app.use((err, _req, res, _next) => {
    console.error('[API ERROR]', err);
    res.status(500).json({
        error: true,
        message: err?.message ?? 'Internal server error',
    });
});
exports.default = app;
