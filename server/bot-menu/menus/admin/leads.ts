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
    )
  })

  lines.push(SEP)
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
  if (input === '0') return null as any

  const opt = parseMenuOption(input, paged.items.length)
  if (!opt) return invalidOption(await buildAdminLeadsSinAsignar(session))

  const lead = paged.items[opt - 1]
  await navigateTo(session, 'admin_lead_detalle', { leadId: lead.id })
  return buildAdminLeadDetalle(lead)
}

// ─── admin_lead_detalle ───────────────────────────────────────────────────────

function buildAdminLeadDetalle(lead: any): string {
  return [
    `🎯 *Lead: ${lead.nombre ?? 'Sin nombre'}*`,
    `📞 Teléfono: ${lead.telefono ?? '—'}`,
    `🏪 Rubro: ${lead.rubro ?? '—'}`,
    `🏢 Tipo local: ${lead.tipoLocal ?? '—'}`,
    lead.mensaje ? `💬 Mensaje: "${lead.mensaje}"` : null,
    `📌 Estado: ${estadoLeadEmoji(lead.estado)} ${lead.estado}`,
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
    const mensaje = [
      `🎯 *Te asignaron un lead — Docks del Puerto*`,
      ``,
      `👤 *${lead.nombre ?? 'Sin nombre'}*`,
      `🏪 Rubro: ${lead.rubro ?? '—'}`,
      lead.mensaje ? `💬 "${lead.mensaje}"` : null,
      ``,
      `Podés ver el detalle y agregar notas desde el menú del bot (opción Mis leads).`,
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
