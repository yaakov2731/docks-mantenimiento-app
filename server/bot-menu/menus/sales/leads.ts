/**
 * Flujo de Leads para el equipo de ventas.
 * sales_leads → sales_lead_detalle | sales_nuevo_lead_*
 */
import { BotSession, navigateTo, navigateBack } from '../../session'
import { SEP, parseMenuOption, invalidOption, paginate, errorMsg, confirmMsg } from '../../shared/guards'
import { crearLead, listUnassignedLeads, actualizarLead } from '../../../db'
import { notifyOwner } from '../../../_core/notification'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { eq, and } from 'drizzle-orm'
import * as schema from '../../../../drizzle/schema'
import { readEnv } from '../../../_core/env'

const cl = createClient({ url: readEnv('TURSO_URL')!, authToken: readEnv('TURSO_TOKEN')! })
const db = drizzle(cl, { schema })

const PAGE_SIZE = 5

// ─── Helpers ──────────────────────────────────────────────────────────────────

function estadoLeadEmoji(estado: string): string {
  switch (estado) {
    case 'nuevo':       return '🆕'
    case 'contactado':  return '📞'
    case 'visito':      return '🏢'
    case 'cerrado':     return '✅'
    case 'descartado':  return '❌'
    default:            return '⚪'
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

async function getMisLeads(userId: number) {
  const todos = await db.select().from(schema.leads).where(eq(schema.leads.asignadoId, userId))
  return todos.sort((a, b) => {
    const rank: Record<string, number> = { nuevo: 4, contactado: 3, visito: 2, cerrado: 1, descartado: 0 }
    return (rank[b.estado] ?? 0) - (rank[a.estado] ?? 0)
  })
}

// ─── Lista de leads ───────────────────────────────────────────────────────────

export async function buildLeadsLista(session: BotSession): Promise<string> {
  const leads = await getMisLeads(session.userId)
  const activos = leads.filter(l => !['cerrado', 'descartado'].includes(l.estado))

  if (leads.length === 0) {
    return [
      `🎯 *Mis leads*`,
      SEP,
      `No tenés leads asignados todavía.`,
      SEP,
      `0️⃣  Volver`,
    ].join('\n')
  }

  const page = session.contextData.page ?? 1
  const paged = paginate(leads, page, PAGE_SIZE)
  const lines = [
    `🎯 *Mis leads* (${activos.length} activo${activos.length !== 1 ? 's' : ''})`,
    SEP,
  ]

  paged.items.forEach((l, i) => {
    const n = i + 1
    const contacto = l.telefono ?? l.email ?? l.waId ?? '—'
    lines.push(
      `${n}️⃣  ${estadoLeadEmoji(l.estado)} *${l.nombre}*`,
      `   📞 ${contacto} | ${l.rubro ?? 'Sin rubro'} | ${l.estado}`,
      `   🕒 Recibido: ${formatLeadDateTime(l.createdAt)} | ${l.firstContactedAt ? `respondido en ${formatLeadElapsed(l.createdAt, l.firstContactedAt)}` : `sin respuesta ${formatLeadElapsed(l.createdAt)}`}`,
    )
  })

  lines.push(SEP)
  if (paged.hasPrev) lines.push(`8️⃣  ◀️ Anterior`)
  if (paged.hasNext) lines.push(`9️⃣  ▶️ Ver más`)
  lines.push(`0️⃣  Volver`)
  return lines.join('\n')
}

export async function handleLeadsLista(session: BotSession, input: string): Promise<string> {
  const leads = await getMisLeads(session.userId)
  const page = session.contextData.page ?? 1
  const paged = paginate(leads, page, PAGE_SIZE)

  if (input === '8' && paged.hasPrev) {
    await navigateTo(session, 'sales_leads', { page: page - 1 })
    return buildLeadsLista({ ...session, contextData: { page: page - 1 } })
  }
  if (input === '9' && paged.hasNext) {
    await navigateTo(session, 'sales_leads', { page: page + 1 })
    return buildLeadsLista({ ...session, contextData: { page: page + 1 } })
  }
  if (input === '0') return null as any

  const opt = parseMenuOption(input, paged.items.length)
  if (!opt) return invalidOption(await buildLeadsLista(session))

  const lead = paged.items[opt - 1]
  await navigateTo(session, 'sales_lead_detalle', { leadId: lead.id })
  return buildLeadDetalle(lead)
}

// ─── Detalle de lead ──────────────────────────────────────────────────────────

function buildLeadDetalle(lead: any): string {
  const lines = [
    `🎯 *Lead #${lead.id}*`,
    SEP,
    `👤 *${lead.nombre}*`,
    lead.telefono ? `📞 ${lead.telefono}` : '',
    lead.email    ? `📧 ${lead.email}` : '',
    lead.rubro    ? `🏪 Rubro: ${lead.rubro}` : '',
    lead.tipoLocal ? `🏢 Tipo de local: ${lead.tipoLocal}` : '',
    lead.mensaje  ? `💬 Consulta: ${lead.mensaje}` : '',
    `🕒 Recibido: ${formatLeadDateTime(lead.createdAt)}`,
    lead.firstContactedAt
      ? `✅ Primer contacto: ${formatLeadDateTime(lead.firstContactedAt)} (${formatLeadElapsed(lead.createdAt, lead.firstContactedAt)})`
      : `⏳ Sin respuesta hace ${formatLeadElapsed(lead.createdAt)}`,
    SEP,
    `Estado: ${estadoLeadEmoji(lead.estado)} *${lead.estado}*`,
    lead.notas ? `📝 Notas: ${lead.notas}` : '',
    SEP,
    `1️⃣  📞 Marcar como contactado`,
    `2️⃣  🏢 Marcar que visitó`,
    `3️⃣  ✅ Cerrar (negocio concretado)`,
    `4️⃣  ❌ Descartar lead`,
    `5️⃣  📝 Agregar nota`,
    `0️⃣  Volver`,
  ].filter(Boolean)
  return lines.join('\n')
}

export async function handleLeadDetalle(session: BotSession, input: string): Promise<string> {
  const { leadId } = session.contextData
  if (!leadId) return errorMsg('No se encontró el lead.')

  const [lead] = await db.select().from(schema.leads).where(eq(schema.leads.id, leadId as number))
  if (!lead) return errorMsg('Lead no encontrado.')

  const ESTADOS: Record<string, string> = {
    '1': 'contactado',
    '2': 'visito',
    '3': 'cerrado',
    '4': 'descartado',
  }
  const nuevoEstado = ESTADOS[input]

  if (nuevoEstado) {
    try {
      await actualizarLead(leadId as number, { estado: nuevoEstado as any })
      await navigateBack(session)
      return `✅ Lead actualizado a *${nuevoEstado}*.\n\n0️⃣  Volver`
    } catch (err) {
      console.error('[handleLeadDetalle] update error', err)
      return errorMsg('No se pudo actualizar el lead. Intentá de nuevo.')
    }
  }

  if (input === '5') {
    await navigateTo(session, 'sales_lead_nota', { leadId, pendingText: true })
    return `📝 Escribí la nota para el lead *${lead.nombre}*:`
  }
  if (input === '0') return null as any
  return invalidOption(buildLeadDetalle(lead))
}

export async function handleLeadNota(session: BotSession, texto: string): Promise<string> {
  const { leadId } = session.contextData
  if (!leadId) return errorMsg('No se encontró el lead.')

  const [lead] = await db.select().from(schema.leads).where(eq(schema.leads.id, leadId as number))
  if (!lead) return errorMsg('Lead no encontrado.')

  const nuevaNote = lead.notas ? `${lead.notas}\n— ${texto.substring(0, 300)}` : texto.substring(0, 300)
  await db.update(schema.leads).set({
    notas: nuevaNote,
    updatedAt: new Date(),
  } as any).where(eq(schema.leads.id, leadId as number)).run()

  await navigateBack(session)
  return `📝 *Nota agregada al lead.*\n\n0️⃣  Volver`
}

// ─── Nuevo lead (wizard paso a paso) ─────────────────────────────────────────

export function buildNuevoLeadPaso1(): string {
  return [
    `➕ *Nuevo lead — Paso 1/4*`,
    SEP,
    `Escribí el *nombre* del interesado:`,
    `(Ej: "María García" o "Pizzería Don Juan")`,
    ``,
    `0️⃣  Cancelar`,
  ].join('\n')
}

export async function handleNuevoLeadPaso1(session: BotSession, texto: string): Promise<string> {
  if (!texto.trim()) return `❓ El nombre no puede estar vacío.\n\n${buildNuevoLeadPaso1()}`
  await navigateTo(session, 'sales_nuevo_lead_p2', {
    leadNombre: texto.trim().substring(0, 100),
    pendingText: true,
  })
  return [
    `➕ *Nuevo lead — Paso 2/4*`,
    SEP,
    `Escribí el *teléfono* o WhatsApp:`,
    `(Ej: "1155551234" o escribí "sin dato" si no tenés)`,
  ].join('\n')
}

export async function handleNuevoLeadPaso2(session: BotSession, texto: string): Promise<string> {
  const telefono = texto.trim().toLowerCase() === 'sin dato' ? null : texto.trim()
  await navigateTo(session, 'sales_nuevo_lead_p3', {
    ...session.contextData,
    leadTelefono: telefono,
    pendingText: true,
  })
  return [
    `➕ *Nuevo lead — Paso 3/4*`,
    SEP,
    `¿Cuál es el *rubro* del negocio?`,
    SEP,
    `1️⃣  🍕 Gastronomía`,
    `2️⃣  👗 Indumentaria / Moda`,
    `3️⃣  💄 Belleza / Salud`,
    `4️⃣  🛍️ Retail / Comercio`,
    `5️⃣  🏋️ Deporte / Recreación`,
    `6️⃣  📦 Servicios`,
    `7️⃣  ✏️ Otro (escribir)`,
  ].join('\n')
}

const RUBROS: Record<string, string> = {
  '1': 'Gastronomía',
  '2': 'Indumentaria / Moda',
  '3': 'Belleza / Salud',
  '4': 'Retail / Comercio',
  '5': 'Deporte / Recreación',
  '6': 'Servicios',
}

export async function handleNuevoLeadPaso3(session: BotSession, input: string): Promise<string> {
  const rubro = RUBROS[input] ?? (input.length > 1 ? input.substring(0, 50) : null)

  if (!rubro) {
    return invalidOption([
      `➕ *Nuevo lead — Paso 3/4*`,
      SEP,
      `1️⃣ Gastronomía  2️⃣ Indumentaria  3️⃣ Belleza`,
      `4️⃣ Retail  5️⃣ Deporte  6️⃣ Servicios  7️⃣ Otro`,
    ].join('\n'))
  }

  await navigateTo(session, 'sales_nuevo_lead_p4', {
    ...session.contextData,
    leadRubro: rubro,
    pendingText: true,
  })
  return [
    `➕ *Nuevo lead — Paso 4/4*`,
    SEP,
    `Escribí un mensaje o comentario adicional:`,
    `(Ej: "Quiere local en planta baja" o escribí "listo" para terminar)`,
  ].join('\n')
}

export async function handleNuevoLeadPaso4(session: BotSession, texto: string): Promise<string> {
  const mensaje = texto.trim().toLowerCase() === 'listo' ? null : texto.trim().substring(0, 500)
  const { leadNombre, leadTelefono, leadRubro } = session.contextData

  // Confirmar antes de guardar
  await navigateTo(session, 'sales_nuevo_lead_confirmar', {
    leadNombre, leadTelefono, leadRubro, leadMensaje: mensaje,
  })

  return [
    `➕ *Confirmar nuevo lead*`,
    SEP,
    `👤 Nombre: *${leadNombre}*`,
    leadTelefono ? `📞 Teléfono: ${leadTelefono}` : `📞 Sin teléfono`,
    `🏪 Rubro: ${leadRubro}`,
    mensaje ? `💬 Nota: ${mensaje}` : '',
    SEP,
    `1️⃣  ✅ Guardar lead`,
    `2️⃣  ❌ Cancelar`,
  ].filter(Boolean).join('\n')
}

export async function handleNuevoLeadConfirmar(session: BotSession, input: string): Promise<string> {
  if (input === '2') {
    await navigateTo(session, 'sales_leads', { page: 1 })
    return `❌ Lead cancelado.\n\n0️⃣  Volver`
  }
  if (input !== '1') return invalidOption(`1️⃣ Guardar  2️⃣ Cancelar`)

  const { leadNombre, leadTelefono, leadRubro, leadMensaje } = session.contextData

  const { id, created } = await crearLead({
    nombre: leadNombre as string,
    telefono: leadTelefono as string ?? null,
    rubro: leadRubro as string ?? null,
    mensaje: leadMensaje as string ?? null,
    asignadoId: session.userId,
    asignadoA: session.userName,
    fuente: 'whatsapp',
  } as any)

  if (created) {
    notifyOwner({
      title: `Nuevo lead — ${leadNombre}`,
      content: `Registrado por ${session.userName}. Rubro: ${leadRubro ?? '—'}`,
    }).catch(console.error)
  }

  await navigateTo(session, 'sales_leads', { page: 1 })
  return [
    `✅ *Lead #${id} guardado.*`,
    ``,
    `👤 ${leadNombre} registrado exitosamente.`,
    ``,
    `0️⃣  Volver a mis leads`,
  ].join('\n')
}

// ─── Estado de leads ──────────────────────────────────────────────────────────

export async function buildEstadoLeads(session: BotSession): Promise<string> {
  const leads = await getMisLeads(session.userId)
  const byEstado: Record<string, number> = {}
  for (const l of leads) byEstado[l.estado] = (byEstado[l.estado] ?? 0) + 1

  return [
    `📊 *Estado de mis leads — ${session.userName}*`,
    SEP,
    `Total: ${leads.length}`,
    byEstado['nuevo']      ? `🆕 Nuevos: ${byEstado['nuevo']}` : '',
    byEstado['contactado'] ? `📞 Contactados: ${byEstado['contactado']}` : '',
    byEstado['visito']     ? `🏢 Visitaron: ${byEstado['visito']}` : '',
    byEstado['cerrado']    ? `✅ Cerrados: ${byEstado['cerrado']}` : '',
    byEstado['descartado'] ? `❌ Descartados: ${byEstado['descartado']}` : '',
    SEP,
    `0️⃣  Volver`,
  ].filter(Boolean).join('\n')
}

// ─── Bandeja de entrada (mios nuevos + libres) ───────────────────────────────

type BandejaEntry = { lead: any; source: 'mio' | 'libre' }

async function getBandejaEntries(userId: number): Promise<BandejaEntry[]> {
  const [misLeads, libres] = await Promise.all([getMisLeads(userId), listUnassignedLeads()])
  const miosNuevos = misLeads
    .filter(l => l.estado === 'nuevo')
    .map(l => ({ lead: l, source: 'mio' as const }))
  const libresItems = libres.map(l => ({ lead: l, source: 'libre' as const }))
  return [...miosNuevos, ...libresItems]
}

export async function getSalesBandejaCount(userId: number): Promise<{ misNuevos: number; libres: number }> {
  const entries = await getBandejaEntries(userId)
  return {
    misNuevos: entries.filter(e => e.source === 'mio').length,
    libres: entries.filter(e => e.source === 'libre').length,
  }
}

export async function buildBandeja(session: BotSession): Promise<string> {
  const entries = await getBandejaEntries(session.userId)

  if (entries.length === 0) {
    return [
      `📥 *Bandeja de entrada*`,
      SEP,
      `✅ No hay nada pendiente por ahora.`,
      SEP,
      `0️⃣  Volver`,
    ].join('\n')
  }

  const page = (session.contextData.page as number) ?? 1
  const paged = paginate(entries, page, PAGE_SIZE)

  const miosCount  = entries.filter(e => e.source === 'mio').length
  const libresCount = entries.filter(e => e.source === 'libre').length
  const summaryParts = [
    miosCount  ? `📞 ${miosCount} para llamar` : null,
    libresCount ? `📋 ${libresCount} disponible${libresCount !== 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' | ')

  const lines: string[] = [`📥 *Bandeja de entrada*`, SEP, summaryParts, SEP]

  let lastSource: 'mio' | 'libre' | null = null
  paged.items.forEach((entry, i) => {
    const n = i + 1
    if (entry.source !== lastSource) {
      lines.push(entry.source === 'mio' ? `📞 *Para llamar:*` : `📋 *Disponibles para tomar:*`)
      lastSource = entry.source
    }
    const { lead } = entry
    const icon = entry.source === 'mio' ? '👤' : (lead.fuente === 'whatsapp' ? '📱' : '🌐')
    lines.push(`${n}️⃣  ${icon} *${lead.nombre}* — ${lead.rubro ?? 'Sin rubro'}`)
  })

  lines.push(SEP)
  if (paged.hasPrev) lines.push(`8️⃣  ◀️ Anterior`)
  if (paged.hasNext) lines.push(`9️⃣  ▶️ Ver más`)
  lines.push(`0️⃣  Volver`)
  return lines.join('\n')
}

export async function handleBandeja(session: BotSession, input: string): Promise<string> {
  const entries = await getBandejaEntries(session.userId)
  const page = (session.contextData.page as number) ?? 1
  const paged = paginate(entries, page, PAGE_SIZE)

  if (input === '8' && paged.hasPrev) {
    await navigateTo(session, 'sales_bandeja', { page: page - 1 })
    return buildBandeja({ ...session, contextData: { page: page - 1 } })
  }
  if (input === '9' && paged.hasNext) {
    await navigateTo(session, 'sales_bandeja', { page: page + 1 })
    return buildBandeja({ ...session, contextData: { page: page + 1 } })
  }
  if (input === '0') return null as any

  const opt = parseMenuOption(input, paged.items.length)
  if (!opt) return invalidOption(await buildBandeja(session))

  const entry = paged.items[opt - 1]
  if (entry.source === 'mio') {
    await navigateTo(session, 'sales_lead_detalle', { leadId: entry.lead.id })
    return buildLeadDetalle(entry.lead)
  }
  await navigateTo(session, 'sales_lead_libre_detalle', { leadId: entry.lead.id })
  return buildLeadLibreDetalle(entry.lead)
}

// ─── Leads sin asignar (disponibles para tomar) ───────────────────────────────

export async function buildLeadsLibre(session: BotSession): Promise<string> {
  const leads = await listUnassignedLeads()

  if (leads.length === 0) {
    return [
      `📋 *Leads sin asignar*`,
      SEP,
      `✅ No hay leads disponibles en este momento.`,
      SEP,
      `0️⃣  Volver`,
    ].join('\n')
  }

  const page = session.contextData.page ?? 1
  const paged = paginate(leads, page, PAGE_SIZE)
  const lines = [
    `📋 *Leads sin asignar* (${leads.length})`,
    SEP,
  ]

  paged.items.forEach((l, i) => {
    const n = i + 1
    const contacto = l.telefono ?? l.waId ?? '—'
    const fuente = l.fuente === 'whatsapp' ? '📱' : '🌐'
    lines.push(
      `${n}️⃣  ${fuente} *${l.nombre}*`,
      `   🏪 ${l.rubro ?? 'Sin rubro'} | 📞 ${contacto}`,
    )
  })

  lines.push(SEP)
  if (paged.hasPrev) lines.push(`8️⃣  ◀️ Anterior`)
  if (paged.hasNext) lines.push(`9️⃣  ▶️ Ver más`)
  lines.push(`0️⃣  Volver`)
  return lines.join('\n')
}

export async function handleLeadsLibre(session: BotSession, input: string): Promise<string> {
  const leads = await listUnassignedLeads()
  const page = session.contextData.page ?? 1
  const paged = paginate(leads, page, PAGE_SIZE)

  if (input === '8' && paged.hasPrev) {
    await navigateTo(session, 'sales_leads_libre', { page: page - 1 })
    return buildLeadsLibre({ ...session, contextData: { page: page - 1 } })
  }
  if (input === '9' && paged.hasNext) {
    await navigateTo(session, 'sales_leads_libre', { page: page + 1 })
    return buildLeadsLibre({ ...session, contextData: { page: page + 1 } })
  }
  if (input === '0') return null as any

  const opt = parseMenuOption(input, paged.items.length)
  if (!opt) return invalidOption(await buildLeadsLibre(session))

  const lead = paged.items[opt - 1]
  await navigateTo(session, 'sales_lead_libre_detalle', { leadId: lead.id })
  return buildLeadLibreDetalle(lead)
}

function buildLeadLibreDetalle(lead: any): string {
  return [
    `📋 *Lead disponible — ${lead.nombre}*`,
    SEP,
    lead.telefono ? `📞 ${lead.telefono}` : '',
    lead.rubro    ? `🏪 Rubro: ${lead.rubro}` : '',
    lead.mensaje  ? `💬 "${lead.mensaje}"` : '',
    lead.fuente === 'whatsapp' ? `📱 Vino por WhatsApp` : `🌐 Vino por web`,
    `🕒 Recibido: ${formatLeadDateTime(lead.createdAt)} | ${lead.firstContactedAt ? `respondido en ${formatLeadElapsed(lead.createdAt, lead.firstContactedAt)}` : `sin respuesta ${formatLeadElapsed(lead.createdAt)}`}`,
    SEP,
    `1️⃣  ✋ Tomar este lead`,
    `0️⃣  Volver`,
  ].filter(Boolean).join('\n')
}

export async function handleLeadLibreDetalle(session: BotSession, input: string): Promise<string> {
  const leadId = Number(session.contextData.leadId)
  if (!Number.isFinite(leadId)) return errorMsg('No se encontró el lead.')

  if (input === '0') return null as any

  const [lead] = await db.select().from(schema.leads).where(eq(schema.leads.id, leadId))
  if (!lead) return errorMsg('Lead no encontrado.')

  if (input === '1') {
    if (lead.asignadoId) {
      await navigateTo(session, 'sales_leads_libre', { page: 1 })
      return [
        `⚠️ Este lead ya fue tomado por otro vendedor.`,
        SEP,
        `0️⃣  Volver`,
      ].join('\n')
    }

    try {
      await actualizarLead(leadId, {
        asignadoId: session.userId,
        asignadoA: session.userName,
      })
    } catch (err) {
      console.error('[handleLeadLibreDetalle] actualizarLead error', err)
      return errorMsg('No se pudo tomar el lead. Intentá de nuevo.')
    }

    await navigateTo(session, 'sales_leads', { page: 1 })
    return [
      `✅ *Lead tomado exitosamente.*`,
      SEP,
      `👤 *${lead.nombre}* ya aparece en tus leads asignados.`,
      SEP,
      `0️⃣  Volver a mis leads`,
    ].join('\n')
  }

  return invalidOption(buildLeadLibreDetalle(lead))
}
