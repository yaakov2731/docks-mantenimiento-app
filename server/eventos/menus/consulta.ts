import { EventosSession, navigateTo, resetToMain, EventosMenuContext } from '../session'
import { DSEP } from './bienvenida'

const MAX_INPUT = 300

function trimSafe(v: string): string {
  return v.trim().slice(0, MAX_INPUT)
}

const TIPOS_EVENTO: Record<string, string> = {
  '1': 'Boda / Casamiento',
  '2': 'Cumpleaños / Fiesta',
  '3': 'Fiesta de 15 años',
  '4': 'Bar / Bat Mitzvá',
  '5': 'Evento corporativo',
  '6': 'Aniversario / Celebración',
}

const CANTIDAD_INVITADOS: Record<string, string> = {
  '1': 'Hasta 50',
  '2': '50 a 100',
  '3': '100 a 200',
  '4': '200 a 400',
  '5': 'Más de 400',
  '6': 'Todavía no sé',
}

const PRESUPUESTO_OPCIONES: Record<string, string> = {
  '1': 'Hasta $5.000.000',
  '2': '$5.000.000 a $10.000.000',
  '3': '$10.000.000 a $20.000.000',
  '4': 'Más de $20.000.000',
  '5': 'Prefiero no decir',
}

const SERVICIOS_EXTRA: Record<string, string> = {
  '1': 'Catering / Asado premium',
  '2': 'DJ / Música en vivo',
  '3': 'Ambientación temática',
  '4': 'Fotografía / Video',
  '5': 'Coordinación integral',
  '6': 'Barra libre',
}

const SEGUIMIENTO_OPCIONES: Record<string, string> = {
  '1': 'Coordinar visita al salón',
  '2': 'Que me llamen',
  '3': 'Recibir info por WhatsApp',
}

// --- Paso 1: Nombre ---

export function buildConsultaP1(): string {
  return [
    `✨ *Consulta — Docks Eventos*`,
    DSEP,
    `📍 *Paso 1/7* — ⏱️ _2 minutos_`,
    ``,
    `¿Cuál es tu *nombre y apellido*?`,
    DSEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export async function handleConsultaP1(session: EventosSession, input: string): Promise<string | null> {
  if (input === '0') return null
  if (input.trim().length < 2) return `⚠️ Ingresá tu nombre.\n\n${buildConsultaP1()}`

  await navigateTo(session, 'consulta_p2', { nombre: trimSafe(input) })
  return buildConsultaP2()
}

// --- Paso 2: Tipo de evento ---

export function buildConsultaP2(): string {
  return [
    `✨ *Consulta — Paso 2/7*`,
    DSEP,
    `¿Qué *tipo de evento*?`,
    ``,
    `💒  *1*  Boda / Casamiento`,
    `🎂  *2*  Cumpleaños / Fiesta`,
    `🎀  *3*  Fiesta de 15 años`,
    `✡️  *4*  Bar / Bat Mitzvá`,
    `🏢  *5*  Evento corporativo`,
    `🎉  *6*  Aniversario / Celebración`,
    `✏️  *7*  Otro`,
    DSEP,
    `_*cancelar* para salir_`,
  ].join('\n')
}

export async function handleConsultaP2(session: EventosSession, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'cancelar') { await resetToMain(session); return null }

  if (input === '7') {
    await navigateTo(session, 'consulta_p2_otro', { pendingText: true, pendingField: 'tipoEvento' })
    return [
      `✨ *Consulta — Paso 2/7*`,
      DSEP,
      `Describí el tipo de evento:`,
      DSEP,
      `_*cancelar* para salir_`,
    ].join('\n')
  }

  const tipo = TIPOS_EVENTO[input]
  if (!tipo) return `⚠️ Elegí del 1 al 7.\n\n${buildConsultaP2()}`

  await navigateTo(session, 'consulta_p3', { tipoEvento: tipo, pendingText: true, pendingField: 'fechaEstimada' })
  return buildConsultaP3()
}

export async function handleConsultaP2Otro(session: EventosSession, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'cancelar') { await resetToMain(session); return null }
  if (input.trim().length < 2) return `⚠️ Describí el tipo de evento.`

  await navigateTo(session, 'consulta_p3', { tipoEvento: trimSafe(input), pendingText: true, pendingField: 'fechaEstimada' })
  return buildConsultaP3()
}

// --- Paso 3: Fecha estimada ---

export function buildConsultaP3(): string {
  return [
    `✨ *Consulta — Paso 3/7*`,
    DSEP,
    `¿Para *cuándo* es el evento?`,
    `_(ej: "diciembre 2026", "15/03", "próximo mes")_`,
    DSEP,
    `_*cancelar* para salir_`,
  ].join('\n')
}

export async function handleConsultaP3(session: EventosSession, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'cancelar') { await resetToMain(session); return null }
  if (input.trim().length < 2) return `⚠️ Indicá una fecha estimada.\n\n${buildConsultaP3()}`

  await navigateTo(session, 'consulta_p4', { fechaEstimada: trimSafe(input) })
  return buildConsultaP4()
}

// --- Paso 4: Cantidad de invitados ---

export function buildConsultaP4(): string {
  return [
    `✨ *Consulta — Paso 4/7*`,
    DSEP,
    `¿Cuántos *invitados*?`,
    ``,
    `👥  *1*  Hasta 50`,
    `👥  *2*  50 a 100`,
    `👥  *3*  100 a 200`,
    `👥  *4*  200 a 400`,
    `👥  *5*  Más de 400`,
    `🤔  *6*  No sé todavía`,
    DSEP,
    `_*cancelar* para salir_`,
  ].join('\n')
}

export async function handleConsultaP4(session: EventosSession, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'cancelar') { await resetToMain(session); return null }

  const cantidad = CANTIDAD_INVITADOS[input]
  if (!cantidad) return `⚠️ Elegí del 1 al 6.\n\n${buildConsultaP4()}`

  await navigateTo(session, 'consulta_p5', { cantidadInvitados: cantidad })
  return buildConsultaP5()
}

// --- Paso 5: Presupuesto ---

export function buildConsultaP5(): string {
  return [
    `✨ *Consulta — Paso 5/7*`,
    DSEP,
    `¿*Presupuesto* estimado?`,
    ``,
    `💰  *1*  Hasta $5M`,
    `💰  *2*  $5M a $10M`,
    `💰  *3*  $10M a $20M`,
    `💰  *4*  Más de $20M`,
    `🤐  *5*  Prefiero no decir`,
    DSEP,
    `_*cancelar* para salir_`,
  ].join('\n')
}

export async function handleConsultaP5(session: EventosSession, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'cancelar') { await resetToMain(session); return null }

  const presupuesto = PRESUPUESTO_OPCIONES[input]
  if (!presupuesto) return `⚠️ Elegí del 1 al 5.\n\n${buildConsultaP5()}`

  await navigateTo(session, 'consulta_p6', { presupuesto })
  return buildConsultaP6()
}

// --- Paso 6: Servicios ---

export function buildConsultaP6(): string {
  return [
    `✨ *Consulta — Paso 6/7*`,
    DSEP,
    `¿Qué *servicios* te interesan?`,
    `_(varios: "1,3,5")_`,
    ``,
    `🍖  *1*  Catering / Asado`,
    `🎵  *2*  DJ / Música`,
    `🎨  *3*  Ambientación`,
    `📸  *4*  Foto / Video`,
    `📋  *5*  Coordinación integral`,
    `🍸  *6*  Barra libre`,
    ``,
    `🔄  *0*  Ninguno`,
    DSEP,
    `_*cancelar* para salir_`,
  ].join('\n')
}

export async function handleConsultaP6(session: EventosSession, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'cancelar') { await resetToMain(session); return null }

  let servicios: string[] = []
  if (input !== '0') {
    const nums = input.replace(/\s/g, '').split(',').map(s => s.trim()).filter(Boolean)
    for (const n of nums) {
      const srv = SERVICIOS_EXTRA[n]
      if (srv) servicios.push(srv)
    }
    if (servicios.length === 0) return `⚠️ Elegí del 1 al 6 (separados por coma) o *0*.\n\n${buildConsultaP6()}`
  }

  await navigateTo(session, 'consulta_p7', { serviciosExtra: servicios })
  return buildConsultaP7()
}

// --- Paso 7: Seguimiento ---

export function buildConsultaP7(): string {
  return [
    `✨ *Consulta — Paso 7/7 ¡Último!*`,
    DSEP,
    `¿Cómo preferís *continuar*?`,
    ``,
    `📅  *1*  Coordinar visita al salón`,
    `📞  *2*  Que me llamen`,
    `💬  *3*  Recibir info por WhatsApp`,
    DSEP,
    `_*cancelar* para salir_`,
  ].join('\n')
}

export async function handleConsultaP7(session: EventosSession, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'cancelar') { await resetToMain(session); return null }

  const seguimiento = SEGUIMIENTO_OPCIONES[input]
  if (!seguimiento) return `⚠️ Elegí del 1 al 3.\n\n${buildConsultaP7()}`

  const newCtx = { ...session.contextData, seguimiento }
  await navigateTo(session, 'consulta_confirmar', { seguimiento })
  return buildConsultaConfirmar(newCtx)
}

// --- Confirmar ---

export function buildConsultaConfirmar(ctx: EventosMenuContext): string {
  const servicios = (ctx.serviciosExtra ?? []).length > 0
    ? (ctx.serviciosExtra as string[]).join(', ')
    : 'Ninguno'

  return [
    `✨ *Confirmar — Docks Eventos*`,
    DSEP,
    `👤 *${ctx.nombre ?? ''}*`,
    `🎂 ${ctx.tipoEvento ?? ''}`,
    `📅 ${ctx.fechaEstimada ?? ''}`,
    `👥 ${ctx.cantidadInvitados ?? ''}`,
    `💰 ${ctx.presupuesto ?? 'No indicado'}`,
    `🎯 ${servicios}`,
    `📌 ${ctx.seguimiento ?? ''}`,
    DSEP,
    `1️⃣  ✅ *Enviar consulta*`,
    `2️⃣  ✏️  Corregir`,
  ].join('\n')
}

export async function handleConsultaConfirmar(session: EventosSession, input: string): Promise<string | '__CONFIRM_CONSULTA__' | null> {
  if (input === '2') {
    await navigateTo(session, 'consulta_p1', { pendingText: true })
    return [`✏️ Empecemos de nuevo.`, ``, buildConsultaP1()].join('\n')
  }
  if (input !== '1') return `⚠️ *1* para enviar o *2* para corregir.\n\n${buildConsultaConfirmar(session.contextData)}`

  return '__CONFIRM_CONSULTA__'
}
