import {
  getSession, createSession, updateSession,
  navigateTo, navigateBack, resetToMain,
  isSessionExpired, EventosSession,
} from './session'
import {
  buildEventosWelcome, buildEventosMainMenu, buildEventosHelp,
  buildUbicacionInfo,
  buildSalirMessage, DSEP,
} from './menus/bienvenida'
import {
  buildConsultaP1, handleConsultaP1,
  buildConsultaP2, handleConsultaP2, handleConsultaP2Otro,
  buildConsultaP3, handleConsultaP3,
  buildConsultaP4, handleConsultaP4,
  buildConsultaP5, handleConsultaP5,
  buildConsultaP6, handleConsultaP6,
  buildConsultaP7, handleConsultaP7,
  buildConsultaConfirmar, handleConsultaConfirmar,
} from './menus/consulta'
import { calcularEventoScore, getEventoTemperature, EventoLeadTemperature } from './scoring'
import { crearLead, getUsers, enqueueBotMessage } from '../db'

function normalizeInput(raw: string): string {
  return raw.trim().toLowerCase()
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

function buildClosingByTemperature(temperature: EventoLeadTemperature, nombre: string): string {
  const n = nombre && nombre !== 'Visitante' ? ` *${nombre}*` : ''
  switch (temperature) {
    case 'hot':
      return [
        `🔥 *¡Tu consulta fue registrada!*`,
        DSEP,
        `Gracias${n}. Tu evento tiene todo para ser increíble`,
        `y Docks Eventos es el lugar perfecto. 🎉`,
        ``,
        `Un asesor te va a contactar *hoy* para`,
        `coordinar una visita personalizada al salón.`,
        DSEP,
        `_Docks Eventos · Salón exclusivo · Tigre_ ✨`,
      ].join('\n')
    case 'warm':
      return [
        `✅ *¡Consulta registrada!*`,
        DSEP,
        `Gracias${n}. Te contactamos a la brevedad`,
        `para mostrarte el salón y armar una propuesta`,
        `a medida de tu evento. 🎉`,
        DSEP,
        `_Docks Eventos · Tigre_ ✨`,
      ].join('\n')
    default:
      return [
        `✅ *Consulta registrada*`,
        DSEP,
        `Gracias${n}. Registramos tu consulta.`,
        `Cuando estés más cerca de la fecha,`,
        `nuestro equipo te va a estar esperando. 🎉`,
        DSEP,
        `_Docks Eventos · Tigre_ ✨`,
      ].join('\n')
  }
}

async function notifyAdmins(message: string): Promise<void> {
  try {
    const users = await getUsers()
    const admins = users.filter((u: any) => u.role === 'admin' && u.waId && u.activo)
    const notified = new Set<string>()
    for (const admin of admins) {
      const normalized = String(admin.waId).replace(/\D/g, '')
      if (!normalized || notified.has(normalized)) continue
      notified.add(normalized)
      await enqueueBotMessage(normalized, message)
    }
  } catch {
    // Non-critical: lead already saved
  }
}

async function processConfirmation(session: EventosSession): Promise<string> {
  const ctx = session.contextData
  const nombre = String(ctx.nombre ?? 'Visitante')
  const tipoEvento = String(ctx.tipoEvento ?? '')
  const fechaEstimada = String(ctx.fechaEstimada ?? '')
  const cantidadInvitados = String(ctx.cantidadInvitados ?? '')
  const presupuesto = String(ctx.presupuesto ?? '')
  const servicios = (ctx.serviciosExtra ?? []) as string[]
  const seguimiento = String(ctx.seguimiento ?? '')
  const phone = fmtPhone(session.waNumber)

  const score = calcularEventoScore({ tipoEvento, fechaEstimada, cantidadInvitados, presupuesto, seguimiento })
  const temperature = getEventoTemperature(score)
  const tempEmoji: Record<EventoLeadTemperature, string> = { hot: '🔥', warm: '🌡️', cold: '❄️' }

  const mensaje = [
    `Evento: ${tipoEvento}`,
    `Fecha: ${fechaEstimada}`,
    `Invitados: ${cantidadInvitados}`,
    presupuesto ? `Presupuesto: ${presupuesto}` : null,
    servicios.length > 0 ? `Servicios: ${servicios.join(', ')}` : null,
    `Seguimiento: ${seguimiento}`,
  ].filter(Boolean).join(' | ')

  try {
    const { id: leadId, created } = await crearLead({
      nombre,
      telefono: session.waNumber,
      waId: session.waNumber,
      rubro: tipoEvento || 'evento',
      mensaje,
      fuente: 'whatsapp_eventos' as any,
      estado: 'nuevo',
      score,
      temperature,
      lastBotMsgAt: new Date(),
    } as any)

    if (created) {
      const urgencyLine = temperature === 'hot'
        ? `⚡ _Contactar en los próximos 15 minutos_`
        : temperature === 'warm'
          ? `⏰ _Contactar hoy_`
          : null

      await notifyAdmins([
        `${tempEmoji[temperature]} *Nueva consulta de evento* · Score: ${score}/100`,
        `🎉 Docks Eventos`,
        DSEP,
        `👤 *${nombre}*`,
        `📞 ${phone}`,
        `🎂 Evento: *${tipoEvento}*`,
        `📅 Fecha: ${fechaEstimada}`,
        `👥 Invitados: ${cantidadInvitados}`,
        presupuesto ? `💰 Presupuesto: ${presupuesto}` : null,
        servicios.length > 0 ? `🎯 Servicios: ${servicios.join(', ')}` : null,
        `📌 ${seguimiento}`,
        urgencyLine,
        DSEP,
        `_Lead #${leadId} · WhatsApp Eventos · ${nowAr()}_`,
      ].filter((l): l is string => !!l).join('\n'))
    }

    await resetToMain(session)
    return buildClosingByTemperature(temperature, nombre)
  } catch {
    return `❌ No se pudo registrar tu consulta. Por favor intentá nuevamente.`
  }
}

async function routeMessage(session: EventosSession, input: string): Promise<string> {
  const menu = session.currentMenu
  const normalized = normalizeInput(input)

  // Global commands
  if (normalized === 'menú' || normalized === 'menu' || normalized === 'inicio') {
    await resetToMain(session)
    return buildEventosMainMenu()
  }
  if (normalized === 'ayuda' || normalized === 'help') {
    return buildEventosHelp()
  }

  switch (menu) {
    case 'main': {
      if (input === '1') {
        await navigateTo(session, 'consulta_p1', { pendingText: true })
        return buildConsultaP1()
      }
      if (input === '2') {
        await navigateTo(session, 'consulta_p1', { pendingText: true, seguimientoIntent: 'visita' })
        return buildConsultaP1()
      }
      if (input === '3') {
        await navigateTo(session, 'ubicacion', {})
        return buildUbicacionInfo()
      }
      if (input === '0') {
        return buildSalirMessage()
      }
      return `❓ Opción no válida.\n\n${buildEventosMainMenu()}`
    }

    case 'ubicacion': {
      if (input === '0') {
        await resetToMain(session)
        return buildEventosMainMenu()
      }
      if (input === '1') {
        await navigateTo(session, 'consulta_p1', { pendingText: true })
        return buildConsultaP1()
      }
      if (input === '2') {
        await navigateTo(session, 'consulta_p1', { pendingText: true, seguimientoIntent: 'visita' })
        return buildConsultaP1()
      }
      await resetToMain(session)
      return buildEventosMainMenu()
    }

    // Consulta flow
    case 'consulta_p1': {
      const result = await handleConsultaP1(session, input)
      if (result === null) { await resetToMain(session); return buildEventosMainMenu() }
      return result
    }
    case 'consulta_p2': {
      const result = await handleConsultaP2(session, input)
      if (result === null) { await resetToMain(session); return buildEventosMainMenu() }
      return result
    }
    case 'consulta_p2_otro': {
      const result = await handleConsultaP2Otro(session, input)
      if (result === null) { await resetToMain(session); return buildEventosMainMenu() }
      return result
    }
    case 'consulta_p3': {
      const result = await handleConsultaP3(session, input)
      if (result === null) { await resetToMain(session); return buildEventosMainMenu() }
      return result
    }
    case 'consulta_p4': {
      const result = await handleConsultaP4(session, input)
      if (result === null) { await resetToMain(session); return buildEventosMainMenu() }
      return result
    }
    case 'consulta_p5': {
      const result = await handleConsultaP5(session, input)
      if (result === null) { await resetToMain(session); return buildEventosMainMenu() }
      return result
    }
    case 'consulta_p6': {
      const result = await handleConsultaP6(session, input)
      if (result === null) { await resetToMain(session); return buildEventosMainMenu() }
      return result
    }
    case 'consulta_p7': {
      const result = await handleConsultaP7(session, input)
      if (result === null) { await resetToMain(session); return buildEventosMainMenu() }
      return result
    }
    case 'consulta_confirmar': {
      const result = await handleConsultaConfirmar(session, input)
      if (result === null) { await resetToMain(session); return buildEventosMainMenu() }
      if (result === '__CONFIRM_CONSULTA__') return processConfirmation(session)
      return result
    }

    default: {
      await resetToMain(session)
      return buildEventosMainMenu()
    }
  }
}

export async function handleEventosMessage(waNumber: string, rawMessage: string): Promise<string> {
  const input = rawMessage.trim()
  if (!input) return buildEventosMainMenu()

  let session = await getSession(waNumber)

  if (!session) {
    session = await createSession(waNumber)
    const welcome = buildEventosWelcome()
    const greetings = ['hola', 'hi', 'hello', 'buenas', 'buen dia', 'buenos dias', 'buen día', 'buenos días']
    if (greetings.includes(normalizeInput(input))) {
      return welcome
    }
    return welcome
  }

  if (isSessionExpired(session)) {
    await resetToMain(session)
    session = { ...session, currentMenu: 'main', contextData: {}, menuHistory: [] }
    return [
      `⏰ _Tu sesión expiró por inactividad._`,
      ``,
      buildEventosMainMenu(),
    ].join('\n')
  }

  await updateSession(waNumber, {})

  return routeMessage(session, input)
}
