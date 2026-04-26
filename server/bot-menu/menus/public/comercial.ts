/**
 * Menú comercial público — Docks del Puerto
 *
 * Para personas no registradas como empleados. Permite:
 *   1. Consulta de alquiler de local
 *   2. Reclamo de locatario
 *   3. Dejar un mensaje
 *
 * Todos los contactos se guardan como leads (fuente: 'whatsapp') para
 * que el equipo comercial los gestione desde el panel.
 */

import { BotSession, navigateTo, navigateBack, resetToMain } from '../../session'
import { SEP, confirmMsg, errorMsg } from '../../shared/guards'
import { crearLead, getUsers, enqueueBotMessage } from '../../../db'

const MAX_INPUT = 300

function trimSafe(v: string): string {
  return v.trim().slice(0, MAX_INPUT)
}

// ─── Normalización de Instagram / web ────────────────────────────────────────
// Acepta: @handle, instagram.com/handle, URL completa, "no", "ninguno", etc.

const NO_VARIANTS = ['no', 'nope', 'ninguno', 'no tengo', 'sin dato', 'no tiene', 'sin instagram', 'sin web', 'no hay', '0']

function normalizeWebOrIG(raw: string): string {
  const v = raw.trim()
  if (!v) return ''

  // Respuestas negativas conocidas (incluyendo "0" como "no tengo")
  if (NO_VARIANTS.includes(v.toLowerCase())) return 'No tiene'

  // Extraer handle de URL de Instagram
  const igMatch = v.match(/(?:instagram\.com|instagr\.am)\/([A-Za-z0-9_.]+)/i)
  if (igMatch) return `@${igMatch[1].replace(/\/$/, '')}`

  // Handle directo @usuario
  if (v.startsWith('@')) return v

  // URL de cualquier red social o web — limpiar protocolo y trailing slash
  if (/^https?:\/\//i.test(v) || /^www\./i.test(v)) {
    return v.replace(/^https?:\/\//i, '').replace(/\/$/, '')
  }

  return v
}

// ─── Helper: formato profesional de número argentino ────────────────────────

function fmtPhone(waId: string): string {
  const d = waId.replace(/\D/g, '')
  if (d.startsWith('549') && d.length === 13) {
    const area = d.slice(3, 5)
    const num  = d.slice(5)
    return `+54 9 ${area} ${num.slice(0, 4)}-${num.slice(4)}`
  }
  if (d.startsWith('54') && d.length === 12) {
    return `+54 ${d.slice(2, 4)} ${d.slice(4, 8)}-${d.slice(8)}`
  }
  return `+${d}`
}

// ─── Menú principal público ──────────────────────────────────────────────────

export function buildPublicMainMenu(): string {
  return [
    `🏢 *Docks del Puerto*`,
    SEP,
    `¡Bienvenido/a! ¿En qué podemos ayudarte?`,
    ``,
    `1️⃣  🏪 Consulta de alquiler de local`,
    `2️⃣  📢 Reclamo de locatario`,
    `3️⃣  ✉️  Dejar un mensaje`,
    SEP,
    `0️⃣  ✖️ Salir`,
  ].join('\n')
}

export async function handlePublicMain(session: BotSession, input: string): Promise<string | null> {
  if (input === '1') {
    await navigateTo(session, 'public_alquiler_p1', { pendingText: true })
    return buildPublicAlquilerP1()
  }
  if (input === '2') {
    await navigateTo(session, 'public_reclamo_p1', { pendingText: true })
    return buildPublicReclamoP1()
  }
  if (input === '3') {
    await navigateTo(session, 'public_mensaje_p1', { pendingText: true })
    return buildPublicMensajeP1()
  }
  if (input === '0') {
    return [
      `👋 *Hasta luego.*`,
      ``,
      `Si necesitás ayuda en otro momento, escribinos a este número.`,
      `Docks del Puerto 🏢`,
    ].join('\n')
  }
  return `❓ *Opción no válida.* Ingresá el número de la opción:\n\n${buildPublicMainMenu()}`
}

// ─── Flujo: Consulta de alquiler (7 pasos) ───────────────────────────────────
//
// P1 → nombre y apellido
// P2 → nombre de la marca o comercio
// P3 → rubro
// P4 → Instagram o web
// P5 → ¿ya tenés local o vendés online?
// P6 → ¿qué tipo de espacio buscás?
// P7 → ¿desde cuándo querés comenzar?
// → submit

export function buildPublicAlquilerP1(): string {
  return [
    `🏪 *Consulta de alquiler*`,
    SEP,
    `*Paso 1 de 7*`,
    `¿Cuál es tu *nombre y apellido*?`,
    SEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export async function handlePublicAlquilerP1(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') return null
  if (input.trim().length < 2) {
    return `⚠️ Por favor ingresá tu nombre.\n\n${buildPublicAlquilerP1()}`
  }
  await navigateTo(session, 'public_alquiler_p2', {
    pendingText: true,
    alquilerNombre: trimSafe(input),
  })
  return buildPublicAlquilerP2()
}

export function buildPublicAlquilerP2(): string {
  return [
    `🏪 *Consulta de alquiler*`,
    SEP,
    `*Paso 2 de 7*`,
    `¿Cuál es el *nombre de tu marca o comercio*?`,
    SEP,
    `0️⃣  Cancelar`,
  ].join('\n')
}

export async function handlePublicAlquilerP2(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') { await resetToMain(session); return buildPublicMainMenu() }
  if (input.trim().length < 1) {
    return `⚠️ Por favor ingresá el nombre de tu marca.\n\n${buildPublicAlquilerP2()}`
  }
  const ctx = session.contextData as Record<string, any>
  await navigateTo(session, 'public_alquiler_p3', {
    pendingText: true,
    alquilerNombre: ctx.alquilerNombre,
    alquilerMarca: trimSafe(input),
  })
  return buildPublicAlquilerP3()
}

export function buildPublicAlquilerP3(): string {
  return [
    `🏪 *Consulta de alquiler*`,
    SEP,
    `*Paso 3 de 7*`,
    `¿A qué *rubro* pertenece tu negocio?`,
    `_(ej: gastronomía, indumentaria, servicios, etc.)_`,
    SEP,
    `0️⃣  Cancelar`,
  ].join('\n')
}

export async function handlePublicAlquilerP3(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') { await resetToMain(session); return buildPublicMainMenu() }
  if (input.trim().length < 2) {
    return `⚠️ Por favor indicá el rubro de tu negocio.\n\n${buildPublicAlquilerP3()}`
  }
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
    `🏪 *Consulta de alquiler*`,
    SEP,
    `*Paso 4 de 7*`,
    `¿Tenés *Instagram o página web*?`,
    `Podés pegar el link, escribir _@usuario_ o la URL.`,
    `Si no tenés, escribí _"ninguno"_.`,
    SEP,
    `_Escribí *cancelar* para salir_`,
  ].join('\n')
}

export async function handlePublicAlquilerP4(session: BotSession, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'cancelar') { await resetToMain(session); return buildPublicMainMenu() }
  if (input.trim().length < 1) {
    return `⚠️ Por favor respondé o escribí "ninguno".\n\n${buildPublicAlquilerP4()}`
  }
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

export function buildPublicAlquilerP5(): string {
  return [
    `🏪 *Consulta de alquiler*`,
    SEP,
    `*Paso 5 de 7*`,
    `¿Ya tenés un *local físico* o vendés *online*?`,
    SEP,
    `0️⃣  Cancelar`,
  ].join('\n')
}

export async function handlePublicAlquilerP5(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') { await resetToMain(session); return buildPublicMainMenu() }
  if (input.trim().length < 1) {
    return `⚠️ Por favor respondé.\n\n${buildPublicAlquilerP5()}`
  }
  const ctx = session.contextData as Record<string, any>
  await navigateTo(session, 'public_alquiler_p6', {
    pendingText: true,
    alquilerNombre: ctx.alquilerNombre,
    alquilerMarca: ctx.alquilerMarca,
    alquilerRubro: ctx.alquilerRubro,
    alquilerInstagram: ctx.alquilerInstagram,
    alquilerTieneLocal: trimSafe(input),
  })
  return buildPublicAlquilerP6()
}

export function buildPublicAlquilerP6(): string {
  return [
    `🏪 *Consulta de alquiler*`,
    SEP,
    `*Paso 6 de 7*`,
    `¿Qué tipo de *espacio* estás buscando?`,
    `_(ej: local de 30m², puesto en pasillo, espacio en planta alta, etc.)_`,
    SEP,
    `0️⃣  Cancelar`,
  ].join('\n')
}

export async function handlePublicAlquilerP6(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') { await resetToMain(session); return buildPublicMainMenu() }
  if (input.trim().length < 3) {
    return `⚠️ Por favor describí qué estás buscando.\n\n${buildPublicAlquilerP6()}`
  }
  const ctx = session.contextData as Record<string, any>
  await navigateTo(session, 'public_alquiler_p7', {
    pendingText: true,
    alquilerNombre: ctx.alquilerNombre,
    alquilerMarca: ctx.alquilerMarca,
    alquilerRubro: ctx.alquilerRubro,
    alquilerInstagram: ctx.alquilerInstagram,
    alquilerTieneLocal: ctx.alquilerTieneLocal,
    alquilerTipoEspacio: trimSafe(input),
  })
  return buildPublicAlquilerP7()
}

export function buildPublicAlquilerP7(): string {
  return [
    `🏪 *Consulta de alquiler*`,
    SEP,
    `*Paso 7 de 7*`,
    `¿*Desde cuándo* te gustaría comenzar?`,
    `_(ej: marzo 2026, lo antes posible, en 3 meses)_`,
    SEP,
    `0️⃣  Cancelar`,
  ].join('\n')
}

export async function handlePublicAlquilerP7(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') { await resetToMain(session); return buildPublicMainMenu() }
  if (input.trim().length < 1) {
    return `⚠️ Por favor indicá desde cuándo.\n\n${buildPublicAlquilerP7()}`
  }

  const ctx = session.contextData as Record<string, any>
  const nombre       = String(ctx.alquilerNombre ?? 'Sin nombre')
  const marca        = String(ctx.alquilerMarca ?? '')
  const rubro        = String(ctx.alquilerRubro ?? '')
  const instagram    = String(ctx.alquilerInstagram ?? '')
  const tieneLocal   = String(ctx.alquilerTieneLocal ?? '')
  const tipoEspacio  = String(ctx.alquilerTipoEspacio ?? '')
  const desdeCuando  = trimSafe(input)
  const phone        = fmtPhone(session.waNumber)

  const mensaje = [
    marca       ? `Marca: ${marca}` : null,
    instagram   ? `Instagram/web: ${instagram}` : null,
    tieneLocal  ? `Tiene local: ${tieneLocal}` : null,
    tipoEspacio ? `Espacio buscado: ${tipoEspacio}` : null,
    desdeCuando ? `Inicio deseado: ${desdeCuando}` : null,
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
    })

    await notifyAdmins([
      `🏪 *Nueva consulta de alquiler*`,
      `🏢 Docks del Puerto`,
      SEP,
      `👤 *${nombre}*  |  🏷️ ${marca}`,
      `📞 ${phone}`,
      `🏬 Rubro: ${rubro}`,
      instagram   ? `📸 ${instagram}` : null,
      tieneLocal  ? `🏪 Tiene local: ${tieneLocal}` : null,
      `📐 Busca: ${tipoEspacio}`,
      `📅 Inicio: ${desdeCuando}`,
      SEP,
      `_Lead #${leadId} · WhatsApp · ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })}_`,
    ].filter((l): l is string => !!l).join('\n'))

    await navigateTo(session, 'main', {})
    return [
      `✅ *¡Consulta registrada!*`,
      SEP,
      `Gracias *${nombre}*, recibimos tu consulta de alquiler.`,
      `Un miembro de nuestro equipo comercial se va a comunicar con vos a la brevedad.`,
      ``,
      `📞 También podés escribirnos nuevamente cuando quieras.`,
      SEP,
      `_Docks del Puerto 🏢_`,
    ].join('\n')
  } catch {
    return errorMsg('No se pudo registrar la consulta. Intentá nuevamente.')
  }
}

// ─── Flujo: Reclamo de locatario ─────────────────────────────────────────────

export function buildPublicReclamoP1(): string {
  return [
    `📢 *Reclamo de locatario*`,
    SEP,
    `Por favor, ¿cuál es tu *nombre* y el *número de tu local*?`,
    `(ej: _Carlos Rodríguez — Local 214_)`,
    SEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export async function handlePublicReclamoP1(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') return null
  if (input.trim().length < 3) {
    return `⚠️ Por favor ingresá tu nombre y número de local.\n\n${buildPublicReclamoP1()}`
  }
  await navigateTo(session, 'public_reclamo_p2', {
    pendingText: true,
    publicNombre: trimSafe(input),
  })
  return buildPublicReclamoP2()
}

export function buildPublicReclamoP2(): string {
  return [
    `📢 *Reclamo de locatario*`,
    SEP,
    `Describí brevemente el *problema o reclamo*:`,
    `(ej: _Falla la luz en el depósito desde ayer_)`,
    SEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export async function handlePublicReclamoP2(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') return null
  if (input.trim().length < 5) {
    return `⚠️ Por favor describí el problema.\n\n${buildPublicReclamoP2()}`
  }

  const { publicNombre } = session.contextData as Record<string, any>
  const nombre = String(publicNombre ?? 'Sin nombre')
  const phone  = fmtPhone(session.waNumber)

  try {
    const leadId = await crearLead({
      nombre,
      telefono: session.waNumber,
      waId: session.waNumber,
      rubro: 'reclamo_locatario',
      mensaje: trimSafe(input),
      fuente: 'whatsapp',
      estado: 'nuevo',
    })

    await notifyAdmins([
      `📢 *Reclamo de locatario*`,
      `🏢 Docks del Puerto`,
      SEP,
      `👤 *${nombre}*`,
      `📞 ${phone}`,
      `🔧 _"${trimSafe(input)}"_`,
      SEP,
      `_Lead #${leadId} · WhatsApp · ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })}_`,
    ].join('\n'))

    await navigateTo(session, 'main', {})
    return [
      `✅ *¡Reclamo registrado!*`,
      SEP,
      `Recibimos tu reclamo y lo vamos a derivar al área correspondiente.`,
      `Te vamos a contactar para informarte el estado.`,
      ``,
      `📞 Si es urgente, también podés llamar a administración.`,
      SEP,
      `_Docks del Puerto 🏢_`,
    ].join('\n')
  } catch {
    return errorMsg('No se pudo registrar el reclamo. Intentá nuevamente.')
  }
}

// ─── Flujo: Mensaje libre ─────────────────────────────────────────────────────

export function buildPublicMensajeP1(): string {
  return [
    `✉️  *Dejar un mensaje*`,
    SEP,
    `¿Cómo es tu nombre?`,
    SEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export async function handlePublicMensajeP1(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') return null
  if (input.trim().length < 2) {
    return `⚠️ Por favor ingresá tu nombre.\n\n${buildPublicMensajeP1()}`
  }
  await navigateTo(session, 'public_mensaje_p2', {
    pendingText: true,
    publicNombre: trimSafe(input),
  })
  return buildPublicMensajeP2(input.trim())
}

export function buildPublicMensajeP2(nombre?: string): string {
  return [
    `✉️  *Dejar un mensaje*`,
    SEP,
    `Hola${nombre ? ` *${nombre}*` : ''}! ¿Qué querés contarnos?`,
    `(Escribí tu mensaje y lo recibimos enseguida)`,
    SEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export async function handlePublicMensajeP2(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') return null
  if (input.trim().length < 3) {
    return `⚠️ El mensaje es muy corto. Por favor ingresá más detalle.\n\n${buildPublicMensajeP2()}`
  }

  const { publicNombre } = session.contextData as Record<string, any>
  const nombre = String(publicNombre ?? 'Sin nombre')
  const phone  = fmtPhone(session.waNumber)

  try {
    const leadId = await crearLead({
      nombre,
      telefono: session.waNumber,
      waId: session.waNumber,
      rubro: 'consulta',
      mensaje: trimSafe(input),
      fuente: 'whatsapp',
      estado: 'nuevo',
    })

    await notifyAdmins([
      `✉️ *Nuevo mensaje de contacto*`,
      `🏢 Docks del Puerto`,
      SEP,
      `👤 *${nombre}*`,
      `📞 ${phone}`,
      `💬 _"${trimSafe(input)}"_`,
      SEP,
      `_Lead #${leadId} · WhatsApp · ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })}_`,
    ].join('\n'))

    await navigateTo(session, 'main', {})
    return [
      `✅ *¡Mensaje recibido!*`,
      SEP,
      `Gracias *${nombre}*. Le vamos a dar respuesta a la brevedad.`,
      ``,
      `📞 Si necesitás algo más, escribinos cuando quieras.`,
      SEP,
      `_Docks del Puerto 🏢_`,
    ].join('\n')
  } catch {
    return errorMsg('No se pudo enviar el mensaje. Intentá nuevamente.')
  }
}

// ─── Notificación a admins ────────────────────────────────────────────────────

async function notifyAdmins(message: string): Promise<void> {
  try {
    const users = await getUsers()
    const admins = users.filter((u: any) => u.role === 'admin' && u.waId && u.activo)
    for (const admin of admins) {
      await enqueueBotMessage(String(admin.waId), message)
    }
  } catch {
    // Notificación no crítica — si falla no rompemos el flujo
  }
}
