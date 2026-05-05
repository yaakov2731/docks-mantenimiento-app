/**
 * Handler del menú de asistencia para empleados de Gastronomía.
 */
import { BotSession } from '../../session'
import { SEP, parseMenuOption, invalidOption } from '../../shared/guards'
import { registerEmpleadoAttendance } from '../../../db'
import { writeAsistenciaAppRow } from '../../../gastronomia/sheets'
import { SECTORES_GASTRONOMIA } from '../../../../shared/const'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type GastroAction = 'entrada' | 'salida' | 'inicio_almuerzo' | 'fin_almuerzo'

const OPTION_MAP: Record<number, GastroAction> = {
  1: 'entrada',
  2: 'salida',
  3: 'inicio_almuerzo',
  4: 'fin_almuerzo',
}

const LABEL_MAP: Record<GastroAction, string> = {
  entrada:         'Entrada',
  salida:          'Salida',
  inicio_almuerzo: 'Inicio de almuerzo',
  fin_almuerzo:    'Fin de almuerzo',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSectorLabel(sector: string): string {
  const found = SECTORES_GASTRONOMIA.find(s => s.value === sector)
  return found?.label ?? sector
}

// ── Build menu ────────────────────────────────────────────────────────────────

export function buildGastronomiaMenu(sector: string, userName: string): string {
  const localLabel = getSectorLabel(sector)
  return [
    `🍽️ *Asistencia Gastronomía — ${userName}*`,
    `📍 Local: ${localLabel}`,
    SEP,
    `1️⃣  📍 Entrada`,
    `2️⃣  🏁 Salida`,
    `3️⃣  🍽️ Inicio almuerzo`,
    `4️⃣  ↩️  Fin almuerzo`,
    SEP,
    `0️⃣  Volver`,
  ].join('\n')
}

// ── Handle input ──────────────────────────────────────────────────────────────

export async function handleGastronomia(session: BotSession, input: string): Promise<string | null> {
  const opt = parseMenuOption(input, 4)

  if (opt === null) {
    return invalidOption(buildGastronomiaMenu(
      session.contextData?.sector as string ?? '',
      session.userName,
    ))
  }

  if (opt === 0) return null // engine vuelve al menú anterior

  const accion = OPTION_MAP[opt]
  if (!accion) {
    return invalidOption(buildGastronomiaMenu(
      session.contextData?.sector as string ?? '',
      session.userName,
    ))
  }

  const result = await registerEmpleadoAttendance(session.userId, accion, 'whatsapp')

  if (!result.success) {
    const mensajesError: Record<string, string> = {
      already_on_shift:   'Ya tenés un turno activo. Primero registrá la salida del turno anterior.',
      not_on_shift:       'Primero registrá la entrada.',
      already_on_lunch:   'Ya tenés el almuerzo iniciado.',
      not_on_lunch:       'No tenés almuerzo activo para finalizar.',
      on_lunch:           'Finalizá el almuerzo antes de registrar la salida.',
      ALREADY_ON_SHIFT:   'Ya tenés un turno activo. Primero registrá la salida del turno anterior.',
      NO_OPEN_SHIFT:      'No tenés un turno activo. Primero registrá la entrada.',
      ALREADY_ON_LUNCH:   'Ya tenés el almuerzo iniciado.',
      NOT_ON_LUNCH:       'No tenés almuerzo activo para finalizar.',
      LUNCH_NOT_FINISHED: 'Finalizá el almuerzo antes de registrar la salida.',
    }
    const msg = mensajesError[result.code as string] ?? 'No se pudo registrar la acción.'
    return [`⚠️ ${msg}`, SEP, `0️⃣  Volver`].join('\n')
  }

  // Hora local Buenos Aires
  const ahora = new Date().toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires',
  })

  // Fire-and-forget: la planilla real de sueldos lee Asistencia_App.
  writeAsistenciaAppRow({
    sector: session.contextData?.sector as string | null | undefined,
    empleadoNombre: session.userName,
    puesto: session.contextData?.puesto as string | null | undefined,
    canal: 'whatsapp',
    status: result.status,
  }).catch(console.error)

  const label = LABEL_MAP[accion]
  return [
    `✅ *${label} registrada*`,
    ``,
    `${session.userName} — *${ahora}*`,
    ``,
    `0️⃣  Volver`,
  ].join('\n')
}
