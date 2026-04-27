"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readEnv = readEnv;
function readEnv(name) {
    const raw = process.env[name];
    if (typeof raw !== 'string')
        return undefined;
    let value = raw.trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1).trim();
    }
    value = value.replace(/\\r\\n|\\n|\\r/g, '').trim();
    return value.length > 0 ? value : undefined;
}
