"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyOwner = notifyOwner;
exports.notifyCompleted = notifyCompleted;
const axios_1 = __importDefault(require("axios"));
const db_1 = require("../db");
const env_1 = require("./env");
async function notifyOwner(params) {
    const contacts = await (0, db_1.getNotificaciones)();
    const active = contacts.filter(c => c.activo);
    for (const contact of active) {
        if (params.urgent && !contact.recibeUrgentes)
            continue;
        if (!params.urgent && !contact.recibeNuevos)
            continue;
        if (contact.tipo === 'telegram') {
            await sendTelegram(contact.destino, `*${params.title}*\n${params.content}`).catch(console.error);
        }
    }
}
async function notifyCompleted(params) {
    const contacts = await (0, db_1.getNotificaciones)();
    const active = contacts.filter(c => c.activo && c.recibeCompletados);
    for (const contact of active) {
        if (contact.tipo === 'telegram') {
            await sendTelegram(contact.destino, `✅ *${params.title}*\n${params.content}`).catch(console.error);
        }
    }
}
async function sendTelegram(chatId, text) {
    const token = (0, env_1.readEnv)('TELEGRAM_BOT_TOKEN');
    if (!token)
        return;
    await axios_1.default.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
    });
}
