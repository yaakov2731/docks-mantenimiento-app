/**
 * Flujo de Leads para el equipo de ventas.
 * sales_leads → sales_lead_detalle | sales_nuevo_lead_*
 */
import { BotSession, navigateTo, navigateBack } from '../../session'
import { SEP, parseMenuOption, invalidOption, paginate, errorMsg, confirmMsg } from '../../shared/guards'
import { crearLead } from '../../../db'
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
    const n = (page - 1) * PAGE_SIZE + i + 1
    const contacto = l.telefono ?? l.email ?? l.waId ?? '—'
    lines.push(
      `${n}️⃣  ${estadoLeadEmoji(l.estado)} *${l.nombre}*`,
      `   📞 ${contacto} | ${l.rubro ?? 'Sin rubro'} | ${l.estado}`,
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
    await db.update(schema.leads).set({
      estado: nuevoEstado as any,
      updatedAt: new Date(),
    } as any).where(eq(schema.leads.id, leadId as number)).run()
    await navigateBack(session)
    return `✅ Lead actualizado a *${nuevoEstado}*.\n\n0️⃣  Volver`
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

  const id = await crearLead({
    nombre: leadNombre as string,
    telefono: leadTelefono as string ?? null,
    rubro: leadRubro as string ?? null,
    mensaje: leadMensaje as string ?? null,
    asignadoId: session.userId,
    asignadoA: session.userName,
    fuente: 'whatsapp',
  } as any)

  notifyOwner({
    title: `Nuevo lead — ${leadNombre}`,
    content: `Registrado por ${session.userName}. Rubro: ${leadRubro ?? '—'}`,
  }).catch(console.error)

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
