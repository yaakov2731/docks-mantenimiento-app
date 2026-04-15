/**
 * Flujo de Control de Baños (Rondas) para empleados.
 * Menús: rondas_lista → ronda_detalle → ronda_observacion
 */
import { BotSession, navigateTo, navigateBack } from '../../session'
import { SEP, parseMenuOption, invalidOption, paginate, errorMsg } from '../../shared/guards'
import { createRoundsService } from '../../../rounds/service'
import * as roundDb from '../../../db'

const roundsService = createRoundsService(roundDb as any)

// ─── Lista de rondas pendientes ───────────────────────────────────────────────

export async function buildRondasLista(session: BotSession): Promise<string> {
  const rondas = await getRondasPendientesEmpleado(session.userId)

  if (rondas.length === 0) {
    const proxima = await getProximaRondaEmpleado(session.userId)
    const proximaStr = proxima
      ? `⏰ Próximo control: *${proxima.programadoAtLabel ?? '—'}*`
      : 'No hay controles programados para hoy.'
    return [
      `🚻 *Control de baños*`,
      SEP,
      `✅ No tenés controles pendientes ahora.`,
      proximaStr,
      SEP,
      `0️⃣  Volver al menú principal`,
    ].join('\n')
  }

  const page = session.contextData.page ?? 1
  const paged = paginate(rondas, page, 5)
  const lines = [
    `🚻 *Controles pendientes* (${rondas.length})`,
    SEP,
  ]

  paged.items.forEach((r, i) => {
    const num = (page - 1) * 5 + i + 1
    const demora = calcDemoraMin(r.programadoAt)
    const estadoStr = demora > 0
      ? `⏰ Pendiente (${demora} min de demora)`
      : `⏳ Programado para ${r.programadoAtLabel}`
    lines.push(
      `${num}️⃣  *${r.nombreRonda}* — ${r.programadoAtLabel ?? '—'}`,
      `   ${estadoStr}`,
      `   🔑 ID: ${r.id}`,
    )
  })

  lines.push(SEP)
  if (paged.hasPrev) lines.push(`8️⃣  ◀️ Anterior`)
  if (paged.hasNext) lines.push(`9️⃣  ▶️ Ver más`)
  lines.push(`0️⃣  Volver`)

  return lines.join('\n')
}

export async function handleRondasLista(session: BotSession, input: string): Promise<string> {
  const rondas = await getRondasPendientesEmpleado(session.userId)
  const page = session.contextData.page ?? 1
  const paged = paginate(rondas, page, 5)

  if (input === '8' && paged.hasPrev) {
    await navigateTo(session, 'rondas_lista', { page: page - 1 })
    return buildRondasLista({ ...session, contextData: { page: page - 1 } })
  }
  if (input === '9' && paged.hasNext) {
    await navigateTo(session, 'rondas_lista', { page: page + 1 })
    return buildRondasLista({ ...session, contextData: { page: page + 1 } })
  }
  if (input === '0') return null as any

  const opt = parseMenuOption(input, paged.items.length)
  if (!opt) return invalidOption(await buildRondasLista(session))

  const ronda = paged.items[opt - 1]
  if (!ronda) return invalidOption(await buildRondasLista(session))

  await navigateTo(session, 'ronda_detalle', { rondaId: ronda.id })
  return buildRondaDetalle(ronda)
}

// ─── Detalle de ronda ─────────────────────────────────────────────────────────

function buildRondaDetalle(ronda: any): string {
  const demora = calcDemoraMin(ronda.programadoAt)
  return [
    `🚻 *${ronda.nombreRonda}*`,
    `⏰ Programado: *${ronda.programadoAtLabel ?? '—'}*`,
    demora > 0 ? `⚠️ Demora: ${demora} minutos` : '',
    `🔑 ID: *${ronda.id}*`,
    SEP,
    `¿Resultado del control?`,
    `1️⃣  ✅ Todo en orden`,
    `2️⃣  ⚠️  Realizado con observación`,
    `3️⃣  ❌ No pude realizar el control`,
    `0️⃣  Volver`,
  ].filter(Boolean).join('\n')
}

export async function handleRondaDetalle(session: BotSession, input: string): Promise<string> {
  const { rondaId } = session.contextData
  if (!rondaId) return errorMsg('No se encontró la ronda.')

  if (input === '1') {
    return finalizarRonda(session, rondaId as number, '3', undefined) // opción 3 = finalizar OK
  }
  if (input === '2') {
    await navigateTo(session, 'ronda_observacion', { rondaId })
    return buildRondaObservacion()
  }
  if (input === '3') {
    return marcarNoPudo(session, rondaId as number)
  }
  if (input === '0') return null as any

  // Buscar ronda para repintar el menú
  const rondas = await getRondasPendientesEmpleado(session.userId)
  const ronda = rondas.find(r => r.id === rondaId)
  if (!ronda) return errorMsg('Ronda no encontrada.')
  return invalidOption(buildRondaDetalle(ronda))
}

// ─── Sub-flujo: Observación ──────────────────────────────────────────────────

function buildRondaObservacion(): string {
  return [
    `⚠️  *¿Qué observaste?*`,
    SEP,
    `1️⃣  🧻 Falta papel / toallas`,
    `2️⃣  🧴 Falta jabón / desinfectante`,
    `3️⃣  🔧 Desperfecto (canilla, inodoro, luz)`,
    `4️⃣  🧹 Suciedad excesiva`,
    `5️⃣  ✏️  Otra observación (escribir)`,
    `0️⃣  Cancelar`,
  ].join('\n')
}

const OBSERVACIONES: Record<string, string> = {
  '1': 'Falta papel / toallas',
  '2': 'Falta jabón / desinfectante',
  '3': 'Desperfecto en instalación (canilla, inodoro o luz)',
  '4': 'Suciedad excesiva',
}

export async function handleRondaObservacion(session: BotSession, input: string): Promise<string> {
  const { rondaId } = session.contextData
  if (!rondaId) return errorMsg('No se encontró la ronda.')

  if (input === '5') {
    await navigateTo(session, 'ronda_observacion_libre', { rondaId, pendingText: true })
    return `✏️  Escribí la observación brevemente:`
  }

  const obs = OBSERVACIONES[input]
  if (!obs) {
    if (input === '0') {
      await navigateBack(session)
      const rondas = await getRondasPendientesEmpleado(session.userId)
      const ronda = rondas.find(r => r.id === rondaId)
      return ronda ? buildRondaDetalle(ronda) : await buildRondasLista(session)
    }
    return invalidOption(buildRondaObservacion())
  }

  return finalizarRonda(session, rondaId as number, '4', obs) // opción 4 = finalizar con observación
}

export async function handleRondaObservacionLibre(session: BotSession, texto: string): Promise<string> {
  const { rondaId } = session.contextData
  if (!rondaId) return errorMsg('No se encontró la ronda.')
  return finalizarRonda(session, rondaId as number, '4', texto.substring(0, 300))
}

// ─── Acciones sobre ronda ─────────────────────────────────────────────────────

async function finalizarRonda(
  session: BotSession,
  occurrenceId: number,
  opcion: string,
  nota: string | undefined
): Promise<string> {
  try {
    if (opcion === '3') {
      await roundsService.finishOccurrence({ occurrenceId, empleadoId: session.userId, note: nota })
    } else {
      await roundsService.reportObservation({ occurrenceId, empleadoId: session.userId, note: nota })
    }

    await navigateTo(session, 'rondas_lista', { page: 1 })
    const conObs = opcion === '4'
    return [
      conObs ? `⚠️  *Control registrado con observación.*` : `✅ *Control registrado.*`,
      conObs && nota ? `📝 Observación: "${nota}"` : '',
      conObs ? `\nSe notificó al encargado.` : ``,
      ``,
      `0️⃣  Volver a controles`,
    ].filter(l => l !== '').join('\n')
  } catch (e: any) {
    return errorMsg(e?.message ?? 'No se pudo registrar el control.')
  }
}

async function marcarNoPudo(session: BotSession, occurrenceId: number): Promise<string> {
  try {
    await roundsService.markUnableToComplete({ occurrenceId, empleadoId: session.userId })
    await navigateTo(session, 'rondas_lista', { page: 1 })
    return [
      `❌ *Control marcado como no realizado.*`,
      `Se notificó al encargado.`,
      ``,
      `0️⃣  Volver a controles`,
    ].join('\n')
  } catch (e: any) {
    return errorMsg(e?.message ?? 'No se pudo registrar.')
  }
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function getRondasPendientesEmpleado(empleadoId: number): Promise<any[]> {
  const { db: dbInstance, rondasOcurrencia } = await import('../../../db').then(async (m) => {
    // Acceso directo a la tabla via drizzle
    const { createClient } = await import('@libsql/client')
    const { drizzle } = await import('drizzle-orm/libsql')
    const { eq, and, or } = await import('drizzle-orm')
    const schema = await import('../../../../drizzle/schema')
    const { readEnv } = await import('../../../_core/env')
    const cl = createClient({ url: readEnv('TURSO_URL')!, authToken: readEnv('TURSO_TOKEN')! })
    const db = drizzle(cl, { schema })
    const rows = await db.select().from(schema.rondasOcurrencia).where(
      and(
        eq(schema.rondasOcurrencia.empleadoId, empleadoId),
        or(
          eq(schema.rondasOcurrencia.estado, 'pendiente'),
          eq(schema.rondasOcurrencia.estado, 'iniciada' as any),
        )
      )
    )
    return { db, rondasOcurrencia: rows }
  })
  return rondasOcurrencia ?? []
}

async function getProximaRondaEmpleado(empleadoId: number): Promise<any | null> {
  const pendientes = await getRondasPendientesEmpleado(empleadoId)
  return pendientes.length > 0 ? pendientes[0] : null
}

function calcDemoraMin(programadoAt: Date | number | null | undefined): number {
  if (!programadoAt) return 0
  const ts = programadoAt instanceof Date ? programadoAt.getTime() : Number(programadoAt) * 1000
  const diff = Math.floor((Date.now() - ts) / 60000)
  return diff > 0 ? diff : 0
}
