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
exports.getSession = getSession;
exports.createSession = createSession;
exports.updateSession = updateSession;
exports.navigateTo = navigateTo;
exports.navigateBack = navigateBack;
exports.resetToMain = resetToMain;
exports.isSessionExpired = isSessionExpired;
exports.deleteSession = deleteSession;
/**
 * CRUD de sesiones de conversación — bot_session
 * Cada número de WhatsApp tiene una sesión activa con su menú actual y contexto.
 */
const client_1 = require("@libsql/client");
const libsql_1 = require("drizzle-orm/libsql");
const drizzle_orm_1 = require("drizzle-orm");
const schema = __importStar(require("../../drizzle/schema"));
const env_1 = require("../_core/env");
const client = (0, client_1.createClient)({ url: (0, env_1.readEnv)('TURSO_URL'), authToken: (0, env_1.readEnv)('TURSO_TOKEN') });
const db = (0, libsql_1.drizzle)(client, { schema });
/** Timeout de sesión: 10 minutos */
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
function parseJson(value, fallback) {
    if (!value)
        return fallback;
    try {
        return JSON.parse(value);
    }
    catch {
        return fallback;
    }
}
function toSession(row) {
    return {
        id: row.id,
        waNumber: row.waNumber,
        userType: row.userType,
        userId: row.userId,
        userName: row.userName,
        currentMenu: row.currentMenu,
        contextData: parseJson(row.contextData ?? null, {}),
        menuHistory: parseJson(row.menuHistory ?? null, []),
        lastActivityAt: row.lastActivityAt,
        createdAt: row.createdAt,
    };
}
/** Obtiene la sesión activa. Devuelve null si no existe. */
async function getSession(waNumber) {
    const [row] = await db.select().from(schema.botSession)
        .where((0, drizzle_orm_1.eq)(schema.botSession.waNumber, waNumber));
    return row ? toSession(row) : null;
}
/** Crea una sesión nueva para el usuario. */
async function createSession(params) {
    await db.insert(schema.botSession).values({
        waNumber: params.waNumber,
        userType: params.userType,
        userId: params.userId,
        userName: params.userName,
        currentMenu: 'main',
        contextData: '{}',
        menuHistory: '[]',
        lastActivityAt: new Date(),
        createdAt: new Date(),
    }).run();
    const session = await getSession(params.waNumber);
    return session;
}
/** Actualiza el menú actual y el contexto. */
async function updateSession(waNumber, updates) {
    const toSet = { lastActivityAt: new Date() };
    if (updates.currentMenu !== undefined)
        toSet.currentMenu = updates.currentMenu;
    if (updates.contextData !== undefined)
        toSet.contextData = JSON.stringify(updates.contextData);
    if (updates.menuHistory !== undefined)
        toSet.menuHistory = JSON.stringify(updates.menuHistory);
    if (updates.lastActivityAt !== undefined)
        toSet.lastActivityAt = updates.lastActivityAt;
    await db.update(schema.botSession).set(toSet)
        .where((0, drizzle_orm_1.eq)(schema.botSession.waNumber, waNumber)).run();
}
/** Navega a un nuevo menú, guardando el actual en el historial. */
async function navigateTo(session, menu, context) {
    const newHistory = [...session.menuHistory, session.currentMenu].slice(-10); // máx 10 niveles
    const newContext = context !== undefined
        ? { ...session.contextData, ...context }
        : session.contextData;
    await updateSession(session.waNumber, {
        currentMenu: menu,
        contextData: newContext,
        menuHistory: newHistory,
    });
    return { ...session, currentMenu: menu, contextData: newContext, menuHistory: newHistory };
}
/** Vuelve al menú anterior (pop del historial). */
async function navigateBack(session) {
    const history = [...session.menuHistory];
    const previousMenu = history.pop() ?? 'main';
    await updateSession(session.waNumber, {
        currentMenu: previousMenu,
        menuHistory: history,
        contextData: {},
    });
    return {
        session: { ...session, currentMenu: previousMenu, menuHistory: history, contextData: {} },
        previousMenu,
    };
}
/** Resetea la sesión al menú principal. */
async function resetToMain(session) {
    await updateSession(session.waNumber, {
        currentMenu: 'main',
        contextData: {},
        menuHistory: [],
    });
    return { ...session, currentMenu: 'main', contextData: {}, menuHistory: [] };
}
/** Verifica si la sesión expiró por inactividad. */
function isSessionExpired(session) {
    return Date.now() - session.lastActivityAt.getTime() > SESSION_TIMEOUT_MS;
}
/** Elimina la sesión (para forzar re-identificación). */
async function deleteSession(waNumber) {
    await db.delete(schema.botSession).where((0, drizzle_orm_1.eq)(schema.botSession.waNumber, waNumber)).run();
}
