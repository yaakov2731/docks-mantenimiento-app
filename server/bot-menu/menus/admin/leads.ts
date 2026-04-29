/**
 * Flujo de Leads para administradores/gerentes.
 * admin_leads_sin_asignar → admin_lead_detalle → admin_lead_elegir_vendedor → admin_lead_confirmar
 */
import { BotSession, navigateTo } from '../../session'
import { SEP, parseMenuOption, invalidOption, paginate, errorMsg } from '../../shared/guards'
import {
  listUnassignedLeads,
  getLeadById,
  getSalesUsers,
  actualizarLead,
  enqueueBotMessage,
  getAppConfig,
  setAppConfig,
} from '../../../db'

const PAGE_SIZE = 5

function estadoLeadEmoji(estado: string): string {
  switch (estado) {
    case 'nuevo':      return '🆕'
    case 'contactado': return '📞'
    case 'visito':     return '🏢'
    case 'cerrado':    return '✅'
    case 'descartado': return '❌'
    default:           return '⚪'
  }
}

function formatLeadDateTime(value: unknown): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value as string | number)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatLeadElapsed(fromValue: unknown, toValue: unknown = new Date()): string {
  if (!fromValue) return '—'
  const from = fromValue instanceof Date ? fromValue : new Date(fromValue as string | number)
  const to = toValue instanceof Date ? toValue : new Date(toValue as string | number)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return '—'
  const minutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 24) return rest ? `${hours}h ${rest}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`
}

// ─── admin_leads_sin_asignar ──────────────────────────────────────────────────

export async function buildAdminLeadsSinAsignar(session: BotSession): Promise<string> {
  const leads = await listUnassignedLeads()
  if (leads.length === 0) {
    return [
      `🎯 *Leads sin asignar*`,
      SEP,
      `✅ No hay leads pendientes de asignación.`,
      SEP,
      `0️⃣  Volver`,
    ].join('\n')
  }

  const page = session.contextData.page ?? 1
  const paged = paginate(leads, page, PAGE_SIZE)
  const lines = [
    `🎯 *Leads sin asignar* (${leads.length})`,
    SEP,
  ]

  paged.items.forEach((lead, index) => {
    const num = (page - 1) * PAGE_SIZE + index + 1
    lines.push(
      `${num}️⃣  *${lead.nombre ?? 'Sin nombre'}* — ${lead.rubro ?? '—'}`,
      `   ${estadoLeadEmoji(lead.estado)} ${lead.estado} | ${lead.telefono ?? '—'}`,
      `   🕒 Recibido: ${formatLeadDateTime(lead.createdAt)} | sin respuesta ${formatLeadElapsed(lead.createdAt)}`,
    )
  })

  const activo = (await getAppConfig('bot_autoresponder_activo')) !== '0'
  lines.push(SEP)
  lines.push(`🤖  *7*  →  Bot autorespuesta: ${activo ? '🟢 Activo' : '⏸️ Inactivo'}`)
  if (paged.hasPrev) lines.push(`8️⃣  ◀️ Anterior`)
  if (paged.hasNext) lines.push(`9️⃣  ▶️ Ver más`)
  lines.push(`0️⃣  Volver`)

  return lines.join('\n')
}

export async function handleAdminLeadsSinAsignar(session: BotSession, input: string): Promise<string> {
  const leads = await listUnassignedLeads()
  const page = session.contextData.page ?? 1
  const paged = paginate(leads, page, PAGE_SIZE)

  if (input === '8' && paged.hasPrev) {
    await navigateTo(session, 'admin_leads_sin_asignar', { page: page - 1 })
    return buildAdminLeadsSinAsignar({ ...session, contextData: { page: page - 1 } })
  }
  if (input === '9' && paged.hasNext) {
    await navigateTo(session, 'admin_leads_sin_asignar', { page: page + 1 })
    return buildAdminLeadsSinAsignar({ ...session, contextData: { page: page + 1 } })
  }
  if (input === '7') {
    await navigateTo(session, 'admin_bot_autorespuesta', {})
    return buildAdminBotAutorespuesta()
  }
  if (input === '0') return null as any

  const opt = parseMenuOption(input, paged.items.length)
  if (!opt) return invalidOption(await buildAdminLeadsSinAsignar(session))

  const lead = paged.items[opt - 1]
  await navigateTo(session, 'admin_lead_detalle', { leadId: lead.id })
  return buildAdminLeadDetalle(lead)
}

// ─── admin_lead_detalle ───────────────────────────────────────────────────────

export function buildAdminLeadDetalleDisplay(lead: any): string {
  return buildAdminLeadDetalle(lead)
}

function buildAdminLeadDetalle(lead: any): string {
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
    SEP,
    `1️⃣  👤 Asignar a vendedor`,
    `0️⃣  Volver`,
  ].filter(Boolean).join('\n')
}

export async function handleAdminLeadDetalle(session: BotSession, input: string): Promise<string> {
  const leadId = Number(session.contextData.leadId)
  if (!Number.isFinite(leadId)) return errorMsg('No se encontró el lead.')

  if (input === '1') {
    const vendedores = await getSalesUsers()
    const soloVentas = vendedores.filter((u: any) => u.role === 'sales')
    await navigateTo(session, 'admin_lead_elegir_vendedor', { leadId, vendedoresIds: soloVentas.map((v: any) => v.id) })
    return buildAdminLeadElegirVendedor(soloVentas)
  }
  if (input === '0') return null as any

  const lead = await getLeadById(leadId)
  if (!lead) return errorMsg('Lead no encontrado.')
  return invalidOption(buildAdminLeadDetalle(lead))
}

// ─── admin_lead_elegir_vendedor ───────────────────────────────────────────────

function buildAdminLeadElegirVendedor(vendedores: any[]): string {
  if (vendedores.length === 0) {
    return [
      `👤 *Elegí un vendedor*`,
      SEP,
      `⚠️ No hay vendedores disponibles.`,
      SEP,
      `0️⃣  Volver`,
    ].join('\n')
  }

  const lines = [`👤 *Elegí un vendedor*`, SEP]
  vendedores.forEach((v, i) => {
    lines.push(`${i + 1}️⃣  ${v.name ?? v.username}`)
  })
  lines.push(SEP, `0️⃣  Volver`)
  return lines.join('\n')
}

export async function handleAdminLeadElegirVendedor(session: BotSession, input: string): Promise<string> {
  if (input === '0') return null as any

  const vendedores = await getSalesUsers().then((us: any[]) => us.filter((u: any) => u.role === 'sales'))
  const opt = parseMenuOption(input, vendedores.length)
  if (!opt) return invalidOption(buildAdminLeadElegirVendedor(vendedores))

  const vendedor = vendedores[opt - 1]
  const leadId = Number(session.contextData.leadId)
  const lead = await getLeadById(leadId)
  if (!lead) return errorMsg('Lead no encontrado.')

  await navigateTo(session, 'admin_lead_confirmar', { leadId, vendedorId: vendedor.id, vendedorNombre: vendedor.name ?? vendedor.username })
  return buildAdminLeadConfirmar(lead, vendedor)
}

// ─── admin_lead_confirmar ─────────────────────────────────────────────────────

function buildAdminLeadConfirmar(lead: any, vendedor: any): string {
  return [
    `✅ *Confirmar asignación*`,
    SEP,
    `Lead: *${lead.nombre ?? 'Sin nombre'}* (${lead.rubro ?? '—'})`,
    `Vendedor: *${vendedor.name ?? vendedor.username}*`,
    SEP,
    `1️⃣  Confirmar`,
    `2️⃣  Cancelar`,
  ].join('\n')
}

export async function handleAdminLeadConfirmar(session: BotSession, input: string): Promise<string> {
  if (input === '2' || input === '0') {
    await navigateTo(session, 'admin_leads_sin_asignar', { page: 1 })
    return buildAdminLeadsSinAsignar({ ...session, contextData: { page: 1 } })
  }

  if (input !== '1') {
    const leadId = Number(session.contextData.leadId)
    const vendedorId = Number(session.contextData.vendedorId)
    const vendedorNombre = String(session.contextData.vendedorNombre ?? '')
    const lead = await getLeadById(leadId)
    const vendedores = await getSalesUsers().then((us: any[]) => us.filter((u: any) => u.role === 'sales'))
    const vendedor = vendedores.find((v: any) => v.id === vendedorId) ?? { name: vendedorNombre }
    if (!lead) return errorMsg('Lead no encontrado.')
    return invalidOption(buildAdminLeadConfirmar(lead, vendedor))
  }

  const leadId = Number(session.contextData.leadId)
  const vendedorId = Number(session.contextData.vendedorId)
  const vendedorNombre = String(session.contextData.vendedorNombre ?? '')

  const lead = await getLeadById(leadId)
  if (!lead) return errorMsg('Lead no encontrado.')

  const vendedores = await getSalesUsers()
  const vendedor = vendedores.find((u: any) => u.id === vendedorId)

  await actualizarLead(leadId, {
    asignadoId: vendedorId,
    asignadoA: vendedorNombre,
  })

  if (vendedor?.waId) {
    const tempEmoji = { hot: '🔥', warm: '🌡️', cold: '❄️', not_fit: '⚫' }
    const tempLabel = { hot: 'Caliente', warm: 'Tibio', cold: 'Frío', not_fit: 'No aplica' }
    const temp = lead.temperature ?? 'warm'

    const mensaje = [
      `🎯 *Te asignaron un lead — Docks del Puerto*`,
      ``,
      `👤 *${lead.nombre ?? 'Sin nombre'}*`,
      lead.telefono ? `📞 ${lead.telefono}` : null,
      lead.rubro ? `🏪 Rubro: ${lead.rubro}` : null,
      lead.tipoLocal ? `🏬 Tipo de espacio: ${lead.tipoLocal}` : null,
      `${tempEmoji[temp as keyof typeof tempEmoji] ?? '🌡️'} Temperatura: ${tempLabel[temp as keyof typeof tempLabel] ?? temp}`,
      lead.mensaje ? `💬 "${lead.mensaje}"` : null,
      ``,
      `Respondé *"mis leads"* para ver el detalle y agregar notas.`,
      ``,
      `🔑 Lead #${leadId}`,
    ].filter(Boolean).join('\n')
    await enqueueBotMessage(vendedor.waId, mensaje)
  }

  await navigateTo(session, 'admin_leads_sin_asignar', { page: 1 })
  return [
    `✅ *Lead #${leadId} asignado a ${vendedorNombre}.*`,
    vendedor?.waId ? `📱 Se notificó al vendedor por WhatsApp.` : `⚠️ El vendedor no tiene WhatsApp registrado.`,
    SEP,
    `0️⃣  Volver`,
  ].join('\n')
}

// ─── admin_bot_autorespuesta ──────────────────────────────────────────────────

export async function buildAdminBotAutorespuesta(): Promise<string> {
  const activo = (await getAppConfig('bot_autoresponder_activo')) !== '0'
  const delay1 = await getAppConfig('followup1_delay_min') ?? '30'
  const delay2 = await getAppConfig('followup2_delay_horas') ?? '4'
  return [
    `🤖 *Bot Autorespuesta — Docks del Puerto*`,
    SEP,
    `Estado actual: ${activo ? '🟢 *ACTIVO*' : '⏸️ *INACTIVO*'}`,
    ``,
    `📨 Mensaje 1 → a los *${delay1} min*`,
    `📨 Mensaje 2 → a las *${delay2} h*`,
    SEP,
    activo ? `1️⃣  ⏸️ Desactivar` : `1️⃣  ▶️ Activar`,
    `0️⃣  Volver`,
  ].join('\n')
}

export async function handleAdminBotAutorespuesta(session: BotSession, input: string): Promise<string> {
  if (input === '0') return null as any

  if (input === '1') {
    const activo = (await getAppConfig('bot_autoresponder_activo')) !== '0'
    await setAppConfig('bot_autoresponder_activo', activo ? '0' : '1')
    const nuevoEstado = !activo
    await navigateTo(session, 'admin_leads_sin_asignar', { page: 1 })
    return [
      nuevoEstado ? `✅ *Bot autorespuesta activado.*` : `⏸️ *Bot autorespuesta desactivado.*`,
      ``,
      `Los seguimientos automáticos quedaron ${nuevoEstado ? 'habilitados' : 'suspendidos'}.`,
      SEP,
      `0️⃣  Volver`,
    ].join('\n')
  }

  return invalidOption(await buildAdminBotAutorespuesta())
}
