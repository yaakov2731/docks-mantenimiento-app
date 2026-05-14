/**
 * Menu para leads que responden a follow-ups automaticos — Docks del Puerto
 *
 * Cuando un lead que recibio mensajes automaticos responde,
 * se le muestra este menu personalizado en lugar del menu publico generico.
 */

import { BotSession, navigateTo } from '../../session'
import { getLeadByWaId, flagLeadNeedsAttention, actualizarLead } from '../../../db'

export function buildLeadRespondioMenu(nombre: string): string {
  const saludo = nombre && nombre !== 'Sin nombre' ? nombre : 'ahi'
  return (
    `👋 *¡Hola, ${saludo}!* Gracias por responder.\n\n` +
    `Nos alegra saber de vos. ¿En qué te podemos ayudar hoy?\n\n` +
    `1️⃣ Quiero coordinar una visita al predio\n` +
    `2️⃣ Tengo preguntas sobre los espacios\n` +
    `3️⃣ Quiero hablar con un asesor ahora\n` +
    `4️⃣ Ya no me interesa por ahora\n\n` +
    `_Respondé con el número de tu opción_ 👇`
  )
}

export async function handleLeadRespondio(session: BotSession, input: string): Promise<string | null> {
  const leadId = session.contextData.leadId as number | undefined
  if (!leadId) return null

  if (input === '1') {
    await navigateTo(session, 'lead_visita', { leadId })
    return (
      `📅 *¡Perfecto!* Vamos a coordinar tu visita.\n\n` +
      `¿Cuándo preferís venir? Escribí un día o fecha que te venga bien\n` +
      `_(ej: "lunes", "el 10 de mayo", "esta semana")_\n\n` +
      `Un asesor confirmará el horario a la brevedad 🏢`
    )
  }

  if (input === '2') {
    await navigateTo(session, 'lead_consulta', { leadId })
    return (
      `❓ *Con gusto te respondemos.*\n\n` +
      `Escribí tu consulta y un asesor especializado te responderá a la brevedad 👇`
    )
  }

  if (input === '3') {
    await flagLeadNeedsAttention(leadId, '⚡ Pidió hablar con un asesor urgente')
    await actualizarLead(leadId, { estado: 'contactado' } as any)
    return (
      `✅ *¡Listo!* Un asesor se va a comunicar con vos en breve.\n\n` +
      `Dejamos tu número registrado como *prioritario*.\n` +
      `Te contactamos a la brevedad ⚡\n\n` +
      `_Docks del Puerto · Puerto de Frutos, Tigre_ 🏢`
    )
  }

  if (input === '4') {
    await flagLeadNeedsAttention(leadId, '❌ Indicó que ya no le interesa')
    await actualizarLead(leadId, { estado: 'descartado' } as any)
    return (
      `👍 *Entendido, no hay problema.*\n\n` +
      `Si en el futuro querés retomar la consulta o conocer los espacios, estamos disponibles.\n\n` +
      `_Docks del Puerto · Puerto de Frutos, Tigre_ 🏢`
    )
  }

  // Unrecognized input — re-show menu
  const lead = await getLeadByWaId(session.waNumber)
  return buildLeadRespondioMenu(lead?.nombre ?? 'ahi')
}

export async function handleLeadVisita(session: BotSession, input: string): Promise<string> {
  const leadId = session.contextData.leadId as number
  const intent = `📅 Quiere visitar: "${input}"`
  await flagLeadNeedsAttention(leadId, intent)
  await actualizarLead(leadId, { estado: 'contactado' } as any)
  return (
    `✅ *¡Anotado!* Recibimos tu preferencia: _"${input}"_\n\n` +
    `Un asesor de Docks del Puerto te va a contactar para confirmar el horario.\n\n` +
    `¡Hasta pronto! 🏢`
  )
}

export async function handleLeadConsulta(session: BotSession, input: string): Promise<string> {
  const leadId = session.contextData.leadId as number
  const intent = `💬 Consulta: "${input}"`
  await flagLeadNeedsAttention(leadId, intent)
  await actualizarLead(leadId, { estado: 'contactado' } as any)
  return (
    `✅ *Recibimos tu consulta.*\n\n` +
    `Un asesor va a revisar tu mensaje y te responderá a la brevedad.\n\n` +
    `_Docks del Puerto · Puerto de Frutos, Tigre_ 🏢`
  )
}
