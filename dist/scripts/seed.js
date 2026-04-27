"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../server/db");
async function seed() {
    await (0, db_1.initDb)();
    if (await (0, db_1.countUsers)() > 0) {
        console.log('[Seed] Ya existe un usuario admin. No se creó nada.');
        process.exit(0);
    }
    const username = process.env.ADMIN_USERNAME ?? 'admin';
    const password = process.env.ADMIN_PASSWORD ?? 'admin123';
    const hash = await bcryptjs_1.default.hash(password, 10);
    await (0, db_1.createUser)({ username, password: hash, name: 'Administrador', role: 'admin' });
    console.log(`[Seed] Usuario admin creado: ${username} / ${password}`);
    console.log('[Seed] Cambia la contraseña en produccion!');
    process.exit(0);
}
seed().catch(e => { console.error(e); process.exit(1); });
