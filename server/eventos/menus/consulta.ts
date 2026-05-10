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

const SERVICIOS_EXTRA: Record<string, string> = {
  '1': 'Catering / Asado premium',
  '2': 'DJ / Música en vivo',
  '3': 'Ambientación temática',
  '4': 'Fotografía / Video',
  '5': 'Coordinación integral',
}

const SEGUIMIENTO_OPCIONES: Record<string, string> = {
  '1': 'Coordinar visita al salón',
  '2': 'Que me llamen',
  '3': 'Recibir información por WhatsApp',
}

// --- Paso 1: Nombre ---

export function buildConsultaP1(): string {
  return [
    `🎉 *Consulta de evento — Docks Eventos*`,
    DSEP,
    `📍 *Paso 1 de 6*`,
    ``,
    `¡Empecemos! Te hacemos *6 preguntas rápidas*`,
    `para entender tu evento y prepararte una propuesta.`,
    ``,
    `¿Cuál es tu *nombre y apellido*?`,
    DSEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export async function handleConsultaP1(session: EventosSession, input: string): Promise<string | null> {
  if (input === '0') return null
  if (input.trim().length < 2) return `⚠️ Por favor ingresá tu nombre.\n\n${buildConsultaP1()}`

  await navigateTo(session, 'consulta_p2', { nombre: trimSafe(input) })
  return buildConsultaP2()
}

// --- Paso 2: Tipo de evento ---

export function buildConsultaP2(): string {
  return [
    `🎉 *Consulta de evento*`,
    DSEP,
    `📍 *Paso 2 de 6*`,
    ``,
    `¿Qué *tipo de evento* estás organizando?`,
    DSEP,
    `💒  *1*  →  Boda / Casamiento`,
    `🎂  *2*  →  Cumpleaños / Fiesta`,
    `🎀  *3*  →  Fiesta de 15 años`,
    `✡️  *4*  →  Bar / Bat Mitzvá`,
    `🏢  *5*  →  Evento corporativo`,
    `🎉  *6*  →  Aniversario / Celebración`,
    `✏️  *7*  →  Otro (escribir)`,
    DSEP,
    `_Escribí *cancelar* para salir_`,
  ].join('\n')
}

export async function handleConsultaP2(session: EventosSession, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'cancelar') { await resetToMain(session); return null }

  if (input === '7') {
    await navigateTo(session, 'consulta_p2_otro', { pendingText: true, pendingField: 'tipoEvento' })
    return [
      `🎉 *Consulta de evento*`,
      DSEP,
      `📍 *Paso 2 de 6*`,
      ``,
      `¿Qué tipo de evento estás organizando?`,
      `_(Describilo con tus palabras)_`,
      DSEP,
      `_Escribí *cancelar* para salir_`,
    ].join('\n')
  }

  const tipo = TIPOS_EVENTO[input]
  if (!tipo) return `⚠️ Elegí una opción del 1 al 7.\n\n${buildConsultaP2()}`

  await navigateTo(session, 'consulta_p3', { tipoEvento: tipo, pendingText: true, pendingField: 'fechaEstimada' })
  return buildConsultaP3()
}

export async function handleConsultaP2Otro(session: EventosSession, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'cancelar') { await resetToMain(session); return null }
  if (input.trim().length < 2) return `⚠️ Por favor describí el tipo de evento.`

  await navigateTo(session, 'consulta_p3', { tipoEvento: trimSafe(input), pendingText: true, pendingField: 'fechaEstimada' })
  return buildConsultaP3()
}

// --- Paso 3: Fecha estimada ---

export function buildConsultaP3(): string {
  return [
    `🎉 *Consulta de evento*`,
    DSEP,
    `📍 *Paso 3 de 6*`,
    ``,
    `¿Para *cuándo* tenés pensado el evento?`,
    `_(ej: "diciembre 2026", "próximo mes", "ya tengo fecha: 15/03")_`,
    DSEP,
    `_Escribí *cancelar* para salir_`,
  ].join('\n')
}

export async function handleConsultaP3(session: EventosSession, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'cancelar') { await resetToMain(session); return null }
  if (input.trim().length < 2) return `⚠️ Por favor indicá una fecha estimada.\n\n${buildConsultaP3()}`

  await navigateTo(session, 'consulta_p4', { fechaEstimada: trimSafe(input) })
  return buildConsultaP4()
}

// --- Paso 4: Cantidad de invitados ---

export function buildConsultaP4(): string {
  return [
    `🎉 *Consulta de evento*`,
    DSEP,
    `📍 *Paso 4 de 6*`,
    ``,
    `¿Cuántos *invitados* estimás?`,
    DSEP,
    `👥  *1*  →  Hasta 50`,
    `👥  *2*  →  50 a 100`,
    `👥  *3*  →  100 a 200`,
    `👥  *4*  →  200 a 400`,
    `👥  *5*  →  Más de 400`,
    `🤔  *6*  →  Todavía no sé`,
    DSEP,
    `_Escribí *cancelar* para salir_`,
  ].join('\n')
}

export async function handleConsultaP4(session: EventosSession, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'cancelar') { await resetToMain(session); return null }

  const cantidad = CANTIDAD_INVITADOS[input]
  if (!cantidad) return `⚠️ Elegí una opción del 1 al 6.\n\n${buildConsultaP4()}`

  await navigateTo(session, 'consulta_p5', { cantidadInvitados: cantidad })
  return buildConsultaP5()
}

// --- Paso 5: Servicios extra ---

export function buildConsultaP5(): string {
  return [
    `🎉 *Consulta de evento*`,
    DSEP,
    `📍 *Paso 5 de 6*`,
    ``,
    `¿Qué *servicios* te interesan?`,
    `_(Podés elegir varios, ej: "1,3,5")_`,
    DSEP,
    `🍖  *1*  →  Catering / Asado premium`,
    `🎵  *2*  →  DJ / Música en vivo`,
    `🎨  *3*  →  Ambientación temática`,
    `📸  *4*  →  Fotografía / Video`,
    `📋  *5*  →  Coordinación integral`,
    ``,
    `🔄  *0*  →  No necesito servicios extras`,
    DSEP,
    `_Escribí *cancelar* para salir_`,
  ].join('\n')
}

export async function handleConsultaP5(session: EventosSession, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'cancelar') { await resetToMain(session); return null }

  let servicios: string[] = []
  if (input !== '0') {
    const nums = input.replace(/\s/g, '').split(',').map(s => s.trim()).filter(Boolean)
    for (const n of nums) {
      const srv = SERVICIOS_EXTRA[n]
      if (srv) servicios.push(srv)
    }
    if (servicios.length === 0) return `⚠️ Elegí opciones del 1 al 5 separadas por coma, o *0* si no necesitás.\n\n${buildConsultaP5()}`
  }

  await navigateTo(session, 'consulta_p6', { serviciosExtra: servicios })
  return buildConsultaP6()
}

// --- Paso 6: Seguimiento ---

export function buildConsultaP6(): string {
  return [
    `🎉 *Consulta de evento*`,
    DSEP,
    `📍 *Paso 6 de 6 — ¡Último paso!*`,
    ``,
    `La visita al salón es clave para que veas el espacio,`,
    `la vista al río y cómo podemos montar tu evento.`,
    ``,
    `¿Cómo preferís *seguir adelante*?`,
    DSEP,
    `📅  *1*  →  Coordinar visita al salón`,
    `📞  *2*  →  Que me llamen`,
    `💬  *3*  →  Recibir información por WhatsApp`,
    DSEP,
    `_Escribí *cancelar* para salir_`,
  ].join('\n')
}

export async function handleConsultaP6(session: EventosSession, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'cancelar') { await resetToMain(session); return null }

  const seguimiento = SEGUIMIENTO_OPCIONES[input]
  if (!seguimiento) return `⚠️ Elegí una opción del 1 al 3.\n\n${buildConsultaP6()}`

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
    `🎉 *Confirmar consulta — Docks Eventos*`,
    DSEP,
    `👤 *${ctx.nombre ?? ''}*`,
    `🎂 Evento: *${ctx.tipoEvento ?? ''}*`,
    `📅 Fecha: ${ctx.fechaEstimada ?? ''}`,
    `👥 Invitados: ${ctx.cantidadInvitados ?? ''}`,
    `🎯 Servicios: ${servicios}`,
    `📌 Seguimiento: ${ctx.seguimiento ?? ''}`,
    DSEP,
    `¿Los datos están bien?`,
    ``,
    `1️⃣  ✅ *Enviar consulta*`,
    `2️⃣  ✏️  Corregir (empezar de nuevo)`,
  ].join('\n')
}

export async function handleConsultaConfirmar(session: EventosSession, input: string): Promise<string | '__CONFIRM_CONSULTA__' | null> {
  if (input === '2') {
    await navigateTo(session, 'consulta_p1', { pendingText: true })
    return [`✏️ Sin problema, empecemos de nuevo.`, ``, buildConsultaP1()].join('\n')
  }
  if (input !== '1') return `⚠️ Elegí 1 para enviar o 2 para corregir.\n\n${buildConsultaConfirmar(session.contextData)}`

  return '__CONFIRM_CONSULTA__'
}
