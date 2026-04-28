/**
 * Menu comercial publico - Docks del Puerto
 *
 * Para personas no registradas como empleados. El foco es convertir
 * interesados en leads accionables: visita, llamada o seguimiento por WhatsApp.
 */

import { BotSession, navigateTo, resetToMain } from '../../session'
import { SEP, errorMsg } from '../../shared/guards'
import { crearLead, getUsers, enqueueBotMessage } from '../../../db'
import { calcularScore, getTemperature, LeadTemperature } from '../../../leads/scoring'

const MAX_INPUT = 300
const DSEP = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

function trimSafe(v: string): string {
  return v.trim().slice(0, MAX_INPUT)
}

const NO_VARIANTS = ['no', 'nope', 'ninguno', 'no tengo', 'sin dato', 'no tiene', 'sin instagram', 'sin web', 'no hay', '0']

function normalizeWebOrIG(raw: string): string {
  const v = raw.trim()
  if (!v) return ''
  if (NO_VARIANTS.includes(v.toLowerCase())) return 'No tiene'

  const igMatch = v.match(/(?:instagram\.com|instagr\.am)\/([A-Za-z0-9_.]+)/i)
  if (igMatch) return `@${igMatch[1].replace(/\/$/, '')}`
  if (v.startsWith('@')) return v
  if (/^https?:\/\//i.test(v) || /^www\./i.test(v)) {
    return v.replace(/^https?:\/\//i, '').replace(/\/$/, '')
  }
  return v
}

function fmtPhone(waId: string): string {
  const d = waId.replace(/\D/g, '')
  if (d.startsWith('549') && d.length === 13) {
    const area = d.slice(3, 5)
    const num = d.slice(5)
    return `+54 9 ${area} ${num.slice(0, 4)}-${num.slice(4)}`
  }
  if (d.startsWith('54') && d.length === 12) {
    return `+54 ${d.slice(2, 4)} ${d.slice(4, 8)}-${d.slice(8)}`
  }
  return `+${d}`
}

function nowAr(): string {
  return new Date().toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

// --- Closing messages por temperatura -------------------------------------------

function buildClosingByTemperature(temperature: LeadTemperature, nombre: string): string {
  const n = nombre && nombre !== 'Sin nombre' ? ` *${nombre}*` : ''
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
      ].join('\n')
    case 'warm':
      return [
        `✅ *¡Consulta registrada!*`,
        DSEP,
        `Gracias${n}. Tiene sentido que conozcas el predio.`,
        `Un asesor va a contactarte para ver juntos qué`,
        `espacios tienen más sentido para tu propuesta.`,
        DSEP,
        `_Docks del Puerto · Puerto de Frutos, Tigre_ 🏢`,
      ].join('\n')
    case 'cold':
      return [
        `✅ *Consulta registrada*`,
        DSEP,
        `Gracias${n}. Registramos tu consulta.`,
        `Cuando estés más cerca de avanzar,`,
        `nuestro equipo te va a estar esperando.`,
        DSEP,
        `_Docks del Puerto · Puerto de Frutos, Tigre_ 🏢`,
      ].join('\n')
    default:
      return [
        `✅ *Consulta registrada*`,
        DSEP,
        `Gracias${n}. Tomamos nota de tu consulta.`,
        `Por ahora no tenemos espacios que encajen con tu perfil,`,
        `pero si la situación cambia no dudes en escribirnos.`,
        DSEP,
        `_Docks del Puerto 🏢_`,
      ].join('\n')
  }
}

// --- Menu principal publico --------------------------------------------------

export function buildPublicMainMenu(): string {
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
  ].join('\n')
}

export async function handlePublicMain(session: BotSession, input: string): Promise<string | null> {
  if (input === '1') {
    await navigateTo(session, 'public_alquiler_p1', { pendingText: true })
    return buildPublicAlquilerP1()
  }
  if (input === '2') {
    await navigateTo(session, 'public_visita_p1', { pendingText: true })
    return buildPublicVisitaP1()
  }
  if (input === '3') {
    await navigateTo(session, 'public_ubicacion', {})
    return buildPublicUbicacion()
  }
  if (input === '4') {
    await navigateTo(session, 'public_asesor_p1', { pendingText: true })
    return buildPublicAsesorP1()
  }
  if (input === '5') {
    await navigateTo(session, 'public_reclamo_p1', { pendingText: true })
    return buildPublicReclamoP1()
  }
  if (input === '0') {
    return [
      `👋 *Hasta luego.*`,
      ``,
      `Si necesitás ayuda en otro momento, escribinos a este número.`,
      `_Docks del Puerto 🏢_`,
    ].join('\n')
  }
  return `❓ *Opción no válida.* Ingresá el número de la opción:\n\n${buildPublicMainMenu()}`
}

// --- Flujo: alquiler comercial ----------------------------------------------

export function buildPublicAlquilerP1(): string {
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
  ].join('\n')
}

export async function handlePublicAlquilerP1(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') return null
  if (input.trim().length < 2) return `⚠️ Por favor ingresá tu nombre.\n\n${buildPublicAlquilerP1()}`

  await navigateTo(session, 'public_alquiler_p2', {
    pendingText: true,
    alquilerNombre: trimSafe(input),
  })
  return buildPublicAlquilerP2()
}

export function buildPublicAlquilerP2(): string {
  return [
    `🏪 *Consulta comercial*`,
    DSEP,
    `📍 *Paso 2 de 7*`,
    ``,
    `¿Cuál es el *nombre de tu marca o comercio*?`,
    `_(ej: "Studio Alma", "Tienda Roots", "Café Río")_`,
    DSEP,
    `0️⃣  Cancelar`,
  ].join('\n')
}

export async function handlePublicAlquilerP2(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') { await resetToMain(session); return buildPublicMainMenu() }
  if (input.trim().length < 1) return `⚠️ Por favor ingresá el nombre de tu marca.\n\n${buildPublicAlquilerP2()}`

  const ctx = session.contextData as Record<string, any>
  await navigateTo(session, 'public_alquiler_p3', {
    pendingText: true,
    alquilerNombre: ctx.alquilerNombre,
    alquilerMarca: trimSafe(input),
  })
  return buildPublicAlquilerP3()
}

const RUBROS_ALQUILER: Record<string, string> = {
  '1': 'Indumentaria / Moda',
  '2': 'Calzado / Accesorios',
  '3': 'Deco / Hogar',
  '4': 'Belleza / Estética',
  '5': 'Infantil / Juguetería',
  '6': 'Arte / Artesanías',
  '7': 'Regalos / Lifestyle',
}

export function buildPublicAlquilerP3(): string {
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
  ].join('\n')
}

export async function handlePublicAlquilerP3(session: BotSession, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'cancelar') { await resetToMain(session); return buildPublicMainMenu() }

  const ctx = session.contextData as Record<string, any>
  if (input === '8') {
    await navigateTo(session, 'public_alquiler_p3_otro', {
      pendingText: true,
      alquilerNombre: ctx.alquilerNombre,
      alquilerMarca: ctx.alquilerMarca,
    })
    return [
      `🏪 *Consulta comercial*`,
      DSEP,
      `📍 *Paso 3 de 7*`,
      ``,
      `¿Cuál es el rubro de tu negocio?`,
      `_(Describilo con tus palabras, ej: "Perfumería", "Juguetes importados")_`,
      DSEP,
      `_Escribí *cancelar* para salir_`,
    ].join('\n')
  }

  const rubro = RUBROS_ALQUILER[input]
  if (!rubro) return `⚠️ Elegí una opción del 1 al 8.\n\n${buildPublicAlquilerP3()}`

  await navigateTo(session, 'public_alquiler_p4', {
    pendingText: true,
    alquilerNombre: ctx.alquilerNombre,
    alquilerMarca: ctx.alquilerMarca,
    alquilerRubro: rubro,
  })
  return buildPublicAlquilerP4()
}

export async function handlePublicAlquilerP3Otro(session: BotSession, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'cancelar') { await resetToMain(session); return buildPublicMainMenu() }
  if (input.trim().length < 2) return `⚠️ Por favor describí el rubro.\n\n${buildPublicAlquilerP3()}`

  const ctx = session.contextData as Record<string, any>
  await navigateTo(session, 'public_alquiler_p4', {
    pendingText: true,
    alquilerNombre: ctx.alquilerNombre,
    alquilerMarca: ctx.alquilerMarca,
    alquilerRubro: trimSafe(input),
  })
  return buildPublicAlquilerP4()
}

export function buildPublicAlquilerP4(): string {
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
  ].join('\n')
}

export async function handlePublicAlquilerP4(session: BotSession, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'cancelar') { await resetToMain(session); return buildPublicMainMenu() }
  if (input.trim().length < 1) return `⚠️ Por favor respondé o escribí "ninguno".\n\n${buildPublicAlquilerP4()}`

  const ctx = session.contextData as Record<string, any>
  await navigateTo(session, 'public_alquiler_p5', {
    pendingText: true,
    alquilerNombre: ctx.alquilerNombre,
    alquilerMarca: ctx.alquilerMarca,
    alquilerRubro: ctx.alquilerRubro,
    alquilerInstagram: normalizeWebOrIG(input),
  })
  return buildPublicAlquilerP5()
}

const ESPACIOS_ALQUILER: Record<string, string> = {
  '1': 'Local',
  '2': 'Stand / Módulo',
  '3': 'Espacio exterior',
  '4': 'No lo tengo claro todavía',
}

export function buildPublicAlquilerP5(): string {
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
  ].join('\n')
}

export async function handlePublicAlquilerP5(session: BotSession, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'cancelar') { await resetToMain(session); return buildPublicMainMenu() }

  const tipoEspacio = ESPACIOS_ALQUILER[input]
  if (!tipoEspacio) return `⚠️ Elegí una opción del 1 al 4.\n\n${buildPublicAlquilerP5()}`

  const ctx = session.contextData as Record<string, any>
  await navigateTo(session, 'public_alquiler_p6', {
    pendingText: true,
    alquilerNombre: ctx.alquilerNombre,
    alquilerMarca: ctx.alquilerMarca,
    alquilerRubro: ctx.alquilerRubro,
    alquilerInstagram: ctx.alquilerInstagram,
    alquilerTipoEspacio: tipoEspacio,
  })
  return buildPublicAlquilerP6()
}

export function buildPublicAlquilerP6(): string {
  return [
    `🏪 *Consulta comercial*`,
    DSEP,
    `📍 *Paso 6 de 7*`,
    ``,
    `¿*Desde cuándo* te gustaría comenzar?`,
    `_(ej: "lo antes posible", "en 3 meses", "para septiembre")_`,
    DSEP,
    `0️⃣  Cancelar`,
  ].join('\n')
}

export async function handlePublicAlquilerP6(session: BotSession, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'cancelar') { await resetToMain(session); return buildPublicMainMenu() }
  if (input.trim().length < 1) return `⚠️ Por favor indicá desde cuándo.\n\n${buildPublicAlquilerP6()}`

  const ctx = session.contextData as Record<string, any>
  await navigateTo(session, 'public_alquiler_p7', {
    ...ctx,
    pendingText: true,
    alquilerDesdeCuando: trimSafe(input),
  })
  return buildPublicAlquilerP7()
}

const SEGUIMIENTO_ALQUILER: Record<string, string> = {
  '1': 'Quiere coordinar una visita',
  '2': 'Prefiere llamada',
  '3': 'Prefiere recibir información por WhatsApp',
}

export function buildPublicAlquilerP7(): string {
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
  ].join('\n')
}

export async function handlePublicAlquilerP7(session: BotSession, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'cancelar') { await resetToMain(session); return buildPublicMainMenu() }

  const seguimiento = SEGUIMIENTO_ALQUILER[input]
  if (!seguimiento) return `⚠️ Elegí una opción del 1 al 3.\n\n${buildPublicAlquilerP7()}`

  const ctx = session.contextData as Record<string, any>
  const newCtx = { ...ctx, alquilerSeguimiento: seguimiento }
  await navigateTo(session, 'public_alquiler_confirmar', newCtx)
  return buildPublicAlquilerConfirmar(newCtx)
}

export function buildPublicAlquilerConfirmar(ctx: Record<string, any>): string {
  const instagram = String(ctx.alquilerInstagram ?? '')
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
  ]
  return lines.filter(Boolean).join('\n')
}

export async function handlePublicAlquilerConfirmar(session: BotSession, input: string): Promise<string> {
  const ctx = session.contextData as Record<string, any>

  if (input === '2') {
    await navigateTo(session, 'public_alquiler_p1', { pendingText: true })
    return [`✏️ Sin problema, empecemos de nuevo.`, ``, buildPublicAlquilerP1()].join('\n')
  }

  if (input !== '1') return `⚠️ Elegí 1 para enviar o 2 para corregir.\n\n${buildPublicAlquilerConfirmar(ctx)}`

  const nombre      = String(ctx.alquilerNombre ?? 'Sin nombre')
  const marca       = String(ctx.alquilerMarca ?? '')
  const rubro       = String(ctx.alquilerRubro ?? '')
  const instagram   = String(ctx.alquilerInstagram ?? '')
  const tipoEspacio = String(ctx.alquilerTipoEspacio ?? '')
  const desdeCuando = String(ctx.alquilerDesdeCuando ?? '')
  const seguimiento = String(ctx.alquilerSeguimiento ?? '')
  const phone       = fmtPhone(session.waNumber)

  const score       = calcularScore({ rubro, instagramOrWeb: instagram, tipoEspacio, desdeCuando, seguimiento })
  const temperature = getTemperature(score)
  const tempEmoji: Record<LeadTemperature, string> = { hot: '🔥', warm: '🌡️', cold: '❄️', not_fit: '⛔' }

  const mensaje = [
    marca ? `Marca: ${marca}` : null,
    instagram && instagram !== 'No tiene' ? `Instagram/web: ${instagram}` : null,
    tipoEspacio ? `Espacio buscado: ${tipoEspacio}` : null,
    desdeCuando ? `Inicio deseado: ${desdeCuando}` : null,
    seguimiento ? `Seguimiento: ${seguimiento}` : null,
  ].filter(Boolean).join(' | ')

  try {
    const leadId = await crearLead({
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
    } as any)

    const urgencyLine = temperature === 'hot'
      ? `⚡ _Contactar en los próximos 15 minutos_`
      : temperature === 'warm'
        ? `⏰ _Contactar hoy_`
        : null

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
    ].filter((l): l is string => !!l).join('\n'))

    await navigateTo(session, 'main', {})
    return buildClosingByTemperature(temperature, nombre)
  } catch {
    return errorMsg('No se pudo registrar la consulta. Intentá nuevamente.')
  }
}

// --- Flujo: coordinar visita -------------------------------------------------

export function buildPublicVisitaP1(): string {
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
  ].join('\n')
}

export async function handlePublicVisitaP1(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') return null
  if (input.trim().length < 2) return `⚠️ Por favor ingresá tu nombre.\n\n${buildPublicVisitaP1()}`

  await navigateTo(session, 'public_visita_p2', {
    pendingText: true,
    visitaNombre: trimSafe(input),
  })
  return buildPublicVisitaP2()
}

export function buildPublicVisitaP2(): string {
  return [
    `📅 *Coordinar visita*`,
    DSEP,
    `¿Cuál es tu *marca o rubro*?`,
    `_(ej: indumentaria, deco, accesorios, showroom)_`,
    DSEP,
    `0️⃣  Cancelar`,
  ].join('\n')
}

export async function handlePublicVisitaP2(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') { await resetToMain(session); return buildPublicMainMenu() }
  if (input.trim().length < 2) return `⚠️ Por favor indicá marca o rubro.\n\n${buildPublicVisitaP2()}`

  const ctx = session.contextData as Record<string, any>
  await navigateTo(session, 'public_visita_p3', {
    pendingText: true,
    visitaNombre: ctx.visitaNombre,
    visitaMarcaRubro: trimSafe(input),
  })
  return buildPublicVisitaP3()
}

const HORARIOS_VISITA: Record<string, string> = {
  '1': 'Mañana',
  '2': 'Tarde',
  '3': 'Fin de semana',
  '4': 'Que me contacten para coordinar',
}

export function buildPublicVisitaP3(): string {
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
  ].join('\n')
}

export async function handlePublicVisitaP3(session: BotSession, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'cancelar') { await resetToMain(session); return buildPublicMainMenu() }

  const horario = HORARIOS_VISITA[input]
  if (!horario) return `⚠️ Elegí una opción del 1 al 4.\n\n${buildPublicVisitaP3()}`

  const ctx = session.contextData as Record<string, any>
  const nombre     = String(ctx.visitaNombre ?? 'Sin nombre')
  const marcaRubro = String(ctx.visitaMarcaRubro ?? '')
  const phone      = fmtPhone(session.waNumber)

  const score       = calcularScore({ rubro: marcaRubro, seguimiento: 'Quiere coordinar una visita' })
  const temperature = getTemperature(Math.max(score, 50))
  const tempEmoji: Record<LeadTemperature, string> = { hot: '🔥', warm: '🌡️', cold: '❄️', not_fit: '⛔' }
  const mensaje = [`Marca/rubro: ${marcaRubro}`, `Preferencia visita: ${horario}`].join(' | ')

  try {
    const leadId = await crearLead({
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
    } as any)

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
    ].filter((l): l is string => !!l).join('\n'))

    await navigateTo(session, 'main', {})
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
    ].join('\n')
  } catch {
    return errorMsg('No se pudo registrar la visita. Intentá nuevamente.')
  }
}

// --- Info: ubicacion y horarios ---------------------------------------------

export function buildPublicUbicacion(): string {
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
  ].join('\n')
}

export async function handlePublicUbicacion(session: BotSession, input: string): Promise<string | null> {
  if (input === '1') {
    await navigateTo(session, 'public_visita_p1', { pendingText: true })
    return buildPublicVisitaP1()
  }
  if (input === '2') {
    await navigateTo(session, 'public_asesor_p1', { pendingText: true })
    return buildPublicAsesorP1()
  }
  if (input === '0') return null
  return `⚠️ Elegí 1, 2 o 0.\n\n${buildPublicUbicacion()}`
}

// --- Flujo: hablar con asesor ------------------------------------------------

export function buildPublicAsesorP1(): string {
  return [
    `💬 *Hablar con un asesor comercial*`,
    DSEP,
    `Te vamos a conectar con alguien del equipo`,
    `que puede orientarte sobre disponibilidad y propuestas.`,
    ``,
    `¿Cuál es tu *nombre y apellido*?`,
    DSEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export async function handlePublicAsesorP1(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') return null
  if (input.trim().length < 2) return `⚠️ Por favor ingresá tu nombre.\n\n${buildPublicAsesorP1()}`

  await navigateTo(session, 'public_asesor_p2', {
    pendingText: true,
    asesorNombre: trimSafe(input),
  })
  return buildPublicAsesorP2(input)
}

export function buildPublicAsesorP2(nombre?: string): string {
  return [
    `💬 *Hablar con un asesor comercial*`,
    DSEP,
    `Hola${nombre ? ` *${trimSafe(nombre)}*` : ''}. ¿Sobre qué querés consultar?`,
    `_(ej: alquiler, disponibilidad, propuesta comercial, precios)_`,
    DSEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export async function handlePublicAsesorP2(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') return null
  if (input.trim().length < 3) return `⚠️ Contanos un poco más para derivarlo bien.\n\n${buildPublicAsesorP2()}`

  const { asesorNombre } = session.contextData as Record<string, any>
  const nombre  = String(asesorNombre ?? 'Sin nombre')
  const consulta = trimSafe(input)
  const phone   = fmtPhone(session.waNumber)

  try {
    const leadId = await crearLead({
      nombre,
      telefono: session.waNumber,
      waId: session.waNumber,
      rubro: 'asesor_comercial',
      mensaje: consulta,
      fuente: 'whatsapp',
      estado: 'nuevo',
      lastBotMsgAt: new Date(),
    } as any)

    await notifyAdmins([
      `💬 *Solicitud de asesor comercial*`,
      `🏢 Docks del Puerto`,
      DSEP,
      `👤 *${nombre}*`,
      `📞 ${phone}`,
      `💬 _"${consulta}"_`,
      DSEP,
      `_Lead #${leadId} · WhatsApp · ${nowAr()}_`,
    ].join('\n'))

    await navigateTo(session, 'main', {})
    return [
      `✅ *Consulta registrada*`,
      DSEP,
      `Gracias *${nombre}*. Un asesor comercial`,
      `te va a responder a la brevedad.`,
      DSEP,
      `_Docks del Puerto · Shopping & Lifestyle · Tigre_ 🏢`,
    ].join('\n')
  } catch {
    return errorMsg('No se pudo registrar la consulta. Intentá nuevamente.')
  }
}

// --- Flujo: reclamo de locatario --------------------------------------------

export function buildPublicReclamoP1(): string {
  return [
    `🔧 *Ayuda para locatarios*`,
    DSEP,
    `Registramos tu consulta y la derivamos al área correspondiente.`,
    ``,
    `Por favor, ¿cuál es tu *nombre* y el *número de tu local*?`,
    `_(ej: "Carlos Rodríguez - Local 214")_`,
    DSEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export async function handlePublicReclamoP1(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') return null
  if (input.trim().length < 3) return `⚠️ Por favor ingresá tu nombre y número de local.\n\n${buildPublicReclamoP1()}`

  await navigateTo(session, 'public_reclamo_p2', {
    pendingText: true,
    publicNombre: trimSafe(input),
  })
  return buildPublicReclamoP2()
}

export function buildPublicReclamoP2(): string {
  return [
    `🔧 *Ayuda para locatarios*`,
    DSEP,
    `Describí brevemente el *problema o reclamo*:`,
    `_(ej: "Falla la luz en el depósito desde ayer")_`,
    DSEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export async function handlePublicReclamoP2(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') return null
  if (input.trim().length < 5) return `⚠️ Por favor describí el problema.\n\n${buildPublicReclamoP2()}`

  const { publicNombre } = session.contextData as Record<string, any>
  const nombre  = String(publicNombre ?? 'Sin nombre')
  const phone   = fmtPhone(session.waNumber)
  const reclamo = trimSafe(input)

  try {
    const leadId = await crearLead({
      nombre,
      telefono: session.waNumber,
      waId: session.waNumber,
      rubro: 'reclamo_locatario',
      mensaje: reclamo,
      fuente: 'whatsapp',
      estado: 'nuevo',
    })

    await notifyAdmins([
      `📢 *Reclamo de locatario*`,
      `🏢 Docks del Puerto`,
      DSEP,
      `👤 *${nombre}*`,
      `📞 ${phone}`,
      `🔧 _"${reclamo}"_`,
      DSEP,
      `_Lead #${leadId} · WhatsApp · ${nowAr()}_`,
    ].filter((l): l is string => !!l).join('\n'))

    await navigateTo(session, 'main', {})
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
    ].join('\n')
  } catch {
    return errorMsg('No se pudo registrar el reclamo. Intentá nuevamente.')
  }
}

// --- Flujo legacy: mensaje libre --------------------------------------------

export function buildPublicMensajeP1(): string {
  return [
    `✉️  *Dejar un mensaje*`,
    DSEP,
    `¿Cómo es tu nombre?`,
    DSEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export async function handlePublicMensajeP1(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') return null
  if (input.trim().length < 2) return `⚠️ Por favor ingresá tu nombre.\n\n${buildPublicMensajeP1()}`

  await navigateTo(session, 'public_mensaje_p2', {
    pendingText: true,
    publicNombre: trimSafe(input),
  })
  return buildPublicMensajeP2(input.trim())
}

export function buildPublicMensajeP2(nombre?: string): string {
  return [
    `✉️  *Dejar un mensaje*`,
    DSEP,
    `Hola${nombre ? ` *${nombre}*` : ''}! ¿Qué querés contarnos?`,
    `(Escribí tu mensaje y lo recibimos enseguida)`,
    DSEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export async function handlePublicMensajeP2(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') return null
  if (input.trim().length < 3) return `⚠️ El mensaje es muy corto. Por favor ingresá más detalle.\n\n${buildPublicMensajeP2()}`

  const { publicNombre } = session.contextData as Record<string, any>
  const nombre  = String(publicNombre ?? 'Sin nombre')
  const phone   = fmtPhone(session.waNumber)
  const mensaje = trimSafe(input)

  try {
    const leadId = await crearLead({
      nombre,
      telefono: session.waNumber,
      waId: session.waNumber,
      rubro: 'consulta',
      mensaje,
      fuente: 'whatsapp',
      estado: 'nuevo',
    })

    await notifyAdmins([
      `✉️ *Nuevo mensaje de contacto*`,
      `🏢 Docks del Puerto`,
      DSEP,
      `👤 *${nombre}*`,
      `📞 ${phone}`,
      `💬 _"${mensaje}"_`,
      DSEP,
      `_Lead #${leadId} · WhatsApp · ${nowAr()}_`,
    ].filter((l): l is string => !!l).join('\n'))

    await navigateTo(session, 'main', {})
    return [
      `✅ *¡Mensaje recibido!*`,
      DSEP,
      `Gracias *${nombre}*. Le vamos a dar respuesta a la brevedad.`,
      ``,
      `📞 Si necesitás algo más, escribinos cuando quieras.`,
      DSEP,
      `_Docks del Puerto 🏢_`,
    ].join('\n')
  } catch {
    return errorMsg('No se pudo enviar el mensaje. Intentá nuevamente.')
  }
}

async function notifyAdmins(message: string): Promise<void> {
  try {
    const users = await getUsers()
    const admins = users.filter((u: any) => u.role === 'admin' && u.waId && u.activo)
    for (const admin of admins) {
      await enqueueBotMessage(String(admin.waId), message)
    }
  } catch {
    // Notificacion no critica: el lead ya queda registrado.
  }
}
