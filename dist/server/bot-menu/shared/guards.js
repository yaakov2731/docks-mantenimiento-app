"use strict";
/**
 * Guards y helpers de validación para la navegación por menús.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEP = void 0;
exports.parseMenuOption = parseMenuOption;
exports.invalidOption = invalidOption;
exports.opt = opt;
exports.confirmMsg = confirmMsg;
exports.successMsg = successMsg;
exports.errorMsg = errorMsg;
exports.prioEmoji = prioEmoji;
exports.estadoEmoji = estadoEmoji;
exports.asignacionLabel = asignacionLabel;
exports.fmtDuration = fmtDuration;
exports.paginate = paginate;
/** Valida que el mensaje sea un número dentro del rango permitido. */
function parseMenuOption(message, max) {
    const trimmed = message.trim();
    if (!/^\d+$/.test(trimmed))
        return null;
    const n = parseInt(trimmed, 10);
    if (n < 0 || n > max)
        return null;
    return n;
}
/** Mensaje estándar de opción inválida — repite el menú. */
function invalidOption(menuText) {
    return `❓ Opción no válida. Ingresá el número de la opción:\n\n${menuText}`;
}
/** Separador visual estándar */
exports.SEP = '─────────────────────';
/** Construye una línea de opción numerada */
function opt(n, emoji, label) {
    return `${n}️⃣ ${emoji} ${label}`;
}
/** Mensaje de confirmación genérico */
function confirmMsg(question, yesLabel = 'Sí, confirmar', noLabel = 'Cancelar') {
    return [
        question,
        exports.SEP,
        `1️⃣ ✅ ${yesLabel}`,
        `2️⃣ ❌ ${noLabel}`,
    ].join('\n');
}
/** Mensaje de éxito estándar */
function successMsg(text, backLabel = 'Menú principal') {
    return `✅ ${text}\n\n0️⃣ ${backLabel}`;
}
/** Mensaje de error estándar */
function errorMsg(text) {
    return `⚠️ ${text}\n\n0️⃣ Volver`;
}
/** Prioridad con emoji */
function prioEmoji(prioridad) {
    switch (prioridad) {
        case 'urgente': return '🔴';
        case 'alta': return '🟠';
        case 'media': return '🟡';
        case 'baja': return '🟢';
        default: return '⚪';
    }
}
/** Estado con emoji */
function estadoEmoji(estado) {
    switch (estado) {
        case 'en_progreso': return '▶️';
        case 'pausado': return '⏸️';
        case 'pendiente': return '⏳';
        case 'completado': return '✅';
        case 'cancelado': return '❌';
        default: return '❓';
    }
}
/** Asignacion estado con texto corto */
function asignacionLabel(estado) {
    switch (estado) {
        case 'pendiente_confirmacion': return 'Pendiente confirm.';
        case 'aceptada': return 'Aceptada';
        case 'rechazada': return 'Rechazada';
        case 'sin_asignar': return 'Sin asignar';
        default: return estado;
    }
}
/** Formatear tiempo trabajado */
function fmtDuration(seconds) {
    const safe = Math.max(0, Math.floor(seconds));
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    if (h > 0)
        return `${h}h ${m}m`;
    if (m > 0)
        return `${m}m`;
    return `${safe}s`;
}
/** Paginación: slice de un array con info de página */
function paginate(items, page, pageSize = 5) {
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.max(1, Math.min(page, totalPages));
    const start = (safePage - 1) * pageSize;
    return {
        items: items.slice(start, start + pageSize),
        page: safePage,
        totalPages,
        hasNext: safePage < totalPages,
        hasPrev: safePage > 1,
    };
}
