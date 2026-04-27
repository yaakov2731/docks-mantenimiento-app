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
exports.buildLeadsLista = buildLeadsLista;
exports.handleLeadsLista = handleLeadsLista;
exports.handleLeadDetalle = handleLeadDetalle;
exports.handleLeadNota = handleLeadNota;
exports.buildNuevoLeadPaso1 = buildNuevoLeadPaso1;
exports.handleNuevoLeadPaso1 = handleNuevoLeadPaso1;
exports.handleNuevoLeadPaso2 = handleNuevoLeadPaso2;
exports.handleNuevoLeadPaso3 = handleNuevoLeadPaso3;
exports.handleNuevoLeadPaso4 = handleNuevoLeadPaso4;
exports.handleNuevoLeadConfirmar = handleNuevoLeadConfirmar;
exports.buildEstadoLeads = buildEstadoLeads;
exports.getSalesBandejaCount = getSalesBandejaCount;
exports.buildBandeja = buildBandeja;
exports.handleBandeja = handleBandeja;
exports.buildLeadsLibre = buildLeadsLibre;
exports.handleLeadsLibre = handleLeadsLibre;
exports.handleLeadLibreDetalle = handleLeadLibreDetalle;
/**
 * Flujo de Leads para el equipo de ventas.
 * sales_leads → sales_lead_detalle | sales_nuevo_lead_*
 */
const session_1 = require("../../session");
const guards_1 = require("../../shared/guards");
const db_1 = require("../../../db");
const notification_1 = require("../../../_core/notification");
const client_1 = require("@libsql/client");
const libsql_1 = require("drizzle-orm/libsql");
const drizzle_orm_1 = require("drizzle-orm");
const schema = __importStar(require("../../../../drizzle/schema"));
const env_1 = require("../../../_core/env");
const cl = (0, client_1.createClient)({ url: (0, env_1.readEnv)('TURSO_URL'), authToken: (0, env_1.readEnv)('TURSO_TOKEN') });
const db = (0, libsql_1.drizzle)(cl, { schema });
const PAGE_SIZE = 5;
// ─── Helpers ──────────────────────────────────────────────────────────────────
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
async function getMisLeads(userId) {
    const todos = await db.select().from(schema.leads).where((0, drizzle_orm_1.eq)(schema.leads.asignadoId, userId));
    return todos.sort((a, b) => {
        const rank = { nuevo: 4, contactado: 3, visito: 2, cerrado: 1, descartado: 0 };
        return (rank[b.estado] ?? 0) - (rank[a.estado] ?? 0);
    });
}
// ─── Lista de leads ───────────────────────────────────────────────────────────
async function buildLeadsLista(session) {
    const leads = await getMisLeads(session.userId);
    const activos = leads.filter(l => !['cerrado', 'descartado'].includes(l.estado));
    if (leads.length === 0) {
        return [
            `🎯 *Mis leads*`,
            guards_1.SEP,
            `No tenés leads asignados todavía.`,
            guards_1.SEP,
            `0️⃣  Volver`,
        ].join('\n');
    }
    const page = session.contextData.page ?? 1;
    const paged = (0, guards_1.paginate)(leads, page, PAGE_SIZE);
    const lines = [
        `🎯 *Mis leads* (${activos.length} activo${activos.length !== 1 ? 's' : ''})`,
        guards_1.SEP,
    ];
    paged.items.forEach((l, i) => {
        const n = i + 1;
        const contacto = l.telefono ?? l.email ?? l.waId ?? '—';
        lines.push(`${n}️⃣  ${estadoLeadEmoji(l.estado)} *${l.nombre}*`, `   📞 ${contacto} | ${l.rubro ?? 'Sin rubro'} | ${l.estado}`);
    });
    lines.push(guards_1.SEP);
    if (paged.hasPrev)
        lines.push(`8️⃣  ◀️ Anterior`);
    if (paged.hasNext)
        lines.push(`9️⃣  ▶️ Ver más`);
    lines.push(`0️⃣  Volver`);
    return lines.join('\n');
}
async function handleLeadsLista(session, input) {
    const leads = await getMisLeads(session.userId);
    const page = session.contextData.page ?? 1;
    const paged = (0, guards_1.paginate)(leads, page, PAGE_SIZE);
    if (input === '8' && paged.hasPrev) {
        await (0, session_1.navigateTo)(session, 'sales_leads', { page: page - 1 });
        return buildLeadsLista({ ...session, contextData: { page: page - 1 } });
    }
    if (input === '9' && paged.hasNext) {
        await (0, session_1.navigateTo)(session, 'sales_leads', { page: page + 1 });
        return buildLeadsLista({ ...session, contextData: { page: page + 1 } });
    }
    if (input === '0')
        return null;
    const opt = (0, guards_1.parseMenuOption)(input, paged.items.length);
    if (!opt)
        return (0, guards_1.invalidOption)(await buildLeadsLista(session));
    const lead = paged.items[opt - 1];
    await (0, session_1.navigateTo)(session, 'sales_lead_detalle', { leadId: lead.id });
    return buildLeadDetalle(lead);
}
// ─── Detalle de lead ──────────────────────────────────────────────────────────
function buildLeadDetalle(lead) {
    const lines = [
        `🎯 *Lead #${lead.id}*`,
        guards_1.SEP,
        `👤 *${lead.nombre}*`,
        lead.telefono ? `📞 ${lead.telefono}` : '',
        lead.email ? `📧 ${lead.email}` : '',
        lead.rubro ? `🏪 Rubro: ${lead.rubro}` : '',
        lead.tipoLocal ? `🏢 Tipo de local: ${lead.tipoLocal}` : '',
        lead.mensaje ? `💬 Consulta: ${lead.mensaje}` : '',
        guards_1.SEP,
        `Estado: ${estadoLeadEmoji(lead.estado)} *${lead.estado}*`,
        lead.notas ? `📝 Notas: ${lead.notas}` : '',
        guards_1.SEP,
        `1️⃣  📞 Marcar como contactado`,
        `2️⃣  🏢 Marcar que visitó`,
        `3️⃣  ✅ Cerrar (negocio concretado)`,
        `4️⃣  ❌ Descartar lead`,
        `5️⃣  📝 Agregar nota`,
        `0️⃣  Volver`,
    ].filter(Boolean);
    return lines.join('\n');
}
async function handleLeadDetalle(session, input) {
    const { leadId } = session.contextData;
    if (!leadId)
        return (0, guards_1.errorMsg)('No se encontró el lead.');
    const [lead] = await db.select().from(schema.leads).where((0, drizzle_orm_1.eq)(schema.leads.id, leadId));
    if (!lead)
        return (0, guards_1.errorMsg)('Lead no encontrado.');
    const ESTADOS = {
        '1': 'contactado',
        '2': 'visito',
        '3': 'cerrado',
        '4': 'descartado',
    };
    const nuevoEstado = ESTADOS[input];
    if (nuevoEstado) {
        try {
            await db.update(schema.leads).set({
                estado: nuevoEstado,
                updatedAt: new Date(),
            }).where((0, drizzle_orm_1.eq)(schema.leads.id, leadId)).run();
            await (0, session_1.navigateBack)(session);
            return `✅ Lead actualizado a *${nuevoEstado}*.\n\n0️⃣  Volver`;
        }
        catch (err) {
            console.error('[handleLeadDetalle] update error', err);
            return (0, guards_1.errorMsg)('No se pudo actualizar el lead. Intentá de nuevo.');
        }
    }
    if (input === '5') {
        await (0, session_1.navigateTo)(session, 'sales_lead_nota', { leadId, pendingText: true });
        return `📝 Escribí la nota para el lead *${lead.nombre}*:`;
    }
    if (input === '0')
        return null;
    return (0, guards_1.invalidOption)(buildLeadDetalle(lead));
}
async function handleLeadNota(session, texto) {
    const { leadId } = session.contextData;
    if (!leadId)
        return (0, guards_1.errorMsg)('No se encontró el lead.');
    const [lead] = await db.select().from(schema.leads).where((0, drizzle_orm_1.eq)(schema.leads.id, leadId));
    if (!lead)
        return (0, guards_1.errorMsg)('Lead no encontrado.');
    const nuevaNote = lead.notas ? `${lead.notas}\n— ${texto.substring(0, 300)}` : texto.substring(0, 300);
    await db.update(schema.leads).set({
        notas: nuevaNote,
        updatedAt: new Date(),
    }).where((0, drizzle_orm_1.eq)(schema.leads.id, leadId)).run();
    await (0, session_1.navigateBack)(session);
    return `📝 *Nota agregada al lead.*\n\n0️⃣  Volver`;
}
// ─── Nuevo lead (wizard paso a paso) ─────────────────────────────────────────
function buildNuevoLeadPaso1() {
    return [
        `➕ *Nuevo lead — Paso 1/4*`,
        guards_1.SEP,
        `Escribí el *nombre* del interesado:`,
        `(Ej: "María García" o "Pizzería Don Juan")`,
        ``,
        `0️⃣  Cancelar`,
    ].join('\n');
}
async function handleNuevoLeadPaso1(session, texto) {
    if (!texto.trim())
        return `❓ El nombre no puede estar vacío.\n\n${buildNuevoLeadPaso1()}`;
    await (0, session_1.navigateTo)(session, 'sales_nuevo_lead_p2', {
        leadNombre: texto.trim().substring(0, 100),
        pendingText: true,
    });
    return [
        `➕ *Nuevo lead — Paso 2/4*`,
        guards_1.SEP,
        `Escribí el *teléfono* o WhatsApp:`,
        `(Ej: "1155551234" o escribí "sin dato" si no tenés)`,
    ].join('\n');
}
async function handleNuevoLeadPaso2(session, texto) {
    const telefono = texto.trim().toLowerCase() === 'sin dato' ? null : texto.trim();
    await (0, session_1.navigateTo)(session, 'sales_nuevo_lead_p3', {
        ...session.contextData,
        leadTelefono: telefono,
        pendingText: true,
    });
    return [
        `➕ *Nuevo lead — Paso 3/4*`,
        guards_1.SEP,
        `¿Cuál es el *rubro* del negocio?`,
        guards_1.SEP,
        `1️⃣  🍕 Gastronomía`,
        `2️⃣  👗 Indumentaria / Moda`,
        `3️⃣  💄 Belleza / Salud`,
        `4️⃣  🛍️ Retail / Comercio`,
        `5️⃣  🏋️ Deporte / Recreación`,
        `6️⃣  📦 Servicios`,
        `7️⃣  ✏️ Otro (escribir)`,
    ].join('\n');
}
const RUBROS = {
    '1': 'Gastronomía',
    '2': 'Indumentaria / Moda',
    '3': 'Belleza / Salud',
    '4': 'Retail / Comercio',
    '5': 'Deporte / Recreación',
    '6': 'Servicios',
};
async function handleNuevoLeadPaso3(session, input) {
    const rubro = RUBROS[input] ?? (input.length > 1 ? input.substring(0, 50) : null);
    if (!rubro) {
        return (0, guards_1.invalidOption)([
            `➕ *Nuevo lead — Paso 3/4*`,
            guards_1.SEP,
            `1️⃣ Gastronomía  2️⃣ Indumentaria  3️⃣ Belleza`,
            `4️⃣ Retail  5️⃣ Deporte  6️⃣ Servicios  7️⃣ Otro`,
        ].join('\n'));
    }
    await (0, session_1.navigateTo)(session, 'sales_nuevo_lead_p4', {
        ...session.contextData,
        leadRubro: rubro,
        pendingText: true,
    });
    return [
        `➕ *Nuevo lead — Paso 4/4*`,
        guards_1.SEP,
        `Escribí un mensaje o comentario adicional:`,
        `(Ej: "Quiere local en planta baja" o escribí "listo" para terminar)`,
    ].join('\n');
}
async function handleNuevoLeadPaso4(session, texto) {
    const mensaje = texto.trim().toLowerCase() === 'listo' ? null : texto.trim().substring(0, 500);
    const { leadNombre, leadTelefono, leadRubro } = session.contextData;
    // Confirmar antes de guardar
    await (0, session_1.navigateTo)(session, 'sales_nuevo_lead_confirmar', {
        leadNombre, leadTelefono, leadRubro, leadMensaje: mensaje,
    });
    return [
        `➕ *Confirmar nuevo lead*`,
        guards_1.SEP,
        `👤 Nombre: *${leadNombre}*`,
        leadTelefono ? `📞 Teléfono: ${leadTelefono}` : `📞 Sin teléfono`,
        `🏪 Rubro: ${leadRubro}`,
        mensaje ? `💬 Nota: ${mensaje}` : '',
        guards_1.SEP,
        `1️⃣  ✅ Guardar lead`,
        `2️⃣  ❌ Cancelar`,
    ].filter(Boolean).join('\n');
}
async function handleNuevoLeadConfirmar(session, input) {
    if (input === '2') {
        await (0, session_1.navigateTo)(session, 'sales_leads', { page: 1 });
        return `❌ Lead cancelado.\n\n0️⃣  Volver`;
    }
    if (input !== '1')
        return (0, guards_1.invalidOption)(`1️⃣ Guardar  2️⃣ Cancelar`);
    const { leadNombre, leadTelefono, leadRubro, leadMensaje } = session.contextData;
    const id = await (0, db_1.crearLead)({
        nombre: leadNombre,
        telefono: leadTelefono ?? null,
        rubro: leadRubro ?? null,
        mensaje: leadMensaje ?? null,
        asignadoId: session.userId,
        asignadoA: session.userName,
        fuente: 'whatsapp',
    });
    (0, notification_1.notifyOwner)({
        title: `Nuevo lead — ${leadNombre}`,
        content: `Registrado por ${session.userName}. Rubro: ${leadRubro ?? '—'}`,
    }).catch(console.error);
    await (0, session_1.navigateTo)(session, 'sales_leads', { page: 1 });
    return [
        `✅ *Lead #${id} guardado.*`,
        ``,
        `👤 ${leadNombre} registrado exitosamente.`,
        ``,
        `0️⃣  Volver a mis leads`,
    ].join('\n');
}
// ─── Estado de leads ──────────────────────────────────────────────────────────
async function buildEstadoLeads(session) {
    const leads = await getMisLeads(session.userId);
    const byEstado = {};
    for (const l of leads)
        byEstado[l.estado] = (byEstado[l.estado] ?? 0) + 1;
    return [
        `📊 *Estado de mis leads — ${session.userName}*`,
        guards_1.SEP,
        `Total: ${leads.length}`,
        byEstado['nuevo'] ? `🆕 Nuevos: ${byEstado['nuevo']}` : '',
        byEstado['contactado'] ? `📞 Contactados: ${byEstado['contactado']}` : '',
        byEstado['visito'] ? `🏢 Visitaron: ${byEstado['visito']}` : '',
        byEstado['cerrado'] ? `✅ Cerrados: ${byEstado['cerrado']}` : '',
        byEstado['descartado'] ? `❌ Descartados: ${byEstado['descartado']}` : '',
        guards_1.SEP,
        `0️⃣  Volver`,
    ].filter(Boolean).join('\n');
}
async function getBandejaEntries(userId) {
    const [misLeads, libres] = await Promise.all([getMisLeads(userId), (0, db_1.listUnassignedLeads)()]);
    const miosNuevos = misLeads
        .filter(l => l.estado === 'nuevo')
        .map(l => ({ lead: l, source: 'mio' }));
    const libresItems = libres.map(l => ({ lead: l, source: 'libre' }));
    return [...miosNuevos, ...libresItems];
}
async function getSalesBandejaCount(userId) {
    const entries = await getBandejaEntries(userId);
    return {
        misNuevos: entries.filter(e => e.source === 'mio').length,
        libres: entries.filter(e => e.source === 'libre').length,
    };
}
async function buildBandeja(session) {
    const entries = await getBandejaEntries(session.userId);
    if (entries.length === 0) {
        return [
            `📥 *Bandeja de entrada*`,
            guards_1.SEP,
            `✅ No hay nada pendiente por ahora.`,
            guards_1.SEP,
            `0️⃣  Volver`,
        ].join('\n');
    }
    const page = session.contextData.page ?? 1;
    const paged = (0, guards_1.paginate)(entries, page, PAGE_SIZE);
    const miosCount = entries.filter(e => e.source === 'mio').length;
    const libresCount = entries.filter(e => e.source === 'libre').length;
    const summaryParts = [
        miosCount ? `📞 ${miosCount} para llamar` : null,
        libresCount ? `📋 ${libresCount} disponible${libresCount !== 1 ? 's' : ''}` : null,
    ].filter(Boolean).join(' | ');
    const lines = [`📥 *Bandeja de entrada*`, guards_1.SEP, summaryParts, guards_1.SEP];
    let lastSource = null;
    paged.items.forEach((entry, i) => {
        const n = i + 1;
        if (entry.source !== lastSource) {
            lines.push(entry.source === 'mio' ? `📞 *Para llamar:*` : `📋 *Disponibles para tomar:*`);
            lastSource = entry.source;
        }
        const { lead } = entry;
        const icon = entry.source === 'mio' ? '👤' : (lead.fuente === 'whatsapp' ? '📱' : '🌐');
        lines.push(`${n}️⃣  ${icon} *${lead.nombre}* — ${lead.rubro ?? 'Sin rubro'}`);
    });
    lines.push(guards_1.SEP);
    if (paged.hasPrev)
        lines.push(`8️⃣  ◀️ Anterior`);
    if (paged.hasNext)
        lines.push(`9️⃣  ▶️ Ver más`);
    lines.push(`0️⃣  Volver`);
    return lines.join('\n');
}
async function handleBandeja(session, input) {
    const entries = await getBandejaEntries(session.userId);
    const page = session.contextData.page ?? 1;
    const paged = (0, guards_1.paginate)(entries, page, PAGE_SIZE);
    if (input === '8' && paged.hasPrev) {
        await (0, session_1.navigateTo)(session, 'sales_bandeja', { page: page - 1 });
        return buildBandeja({ ...session, contextData: { page: page - 1 } });
    }
    if (input === '9' && paged.hasNext) {
        await (0, session_1.navigateTo)(session, 'sales_bandeja', { page: page + 1 });
        return buildBandeja({ ...session, contextData: { page: page + 1 } });
    }
    if (input === '0')
        return null;
    const opt = (0, guards_1.parseMenuOption)(input, paged.items.length);
    if (!opt)
        return (0, guards_1.invalidOption)(await buildBandeja(session));
    const entry = paged.items[opt - 1];
    if (entry.source === 'mio') {
        await (0, session_1.navigateTo)(session, 'sales_lead_detalle', { leadId: entry.lead.id });
        return buildLeadDetalle(entry.lead);
    }
    await (0, session_1.navigateTo)(session, 'sales_lead_libre_detalle', { leadId: entry.lead.id });
    return buildLeadLibreDetalle(entry.lead);
}
// ─── Leads sin asignar (disponibles para tomar) ───────────────────────────────
async function buildLeadsLibre(session) {
    const leads = await (0, db_1.listUnassignedLeads)();
    if (leads.length === 0) {
        return [
            `📋 *Leads sin asignar*`,
            guards_1.SEP,
            `✅ No hay leads disponibles en este momento.`,
            guards_1.SEP,
            `0️⃣  Volver`,
        ].join('\n');
    }
    const page = session.contextData.page ?? 1;
    const paged = (0, guards_1.paginate)(leads, page, PAGE_SIZE);
    const lines = [
        `📋 *Leads sin asignar* (${leads.length})`,
        guards_1.SEP,
    ];
    paged.items.forEach((l, i) => {
        const n = i + 1;
        const contacto = l.telefono ?? l.waId ?? '—';
        const fuente = l.fuente === 'whatsapp' ? '📱' : '🌐';
        lines.push(`${n}️⃣  ${fuente} *${l.nombre}*`, `   🏪 ${l.rubro ?? 'Sin rubro'} | 📞 ${contacto}`);
    });
    lines.push(guards_1.SEP);
    if (paged.hasPrev)
        lines.push(`8️⃣  ◀️ Anterior`);
    if (paged.hasNext)
        lines.push(`9️⃣  ▶️ Ver más`);
    lines.push(`0️⃣  Volver`);
    return lines.join('\n');
}
async function handleLeadsLibre(session, input) {
    const leads = await (0, db_1.listUnassignedLeads)();
    const page = session.contextData.page ?? 1;
    const paged = (0, guards_1.paginate)(leads, page, PAGE_SIZE);
    if (input === '8' && paged.hasPrev) {
        await (0, session_1.navigateTo)(session, 'sales_leads_libre', { page: page - 1 });
        return buildLeadsLibre({ ...session, contextData: { page: page - 1 } });
    }
    if (input === '9' && paged.hasNext) {
        await (0, session_1.navigateTo)(session, 'sales_leads_libre', { page: page + 1 });
        return buildLeadsLibre({ ...session, contextData: { page: page + 1 } });
    }
    if (input === '0')
        return null;
    const opt = (0, guards_1.parseMenuOption)(input, paged.items.length);
    if (!opt)
        return (0, guards_1.invalidOption)(await buildLeadsLibre(session));
    const lead = paged.items[opt - 1];
    await (0, session_1.navigateTo)(session, 'sales_lead_libre_detalle', { leadId: lead.id });
    return buildLeadLibreDetalle(lead);
}
function buildLeadLibreDetalle(lead) {
    return [
        `📋 *Lead disponible — ${lead.nombre}*`,
        guards_1.SEP,
        lead.telefono ? `📞 ${lead.telefono}` : '',
        lead.rubro ? `🏪 Rubro: ${lead.rubro}` : '',
        lead.mensaje ? `💬 "${lead.mensaje}"` : '',
        lead.fuente === 'whatsapp' ? `📱 Vino por WhatsApp` : `🌐 Vino por web`,
        guards_1.SEP,
        `1️⃣  ✋ Tomar este lead`,
        `0️⃣  Volver`,
    ].filter(Boolean).join('\n');
}
async function handleLeadLibreDetalle(session, input) {
    const leadId = Number(session.contextData.leadId);
    if (!Number.isFinite(leadId))
        return (0, guards_1.errorMsg)('No se encontró el lead.');
    if (input === '0')
        return null;
    const [lead] = await db.select().from(schema.leads).where((0, drizzle_orm_1.eq)(schema.leads.id, leadId));
    if (!lead)
        return (0, guards_1.errorMsg)('Lead no encontrado.');
    if (input === '1') {
        if (lead.asignadoId) {
            await (0, session_1.navigateTo)(session, 'sales_leads_libre', { page: 1 });
            return [
                `⚠️ Este lead ya fue tomado por otro vendedor.`,
                guards_1.SEP,
                `0️⃣  Volver`,
            ].join('\n');
        }
        try {
            await (0, db_1.actualizarLead)(leadId, {
                asignadoId: session.userId,
                asignadoA: session.userName,
            });
        }
        catch (err) {
            console.error('[handleLeadLibreDetalle] actualizarLead error', err);
            return (0, guards_1.errorMsg)('No se pudo tomar el lead. Intentá de nuevo.');
        }
        await (0, session_1.navigateTo)(session, 'sales_leads', { page: 1 });
        return [
            `✅ *Lead tomado exitosamente.*`,
            guards_1.SEP,
            `👤 *${lead.nombre}* ya aparece en tus leads asignados.`,
            guards_1.SEP,
            `0️⃣  Volver a mis leads`,
        ].join('\n');
    }
    return (0, guards_1.invalidOption)(buildLeadLibreDetalle(lead));
}
