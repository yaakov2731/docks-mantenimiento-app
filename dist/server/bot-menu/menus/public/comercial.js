"use strict";
/**
 * Menu comercial publico - Docks del Puerto
 *
 * Para personas no registradas como empleados. El foco es convertir
 * interesados en leads accionables: visita, llamada o seguimiento por WhatsApp.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPublicMainMenu = buildPublicMainMenu;
exports.handlePublicMain = handlePublicMain;
exports.buildPublicAlquilerP1 = buildPublicAlquilerP1;
exports.handlePublicAlquilerP1 = handlePublicAlquilerP1;
exports.buildPublicAlquilerP2 = buildPublicAlquilerP2;
exports.handlePublicAlquilerP2 = handlePublicAlquilerP2;
exports.buildPublicAlquilerP3 = buildPublicAlquilerP3;
exports.handlePublicAlquilerP3 = handlePublicAlquilerP3;
exports.handlePublicAlquilerP3Otro = handlePublicAlquilerP3Otro;
exports.buildPublicAlquilerP4 = buildPublicAlquilerP4;
exports.handlePublicAlquilerP4 = handlePublicAlquilerP4;
exports.buildPublicAlquilerP5 = buildPublicAlquilerP5;
exports.handlePublicAlquilerP5 = handlePublicAlquilerP5;
exports.buildPublicAlquilerP6 = buildPublicAlquilerP6;
exports.handlePublicAlquilerP6 = handlePublicAlquilerP6;
exports.buildPublicAlquilerP7 = buildPublicAlquilerP7;
exports.handlePublicAlquilerP7 = handlePublicAlquilerP7;
exports.buildPublicAlquilerConfirmar = buildPublicAlquilerConfirmar;
exports.handlePublicAlquilerConfirmar = handlePublicAlquilerConfirmar;
exports.buildPublicVisitaP1 = buildPublicVisitaP1;
exports.handlePublicVisitaP1 = handlePublicVisitaP1;
exports.buildPublicVisitaP2 = buildPublicVisitaP2;
exports.handlePublicVisitaP2 = handlePublicVisitaP2;
exports.buildPublicVisitaP3 = buildPublicVisitaP3;
exports.handlePublicVisitaP3 = handlePublicVisitaP3;
exports.buildPublicUbicacion = buildPublicUbicacion;
exports.handlePublicUbicacion = handlePublicUbicacion;
exports.buildPublicAsesorP1 = buildPublicAsesorP1;
exports.handlePublicAsesorP1 = handlePublicAsesorP1;
exports.buildPublicAsesorP2 = buildPublicAsesorP2;
exports.handlePublicAsesorP2 = handlePublicAsesorP2;
exports.buildPublicReclamoP1 = buildPublicReclamoP1;
exports.handlePublicReclamoP1 = handlePublicReclamoP1;
exports.buildPublicReclamoP2 = buildPublicReclamoP2;
exports.handlePublicReclamoP2 = handlePublicReclamoP2;
exports.buildPublicMensajeP1 = buildPublicMensajeP1;
exports.handlePublicMensajeP1 = handlePublicMensajeP1;
exports.buildPublicMensajeP2 = buildPublicMensajeP2;
exports.handlePublicMensajeP2 = handlePublicMensajeP2;
const session_1 = require("../../session");
const guards_1 = require("../../shared/guards");
const db_1 = require("../../../db");
const scoring_1 = require("../../../leads/scoring");
const MAX_INPUT = 300;
const DSEP = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
function trimSafe(v) {
    return v.trim().slice(0, MAX_INPUT);
}
const NO_VARIANTS = ['no', 'nope', 'ninguno', 'no tengo', 'sin dato', 'no tiene', 'sin instagram', 'sin web', 'no hay', '0'];
function normalizeWebOrIG(raw) {
    const v = raw.trim();
    if (!v)
        return '';
    if (NO_VARIANTS.includes(v.toLowerCase()))
        return 'No tiene';
    const igMatch = v.match(/(?:instagram\.com|instagr\.am)\/([A-Za-z0-9_.]+)/i);
    if (igMatch)
        return `@${igMatch[1].replace(/\/$/, '')}`;
    if (v.startsWith('@'))
        return v;
    if (/^https?:\/\//i.test(v) || /^www\./i.test(v)) {
        return v.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    }
    return v;
}
function fmtPhone(waId) {
    const d = waId.replace(/\D/g, '');
    if (d.startsWith('549') && d.length === 13) {
        const area = d.slice(3, 5);
        const num = d.slice(5);
        return `+54 9 ${area} ${num.slice(0, 4)}-${num.slice(4)}`;
    }
    if (d.startsWith('54') && d.length === 12) {
        return `+54 ${d.slice(2, 4)} ${d.slice(4, 8)}-${d.slice(8)}`;
    }
    return `+${d}`;
}
function nowAr() {
    return new Date().toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires',
    });
}
// --- Closing messages por temperatura -------------------------------------------
function buildClosingByTemperature(temperature, nombre) {
    const n = nombre && nombre !== 'Sin nombre' ? ` *${nombre}*` : '';
    switch (temperature) {
        case 'hot':
            return [
                `🔥 *¡Tu consulta fue registrada!*`,
                DSEP,
                `Gracias${n}. Con lo que nos contás, Docks del Puerto`,
                `puede ser exactamente lo que buscás.`,
                ``,
                `Un asesor comercial te va a contactar *hoy* para`,
                `coordinar una visita personalizada al predio.`,
                DSEP,
                `_Docks del Puerto · Shopping & Lifestyle · Tigre_ 🏢✨`,
            ].join('\n');
        case 'warm':
            return [
                `✅ *¡Consulta registrada!*`,
                DSEP,
                `Gracias${n}. Tiene sentido que conozcas el predio.`,
                `Un asesor va a contactarte para ver juntos qué`,
                `espacios tienen más sentido para tu propuesta.`,
                DSEP,
                `_Docks del Puerto · Puerto de Frutos, Tigre_ 🏢`,
            ].join('\n');
        case 'cold':
            return [
                `✅ *Consulta registrada*`,
                DSEP,
                `Gracias${n}. Registramos tu consulta.`,
                `Cuando estés más cerca de avanzar,`,
                `nuestro equipo te va a estar esperando.`,
                DSEP,
                `_Docks del Puerto · Puerto de Frutos, Tigre_ 🏢`,
            ].join('\n');
        default:
            return [
                `✅ *Consulta registrada*`,
                DSEP,
                `Gracias${n}. Tomamos nota de tu consulta.`,
                `Por ahora no tenemos espacios que encajen con tu perfil,`,
                `pero si la situación cambia no dudes en escribirnos.`,
                DSEP,
                `_Docks del Puerto 🏢_`,
            ].join('\n');
    }
}
// --- Menu principal publico --------------------------------------------------
function buildPublicMainMenu() {
    return [
        `🏢 *DOCKS DEL PUERTO*`,
        `✨ _Shopping & Lifestyle · Puerto de Frutos, Tigre_`,
        DSEP,
        `Más de *200 locales comerciales* frente al río.`,
        `Un predio único en la Zona Norte de Buenos Aires.`,
        DSEP,
        `🏪  *1*  →  Quiero alquilar un local`,
        `📅  *2*  →  Coordinar una visita al predio`,
        `📍  *3*  →  Cómo llegar · Horarios`,
        `💬  *4*  →  Hablar con un asesor comercial`,
        `🔧  *5*  →  Soy locatario · Necesito ayuda`,
        DSEP,
        `_Respondé con el número de tu opción_ 👇`,
        `0️⃣   Salir`,
    ].join('\n');
}
async function handlePublicMain(session, input) {
    if (input === '1') {
        await (0, session_1.navigateTo)(session, 'public_alquiler_p1', { pendingText: true });
        return buildPublicAlquilerP1();
    }
    if (input === '2') {
        await (0, session_1.navigateTo)(session, 'public_visita_p1', { pendingText: true });
        return buildPublicVisitaP1();
    }
    if (input === '3') {
        await (0, session_1.navigateTo)(session, 'public_ubicacion', {});
        return buildPublicUbicacion();
    }
    if (input === '4') {
        await (0, session_1.navigateTo)(session, 'public_asesor_p1', { pendingText: true });
        return buildPublicAsesorP1();
    }
    if (input === '5') {
        await (0, session_1.navigateTo)(session, 'public_reclamo_p1', { pendingText: true });
        return buildPublicReclamoP1();
    }
    if (input === '0') {
        return [
            `👋 *Hasta luego.*`,
            ``,
            `Si necesitás ayuda en otro momento, escribinos a este número.`,
            `_Docks del Puerto 🏢_`,
        ].join('\n');
    }
    return `❓ *Opción no válida.* Ingresá el número de la opción:\n\n${buildPublicMainMenu()}`;
}
// --- Flujo: alquiler comercial ----------------------------------------------
function buildPublicAlquilerP1() {
    return [
        `🏪 *Consulta comercial — Docks del Puerto*`,
        DSEP,
        `📍 *Paso 1 de 7*`,
        ``,
        `¡Buena elección! Te vamos a hacer *7 preguntas rápidas*`,
        `para entender tu proyecto y ver si Docks es la opción ideal.`,
        ``,
        `¿Cuál es tu *nombre y apellido*?`,
        DSEP,
        `0️⃣  Volver`,
    ].join('\n');
}
async function handlePublicAlquilerP1(session, input) {
    if (input === '0')
        return null;
    if (input.trim().length < 2)
        return `⚠️ Por favor ingresá tu nombre.\n\n${buildPublicAlquilerP1()}`;
    await (0, session_1.navigateTo)(session, 'public_alquiler_p2', {
        pendingText: true,
        alquilerNombre: trimSafe(input),
    });
    return buildPublicAlquilerP2();
}
function buildPublicAlquilerP2() {
    return [
        `🏪 *Consulta comercial*`,
        DSEP,
        `📍 *Paso 2 de 7*`,
        ``,
        `¿Cuál es el *nombre de tu marca o comercio*?`,
        `_(ej: "Studio Alma", "Tienda Roots", "Café Río")_`,
        DSEP,
        `0️⃣  Cancelar`,
    ].join('\n');
}
async function handlePublicAlquilerP2(session, input) {
    if (input === '0') {
        await (0, session_1.resetToMain)(session);
        return buildPublicMainMenu();
    }
    if (input.trim().length < 1)
        return `⚠️ Por favor ingresá el nombre de tu marca.\n\n${buildPublicAlquilerP2()}`;
    const ctx = session.contextData;
    await (0, session_1.navigateTo)(session, 'public_alquiler_p3', {
        pendingText: true,
        alquilerNombre: ctx.alquilerNombre,
        alquilerMarca: trimSafe(input),
    });
    return buildPublicAlquilerP3();
}
const RUBROS_ALQUILER = {
    '1': 'Indumentaria / Moda',
    '2': 'Calzado / Accesorios',
    '3': 'Deco / Hogar',
    '4': 'Belleza / Estética',
    '5': 'Infantil / Juguetería',
    '6': 'Arte / Artesanías',
    '7': 'Regalos / Lifestyle',
};
function buildPublicAlquilerP3() {
    return [
        `🏪 *Consulta comercial*`,
        DSEP,
        `📍 *Paso 3 de 7*`,
        ``,
        `En Docks trabajamos con *rubros seleccionados* para`,
        `mantener la identidad y la propuesta del predio.`,
        ``,
        `¿A qué *rubro* pertenece tu negocio?`,
        DSEP,
        `1️⃣  👗 Indumentaria / Moda`,
        `2️⃣  👟 Calzado / Accesorios`,
        `3️⃣  🏠 Deco / Hogar`,
        `4️⃣  💄 Belleza / Estética`,
        `5️⃣  🧒 Infantil / Juguetería`,
        `6️⃣  🎨 Arte / Artesanías`,
        `7️⃣  🛍️ Regalos / Lifestyle`,
        `8️⃣  ✏️  Otro rubro (escribir)`,
        DSEP,
        `_Escribí *cancelar* para salir_`,
    ].join('\n');
}
async function handlePublicAlquilerP3(session, input) {
    if (input.trim().toLowerCase() === 'cancelar') {
        await (0, session_1.resetToMain)(session);
        return buildPublicMainMenu();
    }
    const ctx = session.contextData;
    if (input === '8') {
        await (0, session_1.navigateTo)(session, 'public_alquiler_p3_otro', {
            pendingText: true,
            alquilerNombre: ctx.alquilerNombre,
            alquilerMarca: ctx.alquilerMarca,
        });
        return [
            `🏪 *Consulta comercial*`,
            DSEP,
            `📍 *Paso 3 de 7*`,
            ``,
            `¿Cuál es el rubro de tu negocio?`,
            `_(Describilo con tus palabras, ej: "Perfumería", "Juguetes importados")_`,
            DSEP,
            `_Escribí *cancelar* para salir_`,
        ].join('\n');
    }
    const rubro = RUBROS_ALQUILER[input];
    if (!rubro)
        return `⚠️ Elegí una opción del 1 al 8.\n\n${buildPublicAlquilerP3()}`;
    await (0, session_1.navigateTo)(session, 'public_alquiler_p4', {
        pendingText: true,
        alquilerNombre: ctx.alquilerNombre,
        alquilerMarca: ctx.alquilerMarca,
        alquilerRubro: rubro,
    });
    return buildPublicAlquilerP4();
}
async function handlePublicAlquilerP3Otro(session, input) {
    if (input.trim().toLowerCase() === 'cancelar') {
        await (0, session_1.resetToMain)(session);
        return buildPublicMainMenu();
    }
    if (input.trim().length < 2)
        return `⚠️ Por favor describí el rubro.\n\n${buildPublicAlquilerP3()}`;
    const ctx = session.contextData;
    await (0, session_1.navigateTo)(session, 'public_alquiler_p4', {
        pendingText: true,
        alquilerNombre: ctx.alquilerNombre,
        alquilerMarca: ctx.alquilerMarca,
        alquilerRubro: trimSafe(input),
    });
    return buildPublicAlquilerP4();
}
function buildPublicAlquilerP4() {
    return [
        `🏪 *Consulta comercial*`,
        DSEP,
        `📍 *Paso 4 de 7*`,
        ``,
        `Una referencia online nos ayuda a conocer tu propuesta`,
        `antes de la visita y darle mejor contexto al equipo comercial.`,
        ``,
        `¿Tenés *Instagram o página web*?`,
        `Podés pegar el link, escribir _@usuario_ o la URL.`,
        `Si no tenés, escribí _"ninguno"_.`,
        DSEP,
        `_Escribí *cancelar* para salir_`,
    ].join('\n');
}
async function handlePublicAlquilerP4(session, input) {
    if (input.trim().toLowerCase() === 'cancelar') {
        await (0, session_1.resetToMain)(session);
        return buildPublicMainMenu();
    }
    if (input.trim().length < 1)
        return `⚠️ Por favor respondé o escribí "ninguno".\n\n${buildPublicAlquilerP4()}`;
    const ctx = session.contextData;
    await (0, session_1.navigateTo)(session, 'public_alquiler_p5', {
        pendingText: true,
        alquilerNombre: ctx.alquilerNombre,
        alquilerMarca: ctx.alquilerMarca,
        alquilerRubro: ctx.alquilerRubro,
        alquilerInstagram: normalizeWebOrIG(input),
    });
    return buildPublicAlquilerP5();
}
const ESPACIOS_ALQUILER = {
    '1': 'Local',
    '2': 'Stand / Módulo',
    '3': 'Espacio exterior',
    '4': 'No lo tengo claro todavía',
};
function buildPublicAlquilerP5() {
    return [
        `🏪 *Consulta comercial*`,
        DSEP,
        `📍 *Paso 5 de 7*`,
        ``,
        `Tenemos desde locales íntimos hasta espacios amplios`,
        `con frente al río y terrazas exteriores.`,
        ``,
        `¿Qué tipo de *espacio* estás buscando?`,
        DSEP,
        `1️⃣  🏬 Local`,
        `2️⃣  🛖 Stand / Módulo`,
        `3️⃣  🌿 Espacio exterior`,
        `4️⃣  🤔 No lo tengo claro todavía`,
        DSEP,
        `_Escribí *cancelar* para salir_`,
    ].join('\n');
}
async function handlePublicAlquilerP5(session, input) {
    if (input.trim().toLowerCase() === 'cancelar') {
        await (0, session_1.resetToMain)(session);
        return buildPublicMainMenu();
    }
    const tipoEspacio = ESPACIOS_ALQUILER[input];
    if (!tipoEspacio)
        return `⚠️ Elegí una opción del 1 al 4.\n\n${buildPublicAlquilerP5()}`;
    const ctx = session.contextData;
    await (0, session_1.navigateTo)(session, 'public_alquiler_p6', {
        pendingText: true,
        alquilerNombre: ctx.alquilerNombre,
        alquilerMarca: ctx.alquilerMarca,
        alquilerRubro: ctx.alquilerRubro,
        alquilerInstagram: ctx.alquilerInstagram,
        alquilerTipoEspacio: tipoEspacio,
    });
    return buildPublicAlquilerP6();
}
function buildPublicAlquilerP6() {
    return [
        `🏪 *Consulta comercial*`,
        DSEP,
        `📍 *Paso 6 de 7*`,
        ``,
        `¿*Desde cuándo* te gustaría comenzar?`,
        `_(ej: "lo antes posible", "en 3 meses", "para septiembre")_`,
        DSEP,
        `0️⃣  Cancelar`,
    ].join('\n');
}
async function handlePublicAlquilerP6(session, input) {
    if (input.trim().toLowerCase() === 'cancelar') {
        await (0, session_1.resetToMain)(session);
        return buildPublicMainMenu();
    }
    if (input.trim().length < 1)
        return `⚠️ Por favor indicá desde cuándo.\n\n${buildPublicAlquilerP6()}`;
    const ctx = session.contextData;
    await (0, session_1.navigateTo)(session, 'public_alquiler_p7', {
        ...ctx,
        pendingText: true,
        alquilerDesdeCuando: trimSafe(input),
    });
    return buildPublicAlquilerP7();
}
const SEGUIMIENTO_ALQUILER = {
    '1': 'Quiere coordinar una visita',
    '2': 'Prefiere llamada',
    '3': 'Prefiere recibir información por WhatsApp',
};
function buildPublicAlquilerP7() {
    return [
        `🏪 *Consulta comercial*`,
        DSEP,
        `📍 *Paso 7 de 7 — ¡Último paso!*`,
        ``,
        `La visita al predio es clave para evaluar ubicación,`,
        `circulación y qué espacio tiene más sentido para tu marca.`,
        ``,
        `¿Cómo preferís *seguir adelante*?`,
        DSEP,
        `1️⃣  📅 Coordinar una visita al predio`,
        `2️⃣  📞 Que me llamen`,
        `3️⃣  💬 Recibir información por WhatsApp`,
        DSEP,
        `_Escribí *cancelar* para salir_`,
    ].join('\n');
}
async function handlePublicAlquilerP7(session, input) {
    if (input.trim().toLowerCase() === 'cancelar') {
        await (0, session_1.resetToMain)(session);
        return buildPublicMainMenu();
    }
    const seguimiento = SEGUIMIENTO_ALQUILER[input];
    if (!seguimiento)
        return `⚠️ Elegí una opción del 1 al 3.\n\n${buildPublicAlquilerP7()}`;
    const ctx = session.contextData;
    const newCtx = { ...ctx, alquilerSeguimiento: seguimiento };
    await (0, session_1.navigateTo)(session, 'public_alquiler_confirmar', newCtx);
    return buildPublicAlquilerConfirmar(newCtx);
}
function buildPublicAlquilerConfirmar(ctx) {
    const instagram = String(ctx.alquilerInstagram ?? '');
    const lines = [
        `🏪 *Confirmar consulta — Docks del Puerto*`,
        DSEP,
        `👤 *${ctx.alquilerNombre ?? ''}*`,
        ctx.alquilerMarca ? `🏷️  Marca: *${ctx.alquilerMarca}*` : null,
        ctx.alquilerRubro ? `🏬 Rubro: ${ctx.alquilerRubro}` : null,
        instagram && instagram !== 'No tiene' ? `📸 ${instagram}` : null,
        ctx.alquilerTipoEspacio ? `📐 Espacio: ${ctx.alquilerTipoEspacio}` : null,
        ctx.alquilerDesdeCuando ? `📅 Inicio: ${ctx.alquilerDesdeCuando}` : null,
        ctx.alquilerSeguimiento ? `📌 Seguimiento: ${ctx.alquilerSeguimiento}` : null,
        DSEP,
        `¿Los datos están bien?`,
        ``,
        `1️⃣  ✅ *Enviar consulta*`,
        `2️⃣  ✏️  Corregir algo`,
    ];
    return lines.filter(Boolean).join('\n');
}
async function handlePublicAlquilerConfirmar(session, input) {
    const ctx = session.contextData;
    if (input === '2') {
        await (0, session_1.navigateTo)(session, 'public_alquiler_p1', { pendingText: true });
        return [`✏️ Sin problema, empecemos de nuevo.`, ``, buildPublicAlquilerP1()].join('\n');
    }
    if (input !== '1')
        return `⚠️ Elegí 1 para enviar o 2 para corregir.\n\n${buildPublicAlquilerConfirmar(ctx)}`;
    const nombre = String(ctx.alquilerNombre ?? 'Sin nombre');
    const marca = String(ctx.alquilerMarca ?? '');
    const rubro = String(ctx.alquilerRubro ?? '');
    const instagram = String(ctx.alquilerInstagram ?? '');
    const tipoEspacio = String(ctx.alquilerTipoEspacio ?? '');
    const desdeCuando = String(ctx.alquilerDesdeCuando ?? '');
    const seguimiento = String(ctx.alquilerSeguimiento ?? '');
    const phone = fmtPhone(session.waNumber);
    const score = (0, scoring_1.calcularScore)({ rubro, instagramOrWeb: instagram, tipoEspacio, desdeCuando, seguimiento });
    const temperature = (0, scoring_1.getTemperature)(score);
    const tempEmoji = { hot: '🔥', warm: '🌡️', cold: '❄️', not_fit: '⛔' };
    const mensaje = [
        marca ? `Marca: ${marca}` : null,
        instagram && instagram !== 'No tiene' ? `Instagram/web: ${instagram}` : null,
        tipoEspacio ? `Espacio buscado: ${tipoEspacio}` : null,
        desdeCuando ? `Inicio deseado: ${desdeCuando}` : null,
        seguimiento ? `Seguimiento: ${seguimiento}` : null,
    ].filter(Boolean).join(' | ');
    try {
        const leadId = await (0, db_1.crearLead)({
            nombre,
            telefono: session.waNumber,
            waId: session.waNumber,
            rubro,
            mensaje,
            fuente: 'whatsapp',
            estado: 'nuevo',
            score,
            temperature,
            lastBotMsgAt: new Date(),
        });
        const urgencyLine = temperature === 'hot'
            ? `⚡ _Contactar en los próximos 15 minutos_`
            : temperature === 'warm'
                ? `⏰ _Contactar hoy_`
                : null;
        await notifyAdmins([
            `${tempEmoji[temperature]} *Nueva consulta comercial* · Score: ${score}/100`,
            `🏢 Docks del Puerto`,
            DSEP,
            `👤 *${nombre}*  |  🏷️ ${marca}`,
            `📞 ${phone}`,
            `🏬 Rubro: ${rubro}`,
            instagram && instagram !== 'No tiene' ? `📸 ${instagram}` : null,
            `📐 Busca: ${tipoEspacio}`,
            `📅 Inicio: ${desdeCuando}`,
            seguimiento ? `📌 ${seguimiento}` : null,
            urgencyLine,
            DSEP,
            `_Lead #${leadId} · WhatsApp · ${nowAr()}_`,
        ].filter((l) => !!l).join('\n'));
        await (0, session_1.navigateTo)(session, 'main', {});
        return buildClosingByTemperature(temperature, nombre);
    }
    catch {
        return (0, guards_1.errorMsg)('No se pudo registrar la consulta. Intentá nuevamente.');
    }
}
// --- Flujo: coordinar visita -------------------------------------------------
function buildPublicVisitaP1() {
    return [
        `📅 *Coordinar visita — Docks del Puerto*`,
        DSEP,
        `Una visita corta te permite ver ubicación dentro`,
        `del predio, circulación, tipo de público y espacios reales.`,
        `Sin compromiso.`,
        ``,
        `¿Cuál es tu *nombre y apellido*?`,
        DSEP,
        `0️⃣  Volver`,
    ].join('\n');
}
async function handlePublicVisitaP1(session, input) {
    if (input === '0')
        return null;
    if (input.trim().length < 2)
        return `⚠️ Por favor ingresá tu nombre.\n\n${buildPublicVisitaP1()}`;
    await (0, session_1.navigateTo)(session, 'public_visita_p2', {
        pendingText: true,
        visitaNombre: trimSafe(input),
    });
    return buildPublicVisitaP2();
}
function buildPublicVisitaP2() {
    return [
        `📅 *Coordinar visita*`,
        DSEP,
        `¿Cuál es tu *marca o rubro*?`,
        `_(ej: indumentaria, deco, accesorios, showroom)_`,
        DSEP,
        `0️⃣  Cancelar`,
    ].join('\n');
}
async function handlePublicVisitaP2(session, input) {
    if (input === '0') {
        await (0, session_1.resetToMain)(session);
        return buildPublicMainMenu();
    }
    if (input.trim().length < 2)
        return `⚠️ Por favor indicá marca o rubro.\n\n${buildPublicVisitaP2()}`;
    const ctx = session.contextData;
    await (0, session_1.navigateTo)(session, 'public_visita_p3', {
        pendingText: true,
        visitaNombre: ctx.visitaNombre,
        visitaMarcaRubro: trimSafe(input),
    });
    return buildPublicVisitaP3();
}
const HORARIOS_VISITA = {
    '1': 'Mañana',
    '2': 'Tarde',
    '3': 'Fin de semana',
    '4': 'Que me contacten para coordinar',
};
function buildPublicVisitaP3() {
    return [
        `📅 *Coordinar visita*`,
        DSEP,
        `¿Qué *horario* te queda mejor para visitar?`,
        `_(El predio atiende vie-dom y feriados 10-20 hs)_`,
        DSEP,
        `1️⃣  ☀️  Mañana`,
        `2️⃣  🌅  Tarde`,
        `3️⃣  🗓️  Fin de semana`,
        `4️⃣  📞 Que me contacten para coordinar`,
        DSEP,
        `_Escribí *cancelar* para salir_`,
    ].join('\n');
}
async function handlePublicVisitaP3(session, input) {
    if (input.trim().toLowerCase() === 'cancelar') {
        await (0, session_1.resetToMain)(session);
        return buildPublicMainMenu();
    }
    const horario = HORARIOS_VISITA[input];
    if (!horario)
        return `⚠️ Elegí una opción del 1 al 4.\n\n${buildPublicVisitaP3()}`;
    const ctx = session.contextData;
    const nombre = String(ctx.visitaNombre ?? 'Sin nombre');
    const marcaRubro = String(ctx.visitaMarcaRubro ?? '');
    const phone = fmtPhone(session.waNumber);
    const score = (0, scoring_1.calcularScore)({ rubro: marcaRubro, seguimiento: 'Quiere coordinar una visita' });
    const temperature = (0, scoring_1.getTemperature)(Math.max(score, 50));
    const tempEmoji = { hot: '🔥', warm: '🌡️', cold: '❄️', not_fit: '⛔' };
    const mensaje = [`Marca/rubro: ${marcaRubro}`, `Preferencia visita: ${horario}`].join(' | ');
    try {
        const leadId = await (0, db_1.crearLead)({
            nombre,
            telefono: session.waNumber,
            waId: session.waNumber,
            rubro: 'visita_comercial',
            mensaje,
            fuente: 'whatsapp',
            estado: 'nuevo',
            score,
            temperature,
            lastBotMsgAt: new Date(),
        });
        await notifyAdmins([
            `${tempEmoji[temperature]} *Visita solicitada* · Score: ${score}/100`,
            `🏢 Docks del Puerto`,
            DSEP,
            `👤 *${nombre}*`,
            `📞 ${phone}`,
            `🏷️ ${marcaRubro}`,
            `🕐 Preferencia: ${horario}`,
            temperature === 'hot' ? `⚡ _Confirmar visita en los próximos 60 minutos_` : null,
            DSEP,
            `_Lead #${leadId} · WhatsApp · ${nowAr()}_`,
        ].filter((l) => !!l).join('\n'));
        await (0, session_1.navigateTo)(session, 'main', {});
        return [
            `📅 *¡Visita solicitada!*`,
            DSEP,
            `Gracias *${nombre}*. Registramos tu interés para`,
            `visitar Docks del Puerto. 🏢`,
            ``,
            `Preferencia: *${horario}*.`,
            ``,
            `Un asesor comercial te va a confirmar día y horario.`,
            DSEP,
            `_Docks del Puerto · Shopping & Lifestyle · Tigre_ ✨`,
        ].join('\n');
    }
    catch {
        return (0, guards_1.errorMsg)('No se pudo registrar la visita. Intentá nuevamente.');
    }
}
// --- Info: ubicacion y horarios ---------------------------------------------
function buildPublicUbicacion() {
    return [
        `📍 *Ubicación y horarios — Docks del Puerto*`,
        DSEP,
        `🗺️ *Dónde estamos*`,
        `Pedro Guareschi 22, Puerto de Frutos`,
        `Tigre, Buenos Aires B1648`,
        ``,
        `📌 *Google Maps:*`,
        `https://maps.google.com/?q=Pedro+Guareschi+22,+Tigre,+Buenos+Aires`,
        DSEP,
        `🕐 *Horarios*`,
        `Viernes a domingos y feriados`,
        `*10:00 a 20:00 hs*`,
        DSEP,
        `1️⃣  📅 Coordinar una visita`,
        `2️⃣  💬 Hablar con un asesor`,
        `0️⃣  Volver`,
    ].join('\n');
}
async function handlePublicUbicacion(session, input) {
    if (input === '1') {
        await (0, session_1.navigateTo)(session, 'public_visita_p1', { pendingText: true });
        return buildPublicVisitaP1();
    }
    if (input === '2') {
        await (0, session_1.navigateTo)(session, 'public_asesor_p1', { pendingText: true });
        return buildPublicAsesorP1();
    }
    if (input === '0')
        return null;
    return `⚠️ Elegí 1, 2 o 0.\n\n${buildPublicUbicacion()}`;
}
// --- Flujo: hablar con asesor ------------------------------------------------
function buildPublicAsesorP1() {
    return [
        `💬 *Hablar con un asesor comercial*`,
        DSEP,
        `Te vamos a conectar con alguien del equipo`,
        `que puede orientarte sobre disponibilidad y propuestas.`,
        ``,
        `¿Cuál es tu *nombre y apellido*?`,
        DSEP,
        `0️⃣  Volver`,
    ].join('\n');
}
async function handlePublicAsesorP1(session, input) {
    if (input === '0')
        return null;
    if (input.trim().length < 2)
        return `⚠️ Por favor ingresá tu nombre.\n\n${buildPublicAsesorP1()}`;
    await (0, session_1.navigateTo)(session, 'public_asesor_p2', {
        pendingText: true,
        asesorNombre: trimSafe(input),
    });
    return buildPublicAsesorP2(input);
}
function buildPublicAsesorP2(nombre) {
    return [
        `💬 *Hablar con un asesor comercial*`,
        DSEP,
        `Hola${nombre ? ` *${trimSafe(nombre)}*` : ''}. ¿Sobre qué querés consultar?`,
        `_(ej: alquiler, disponibilidad, propuesta comercial, precios)_`,
        DSEP,
        `0️⃣  Volver`,
    ].join('\n');
}
async function handlePublicAsesorP2(session, input) {
    if (input === '0')
        return null;
    if (input.trim().length < 3)
        return `⚠️ Contanos un poco más para derivarlo bien.\n\n${buildPublicAsesorP2()}`;
    const { asesorNombre } = session.contextData;
    const nombre = String(asesorNombre ?? 'Sin nombre');
    const consulta = trimSafe(input);
    const phone = fmtPhone(session.waNumber);
    try {
        const leadId = await (0, db_1.crearLead)({
            nombre,
            telefono: session.waNumber,
            waId: session.waNumber,
            rubro: 'asesor_comercial',
            mensaje: consulta,
            fuente: 'whatsapp',
            estado: 'nuevo',
            lastBotMsgAt: new Date(),
        });
        await notifyAdmins([
            `💬 *Solicitud de asesor comercial*`,
            `🏢 Docks del Puerto`,
            DSEP,
            `👤 *${nombre}*`,
            `📞 ${phone}`,
            `💬 _"${consulta}"_`,
            DSEP,
            `_Lead #${leadId} · WhatsApp · ${nowAr()}_`,
        ].join('\n'));
        await (0, session_1.navigateTo)(session, 'main', {});
        return [
            `✅ *Consulta registrada*`,
            DSEP,
            `Gracias *${nombre}*. Un asesor comercial`,
            `te va a responder a la brevedad.`,
            DSEP,
            `_Docks del Puerto · Shopping & Lifestyle · Tigre_ 🏢`,
        ].join('\n');
    }
    catch {
        return (0, guards_1.errorMsg)('No se pudo registrar la consulta. Intentá nuevamente.');
    }
}
// --- Flujo: reclamo de locatario --------------------------------------------
function buildPublicReclamoP1() {
    return [
        `🔧 *Ayuda para locatarios*`,
        DSEP,
        `Registramos tu consulta y la derivamos al área correspondiente.`,
        ``,
        `Por favor, ¿cuál es tu *nombre* y el *número de tu local*?`,
        `_(ej: "Carlos Rodríguez - Local 214")_`,
        DSEP,
        `0️⃣  Volver`,
    ].join('\n');
}
async function handlePublicReclamoP1(session, input) {
    if (input === '0')
        return null;
    if (input.trim().length < 3)
        return `⚠️ Por favor ingresá tu nombre y número de local.\n\n${buildPublicReclamoP1()}`;
    await (0, session_1.navigateTo)(session, 'public_reclamo_p2', {
        pendingText: true,
        publicNombre: trimSafe(input),
    });
    return buildPublicReclamoP2();
}
function buildPublicReclamoP2() {
    return [
        `🔧 *Ayuda para locatarios*`,
        DSEP,
        `Describí brevemente el *problema o reclamo*:`,
        `_(ej: "Falla la luz en el depósito desde ayer")_`,
        DSEP,
        `0️⃣  Volver`,
    ].join('\n');
}
async function handlePublicReclamoP2(session, input) {
    if (input === '0')
        return null;
    if (input.trim().length < 5)
        return `⚠️ Por favor describí el problema.\n\n${buildPublicReclamoP2()}`;
    const { publicNombre } = session.contextData;
    const nombre = String(publicNombre ?? 'Sin nombre');
    const phone = fmtPhone(session.waNumber);
    const reclamo = trimSafe(input);
    try {
        const leadId = await (0, db_1.crearLead)({
            nombre,
            telefono: session.waNumber,
            waId: session.waNumber,
            rubro: 'reclamo_locatario',
            mensaje: reclamo,
            fuente: 'whatsapp',
            estado: 'nuevo',
        });
        await notifyAdmins([
            `📢 *Reclamo de locatario*`,
            `🏢 Docks del Puerto`,
            DSEP,
            `👤 *${nombre}*`,
            `📞 ${phone}`,
            `🔧 _"${reclamo}"_`,
            DSEP,
            `_Lead #${leadId} · WhatsApp · ${nowAr()}_`,
        ].filter((l) => !!l).join('\n'));
        await (0, session_1.navigateTo)(session, 'main', {});
        return [
            `✅ *¡Reclamo registrado!*`,
            DSEP,
            `Recibimos tu reclamo y lo vamos a derivar`,
            `al área correspondiente. Te contactamos para`,
            `informarte el estado.`,
            ``,
            `📞 Si es urgente, comunicarte con administración.`,
            DSEP,
            `_Docks del Puerto 🏢_`,
        ].join('\n');
    }
    catch {
        return (0, guards_1.errorMsg)('No se pudo registrar el reclamo. Intentá nuevamente.');
    }
}
// --- Flujo legacy: mensaje libre --------------------------------------------
function buildPublicMensajeP1() {
    return [
        `✉️  *Dejar un mensaje*`,
        DSEP,
        `¿Cómo es tu nombre?`,
        DSEP,
        `0️⃣  Volver`,
    ].join('\n');
}
async function handlePublicMensajeP1(session, input) {
    if (input === '0')
        return null;
    if (input.trim().length < 2)
        return `⚠️ Por favor ingresá tu nombre.\n\n${buildPublicMensajeP1()}`;
    await (0, session_1.navigateTo)(session, 'public_mensaje_p2', {
        pendingText: true,
        publicNombre: trimSafe(input),
    });
    return buildPublicMensajeP2(input.trim());
}
function buildPublicMensajeP2(nombre) {
    return [
        `✉️  *Dejar un mensaje*`,
        DSEP,
        `Hola${nombre ? ` *${nombre}*` : ''}! ¿Qué querés contarnos?`,
        `(Escribí tu mensaje y lo recibimos enseguida)`,
        DSEP,
        `0️⃣  Volver`,
    ].join('\n');
}
async function handlePublicMensajeP2(session, input) {
    if (input === '0')
        return null;
    if (input.trim().length < 3)
        return `⚠️ El mensaje es muy corto. Por favor ingresá más detalle.\n\n${buildPublicMensajeP2()}`;
    const { publicNombre } = session.contextData;
    const nombre = String(publicNombre ?? 'Sin nombre');
    const phone = fmtPhone(session.waNumber);
    const mensaje = trimSafe(input);
    try {
        const leadId = await (0, db_1.crearLead)({
            nombre,
            telefono: session.waNumber,
            waId: session.waNumber,
            rubro: 'consulta',
            mensaje,
            fuente: 'whatsapp',
            estado: 'nuevo',
        });
        await notifyAdmins([
            `✉️ *Nuevo mensaje de contacto*`,
            `🏢 Docks del Puerto`,
            DSEP,
            `👤 *${nombre}*`,
            `📞 ${phone}`,
            `💬 _"${mensaje}"_`,
            DSEP,
            `_Lead #${leadId} · WhatsApp · ${nowAr()}_`,
        ].filter((l) => !!l).join('\n'));
        await (0, session_1.navigateTo)(session, 'main', {});
        return [
            `✅ *¡Mensaje recibido!*`,
            DSEP,
            `Gracias *${nombre}*. Le vamos a dar respuesta a la brevedad.`,
            ``,
            `📞 Si necesitás algo más, escribinos cuando quieras.`,
            DSEP,
            `_Docks del Puerto 🏢_`,
        ].join('\n');
    }
    catch {
        return (0, guards_1.errorMsg)('No se pudo enviar el mensaje. Intentá nuevamente.');
    }
}
async function notifyAdmins(message) {
    try {
        const users = await (0, db_1.getUsers)();
        const admins = users.filter((u) => u.role === 'admin' && u.waId && u.activo);
        for (const admin of admins) {
            await (0, db_1.enqueueBotMessage)(String(admin.waId), message);
        }
    }
    catch {
        // Notificacion no critica: el lead ya queda registrado.
    }
}
