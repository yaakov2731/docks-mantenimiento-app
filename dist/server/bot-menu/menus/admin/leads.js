"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAdminLeadsSinAsignar = buildAdminLeadsSinAsignar;
exports.handleAdminLeadsSinAsignar = handleAdminLeadsSinAsignar;
exports.buildAdminLeadDetalleDisplay = buildAdminLeadDetalleDisplay;
exports.handleAdminLeadDetalle = handleAdminLeadDetalle;
exports.handleAdminLeadElegirVendedor = handleAdminLeadElegirVendedor;
exports.handleAdminLeadConfirmar = handleAdminLeadConfirmar;
exports.buildAdminBotAutorespuesta = buildAdminBotAutorespuesta;
exports.handleAdminBotAutorespuesta = handleAdminBotAutorespuesta;
/**
 * Flujo de Leads para administradores/gerentes.
 * admin_leads_sin_asignar → admin_lead_detalle → admin_lead_elegir_vendedor → admin_lead_confirmar
 */
const session_1 = require("../../session");
const guards_1 = require("../../shared/guards");
const db_1 = require("../../../db");
const PAGE_SIZE = 5;
function estadoLeadEmoji(estado) {
    switch (estado) {
        case 'nuevo': return '🆕';
        case 'contactado': return '📞';
        case 'visito': return '🏢';
        case 'cerrado': return '✅';
        case 'descartado': return '❌';
        default: return '⚪';
    }
}
function formatLeadDateTime(value) {
    if (!value)
        return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime()))
        return '—';
    return date.toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}
function formatLeadElapsed(fromValue, toValue = new Date()) {
    if (!fromValue)
        return '—';
    const from = fromValue instanceof Date ? fromValue : new Date(fromValue);
    const to = toValue instanceof Date ? toValue : new Date(toValue);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()))
        return '—';
    const minutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
    if (minutes < 60)
        return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours < 24)
        return rest ? `${hours}h ${rest}m` : `${hours}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`;
}
// ─── admin_leads_sin_asignar ──────────────────────────────────────────────────
async function buildAdminLeadsSinAsignar(session) {
    const leads = await (0, db_1.listUnassignedLeads)();
    if (leads.length === 0) {
        return [
            `🎯 *Leads sin asignar*`,
            guards_1.SEP,
            `✅ No hay leads pendientes de asignación.`,
            guards_1.SEP,
            `0️⃣  Volver`,
        ].join('\n');
    }
    const page = session.contextData.page ?? 1;
    const paged = (0, guards_1.paginate)(leads, page, PAGE_SIZE);
    const lines = [
        `🎯 *Leads sin asignar* (${leads.length})`,
        guards_1.SEP,
    ];
    paged.items.forEach((lead, index) => {
        const num = (page - 1) * PAGE_SIZE + index + 1;
        lines.push(`${num}️⃣  *${lead.nombre ?? 'Sin nombre'}* — ${lead.rubro ?? '—'}`, `   ${estadoLeadEmoji(lead.estado)} ${lead.estado} | ${lead.telefono ?? '—'}`, `   🕒 Recibido: ${formatLeadDateTime(lead.createdAt)} | sin respuesta ${formatLeadElapsed(lead.createdAt)}`);
    });
    const activo = (await (0, db_1.getAppConfig)('bot_autoresponder_activo')) !== '0';
    lines.push(guards_1.SEP);
    lines.push(`🤖  *7*  →  Bot autorespuesta: ${activo ? '🟢 Activo' : '⏸️ Inactivo'}`);
    if (paged.hasPrev)
        lines.push(`8️⃣  ◀️ Anterior`);
    if (paged.hasNext)
        lines.push(`9️⃣  ▶️ Ver más`);
    lines.push(`0️⃣  Volver`);
    return lines.join('\n');
}
async function handleAdminLeadsSinAsignar(session, input) {
    const leads = await (0, db_1.listUnassignedLeads)();
    const page = session.contextData.page ?? 1;
    const paged = (0, guards_1.paginate)(leads, page, PAGE_SIZE);
    if (input === '8' && paged.hasPrev) {
        await (0, session_1.navigateTo)(session, 'admin_leads_sin_asignar', { page: page - 1 });
        return buildAdminLeadsSinAsignar({ ...session, contextData: { page: page - 1 } });
    }
    if (input === '9' && paged.hasNext) {
        await (0, session_1.navigateTo)(session, 'admin_leads_sin_asignar', { page: page + 1 });
        return buildAdminLeadsSinAsignar({ ...session, contextData: { page: page + 1 } });
    }
    if (input === '7') {
        await (0, session_1.navigateTo)(session, 'admin_bot_autorespuesta', {});
        return buildAdminBotAutorespuesta();
    }
    if (input === '0')
        return null;
    const opt = (0, guards_1.parseMenuOption)(input, paged.items.length);
    if (!opt)
        return (0, guards_1.invalidOption)(await buildAdminLeadsSinAsignar(session));
    const lead = paged.items[opt - 1];
    await (0, session_1.navigateTo)(session, 'admin_lead_detalle', { leadId: lead.id });
    return buildAdminLeadDetalle(lead);
}
// ─── admin_lead_detalle ───────────────────────────────────────────────────────
function buildAdminLeadDetalleDisplay(lead) {
    return buildAdminLeadDetalle(lead);
}
function buildAdminLeadDetalle(lead) {
    return [
        `🎯 *Lead: ${lead.nombre ?? 'Sin nombre'}*`,
        `📞 Teléfono: ${lead.telefono ?? '—'}`,
        `🏪 Rubro: ${lead.rubro ?? '—'}`,
        `🏢 Tipo local: ${lead.tipoLocal ?? '—'}`,
        lead.mensaje ? `💬 Mensaje: "${lead.mensaje}"` : null,
        `📌 Estado: ${estadoLeadEmoji(lead.estado)} ${lead.estado}`,
        `🕒 Recibido: ${formatLeadDateTime(lead.createdAt)}`,
        lead.firstContactedAt
            ? `✅ Primer contacto: ${formatLeadDateTime(lead.firstContactedAt)} (${formatLeadElapsed(lead.createdAt, lead.firstContactedAt)})`
            : `⏳ Sin respuesta hace ${formatLeadElapsed(lead.createdAt)}`,
        guards_1.SEP,
        `1️⃣  👤 Asignar a vendedor`,
        `0️⃣  Volver`,
    ].filter(Boolean).join('\n');
}
async function handleAdminLeadDetalle(session, input) {
    const leadId = Number(session.contextData.leadId);
    if (!Number.isFinite(leadId))
        return (0, guards_1.errorMsg)('No se encontró el lead.');
    if (input === '1') {
        const vendedores = await (0, db_1.getSalesUsers)();
        const soloVentas = vendedores.filter((u) => u.role === 'sales');
        await (0, session_1.navigateTo)(session, 'admin_lead_elegir_vendedor', { leadId, vendedoresIds: soloVentas.map((v) => v.id) });
        return buildAdminLeadElegirVendedor(soloVentas);
    }
    if (input === '0')
        return null;
    const lead = await (0, db_1.getLeadById)(leadId);
    if (!lead)
        return (0, guards_1.errorMsg)('Lead no encontrado.');
    return (0, guards_1.invalidOption)(buildAdminLeadDetalle(lead));
}
// ─── admin_lead_elegir_vendedor ───────────────────────────────────────────────
function buildAdminLeadElegirVendedor(vendedores) {
    if (vendedores.length === 0) {
        return [
            `👤 *Elegí un vendedor*`,
            guards_1.SEP,
            `⚠️ No hay vendedores disponibles.`,
            guards_1.SEP,
            `0️⃣  Volver`,
        ].join('\n');
    }
    const lines = [`👤 *Elegí un vendedor*`, guards_1.SEP];
    vendedores.forEach((v, i) => {
        lines.push(`${i + 1}️⃣  ${v.name ?? v.username}`);
    });
    lines.push(guards_1.SEP, `0️⃣  Volver`);
    return lines.join('\n');
}
async function handleAdminLeadElegirVendedor(session, input) {
    if (input === '0')
        return null;
    const vendedores = await (0, db_1.getSalesUsers)().then((us) => us.filter((u) => u.role === 'sales'));
    const opt = (0, guards_1.parseMenuOption)(input, vendedores.length);
    if (!opt)
        return (0, guards_1.invalidOption)(buildAdminLeadElegirVendedor(vendedores));
    const vendedor = vendedores[opt - 1];
    const leadId = Number(session.contextData.leadId);
    const lead = await (0, db_1.getLeadById)(leadId);
    if (!lead)
        return (0, guards_1.errorMsg)('Lead no encontrado.');
    await (0, session_1.navigateTo)(session, 'admin_lead_confirmar', { leadId, vendedorId: vendedor.id, vendedorNombre: vendedor.name ?? vendedor.username });
    return buildAdminLeadConfirmar(lead, vendedor);
}
// ─── admin_lead_confirmar ─────────────────────────────────────────────────────
function buildAdminLeadConfirmar(lead, vendedor) {
    return [
        `✅ *Confirmar asignación*`,
        guards_1.SEP,
        `Lead: *${lead.nombre ?? 'Sin nombre'}* (${lead.rubro ?? '—'})`,
        `Vendedor: *${vendedor.name ?? vendedor.username}*`,
        guards_1.SEP,
        `1️⃣  Confirmar`,
        `2️⃣  Cancelar`,
    ].join('\n');
}
async function handleAdminLeadConfirmar(session, input) {
    if (input === '2' || input === '0') {
        await (0, session_1.navigateTo)(session, 'admin_leads_sin_asignar', { page: 1 });
        return buildAdminLeadsSinAsignar({ ...session, contextData: { page: 1 } });
    }
    if (input !== '1') {
        const leadId = Number(session.contextData.leadId);
        const vendedorId = Number(session.contextData.vendedorId);
        const vendedorNombre = String(session.contextData.vendedorNombre ?? '');
        const lead = await (0, db_1.getLeadById)(leadId);
        const vendedores = await (0, db_1.getSalesUsers)().then((us) => us.filter((u) => u.role === 'sales'));
        const vendedor = vendedores.find((v) => v.id === vendedorId) ?? { name: vendedorNombre };
        if (!lead)
            return (0, guards_1.errorMsg)('Lead no encontrado.');
        return (0, guards_1.invalidOption)(buildAdminLeadConfirmar(lead, vendedor));
    }
    const leadId = Number(session.contextData.leadId);
    const vendedorId = Number(session.contextData.vendedorId);
    const vendedorNombre = String(session.contextData.vendedorNombre ?? '');
    const lead = await (0, db_1.getLeadById)(leadId);
    if (!lead)
        return (0, guards_1.errorMsg)('Lead no encontrado.');
    const vendedores = await (0, db_1.getSalesUsers)();
    const vendedor = vendedores.find((u) => u.id === vendedorId);
    await (0, db_1.actualizarLead)(leadId, {
        asignadoId: vendedorId,
        asignadoA: vendedorNombre,
    });
    if (vendedor?.waId) {
        const tempEmoji = { hot: '🔥', warm: '🌡️', cold: '❄️', not_fit: '⚫' };
        const tempLabel = { hot: 'Caliente', warm: 'Tibio', cold: 'Frío', not_fit: 'No aplica' };
        const temp = lead.temperature ?? 'warm';
        const mensaje = [
            `🎯 *Te asignaron un lead — Docks del Puerto*`,
            ``,
            `👤 *${lead.nombre ?? 'Sin nombre'}*`,
            lead.telefono ? `📞 ${lead.telefono}` : null,
            lead.rubro ? `🏪 Rubro: ${lead.rubro}` : null,
            lead.tipoLocal ? `🏬 Tipo de espacio: ${lead.tipoLocal}` : null,
            `${tempEmoji[temp] ?? '🌡️'} Temperatura: ${tempLabel[temp] ?? temp}`,
            lead.mensaje ? `💬 "${lead.mensaje}"` : null,
            ``,
            `Respondé *"mis leads"* para ver el detalle y agregar notas.`,
            ``,
            `🔑 Lead #${leadId}`,
        ].filter(Boolean).join('\n');
        await (0, db_1.enqueueBotMessage)(vendedor.waId, mensaje);
    }
    await (0, session_1.navigateTo)(session, 'admin_leads_sin_asignar', { page: 1 });
    return [
        `✅ *Lead #${leadId} asignado a ${vendedorNombre}.*`,
        vendedor?.waId ? `📱 Se notificó al vendedor por WhatsApp.` : `⚠️ El vendedor no tiene WhatsApp registrado.`,
        guards_1.SEP,
        `0️⃣  Volver`,
    ].join('\n');
}
// ─── admin_bot_autorespuesta ──────────────────────────────────────────────────
async function buildAdminBotAutorespuesta() {
    const activo = (await (0, db_1.getAppConfig)('bot_autoresponder_activo')) !== '0';
    const delay1 = await (0, db_1.getAppConfig)('followup1_delay_min') ?? '30';
    const delay2 = await (0, db_1.getAppConfig)('followup2_delay_horas') ?? '4';
    return [
        `🤖 *Bot Autorespuesta — Docks del Puerto*`,
        guards_1.SEP,
        `Estado actual: ${activo ? '🟢 *ACTIVO*' : '⏸️ *INACTIVO*'}`,
        ``,
        `📨 Mensaje 1 → a los *${delay1} min*`,
        `📨 Mensaje 2 → a las *${delay2} h*`,
        guards_1.SEP,
        activo ? `1️⃣  ⏸️ Desactivar` : `1️⃣  ▶️ Activar`,
        `0️⃣  Volver`,
    ].join('\n');
}
async function handleAdminBotAutorespuesta(session, input) {
    if (input === '0')
        return null;
    if (input === '1') {
        const activo = (await (0, db_1.getAppConfig)('bot_autoresponder_activo')) !== '0';
        await (0, db_1.setAppConfig)('bot_autoresponder_activo', activo ? '0' : '1');
        const nuevoEstado = !activo;
        await (0, session_1.navigateTo)(session, 'admin_leads_sin_asignar', { page: 1 });
        return [
            nuevoEstado ? `✅ *Bot autorespuesta activado.*` : `⏸️ *Bot autorespuesta desactivado.*`,
            ``,
            `Los seguimientos automáticos quedaron ${nuevoEstado ? 'habilitados' : 'suspendidos'}.`,
            guards_1.SEP,
            `0️⃣  Volver`,
        ].join('\n');
    }
    return (0, guards_1.invalidOption)(await buildAdminBotAutorespuesta());
}
