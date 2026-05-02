"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = require("express-rate-limit");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_2 = require("@trpc/server/adapters/express");
const routers_1 = require("./routers");
const trpc_1 = require("./_core/trpc");
const db_1 = require("./db");
const bot_api_1 = __importDefault(require("./bot-api"));
const http_1 = __importDefault(require("./rounds/http"));
const http_2 = __importDefault(require("./leads/http"));
const env_1 = require("./_core/env");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
const PORT = process.env.PORT ?? 3001;
const isProd = process.env.NODE_ENV === 'production';
if (isProd)
    app.set('trust proxy', 1);
// Security headers
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Vite assets tienen hashes dinámicos
    crossOriginEmbedderPolicy: false,
}));
// CORS — solo permite el origen configurado; en dev permite localhost
const allowedOrigin = (0, env_1.readEnv)('CLIENT_URL') ?? (isProd ? false : 'http://localhost:5173');
app.use((0, cors_1.default)({ origin: allowedOrigin, credentials: true }));
// Body limit reducido — los mensajes del bot nunca necesitan 10mb
app.use(express_1.default.json({ limit: '256kb' }));
app.use((0, cookie_parser_1.default)());
// Rate limiting — bot API: 120 req/min por IP (el bot hace polling, no explosiones)
const botRateLimit = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' },
});
// Rate limiting — endpoints de login/trpc: 30 req/min por IP
const authRateLimit = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' },
});
app.use('/api/bot', botRateLimit, bot_api_1.default);
app.use('/trpc', authRateLimit, (0, express_2.createExpressMiddleware)({ router: routers_1.appRouter, createContext: trpc_1.createContext }));
app.use('/api', http_1.default);
app.use('/api', http_2.default);
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
// Serve static client (production build)
const clientDist = path_1.default.join(process.cwd(), 'dist/client');
if (fs_1.default.existsSync(path_1.default.join(clientDist, 'index.html'))) {
    app.use(express_1.default.static(clientDist));
    app.get('*', (_req, res) => res.sendFile(path_1.default.join(clientDist, 'index.html')));
}
// Error handler — no exponer detalles en producción
app.use((err, _req, res, _next) => {
    console.error('[Server ERROR]', err);
    const message = isProd ? 'Internal server error' : (err?.message ?? 'Internal server error');
    res.status(500).json({ error: true, message });
});
app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log(`[tRPC]    http://localhost:${PORT}/trpc`);
    console.log(`[Bot API] http://localhost:${PORT}/api/bot`);
});
(async () => {
    await (0, db_1.initDb)();
    if (await (0, db_1.countUsers)() === 0) {
        const username = (0, env_1.readEnv)('ADMIN_USERNAME') ?? 'admin';
        const password = (0, env_1.readEnv)('ADMIN_PASSWORD') ?? 'admin123';
        if (!(0, env_1.readEnv)('ADMIN_USERNAME') || !(0, env_1.readEnv)('ADMIN_PASSWORD')) {
            console.warn('[Server] ⚠️  ADVERTENCIA: Usando credenciales de admin por defecto. Configura ADMIN_USERNAME y ADMIN_PASSWORD en producción.');
        }
        const hash = await bcryptjs_1.default.hash(password, 10);
        await (0, db_1.createUser)({ username, password: hash, name: 'Administrador', role: 'admin' });
        console.log(`[Server] Admin creado: ${username}`);
    }
})();
