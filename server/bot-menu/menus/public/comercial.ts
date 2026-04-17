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

import { BotSession, navigateTo, navigateBack } from '../../session'
import { SEP, confirmMsg, errorMsg } from '../../shared/guards'
import { crearLead, getUsers, enqueueBotMessage } from '../../../db'

// ─── Menú principal público ────────────────────────────────────────────────────

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

// ─── Flujo: Consulta de alquiler ──────────────────────────────────────────────

export function buildPublicAlquilerP1(): string {
  return [
    `🏪 *Consulta de alquiler*`,
    SEP,
    `Por favor, escribí tu *nombre completo* y tu *número de teléfono*`,
    `(podés ponerlos juntos en un mensaje, ej: _Ana García — 11 2345-6789_)`,
    SEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export async function handlePublicAlquilerP1(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') return null
  if (input.trim().length < 3) {
    return `⚠️ Por favor ingresá tu nombre y contacto.\n\n${buildPublicAlquilerP1()}`
  }
  await navigateTo(session, 'public_alquiler_p2', {
    pendingText: true,
    publicNombre: input.trim(),
  })
  return buildPublicAlquilerP2()
}

export function buildPublicAlquilerP2(): string {
  return [
    `🏪 *Consulta de alquiler*`,
    SEP,
    `¿Cuál es tu consulta o tipo de local que te interesa?`,
    `(ej: _Busco local de 50m² para gastronomía_)`,
    SEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export async function handlePublicAlquilerP2(session: BotSession, input: string): Promise<string | null> {
  if (input === '0') return null
  if (input.trim().length < 3) {
    return `⚠️ Por favor describí tu consulta.\n\n${buildPublicAlquilerP2()}`
  }

  const { publicNombre } = session.contextData as Record<string, any>
  try {
    const leadId = await crearLead({
      nombre: String(publicNombre ?? 'Sin nombre'),
      telefono: String(publicNombre ?? ''),
      waId: session.waNumber,
      rubro: 'alquiler',
      mensaje: input.trim(),
      fuente: 'whatsapp',
      estado: 'nuevo',
    })
    await notifyAdmins(
      `🏪 *Nueva consulta de alquiler* (#${leadId})\n` +
      `👤 ${publicNombre}\n📱 ${session.waNumber}\n💬 ${input.trim()}`
    )
    await navigateTo(session, 'main', {})
    return [
      `✅ *¡Consulta registrada!*`,
      SEP,
      `Recibimos tu consulta de alquiler.`,
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

// ─── Flujo: Reclamo de locatario ──────────────────────────────────────────────

export function buildPublicReclamoP1(): string {
  return [
    `📢 *Reclamo de locatario*`,
    SEP,
    `Por favor, escribí tu *nombre* y el *número de tu local*`,
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
    publicNombre: input.trim(),
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
  try {
    const leadId = await crearLead({
      nombre: String(publicNombre ?? 'Sin nombre'),
      waId: session.waNumber,
      rubro: 'reclamo_locatario',
      mensaje: input.trim(),
      fuente: 'whatsapp',
      estado: 'nuevo',
    })
    await notifyAdmins(
      `📢 *Nuevo reclamo de locatario* (#${leadId})\n` +
      `👤 ${publicNombre}\n📱 ${session.waNumber}\n🔧 ${input.trim()}`
    )
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
    publicNombre: input.trim(),
  })
  return buildPublicMensajeP2(input.trim())
}

export function buildPublicMensajeP2(nombre?: string): string {
  return [
    `✉️  *Dejar un mensaje*`,
    SEP,
    `Hola${nombre ? ` ${nombre}` : ''}! ¿Qué querés contarnos?`,
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
  try {
    const leadId = await crearLead({
      nombre: String(publicNombre ?? 'Sin nombre'),
      waId: session.waNumber,
      rubro: 'consulta',
      mensaje: input.trim(),
      fuente: 'whatsapp',
      estado: 'nuevo',
    })
    await notifyAdmins(
      `✉️ *Nuevo mensaje* (#${leadId})\n` +
      `👤 ${publicNombre}\n📱 ${session.waNumber}\n💬 ${input.trim()}`
    )
    await navigateTo(session, 'main', {})
    return [
      `✅ *¡Mensaje recibido!*`,
      SEP,
      `Gracias ${publicNombre}. Le vamos a dar respuesta a la brevedad.`,
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
