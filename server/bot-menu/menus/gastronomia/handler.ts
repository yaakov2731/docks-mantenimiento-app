/**
 * Handler del menú de asistencia para empleados de Gastronomía.
 */
import { BotSession } from '../../session'
import { SEP, parseMenuOption, invalidOption } from '../../shared/guards'
import { registerEmpleadoAttendance } from '../../../db'
import { writeAsistenciaAppRow } from '../../../gastronomia/sheets'
import { writeAsistenciaExcelRow } from '../../../gastronomia/excel'
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
    `1️⃣  REGISTRAR ENTRADA`,
    `2️⃣  REGISTRAR SALIDA`,
    `3️⃣ Iniciar almuerzo`,
    `4️⃣ Finalizar almuerzo`,
    SEP,
    `0️⃣  Volver`,
  ].join('\n')
}

// ── Handle input ──────────────────────────────────────────────────────────────

export async function handleGastronomia(session: BotSession, input: string): Promise<string | null> {
  const isAdminViewing = session.userType === 'admin'
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

  if (isAdminViewing) {
    const label = LABEL_MAP[accion]
    return [
      `ℹ️ *Modo administrador — solo lectura*`,
      ``,
      `Acción "${label}" no se ejecuta en modo admin.`,
      `Este menú es solo para visualizar las opciones del empleado.`,
      ``,
      `0️⃣  Volver`,
    ].join('\n')
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

  const sector = result.status?.assignedSector ?? session.contextData?.sector as string | null | undefined
  const referenceDate = result.status?.lastActionAt
    ? new Date(result.status.lastActionAt)
    : new Date()

  const excelResult = accion === 'entrada'
    ? await writeAsistenciaExcelRow({
      sector,
      empleadoNombre: session.userName,
      puesto: session.contextData?.puesto as string | null | undefined,
      referenceDate,
    }).catch((err: unknown) => {
      console.warn('[bot/gastronomia] excel_sync_error', { err })
      return { ok: false as const, code: 'unknown' as const, message: String(err) }
    })
    : null

  const syncResult = await writeAsistenciaAppRow({
    sector,
    empleadoNombre: session.userName,
    puesto: session.contextData?.puesto as string | null | undefined,
    canal: 'whatsapp',
    status: result.status,
  })

  const label = LABEL_MAP[accion]
  if (!syncResult.ok || (excelResult && !excelResult.ok)) {
    console.warn('[bot/gastronomia] attendance:sheet_partial', {
      empleadoId: session.userId,
      userName: session.userName,
      accion,
      sheetCode: syncResult.code,
      sheetMessage: syncResult.message ?? null,
      excelCode: excelResult?.code ?? null,
      excelMessage: excelResult?.message ?? null,
    })

    return [
      `✅ *${label} registrada en la app*`,
      ``,
      `${session.userName} — *${ahora}*`,
      result.status?.assignedLocalLabel ? `🏢 Local asignado: *${result.status.assignedLocalLabel}*` : '',
      `⚠️ La sincronización con la planilla quedó pendiente.`,
      `Si necesitás validarlo ahora, avisale al encargado.`,
      ``,
      `0️⃣  Volver`,
    ].filter(Boolean).join('\n')
  }

  return [
    `✅ *${label} registrada*`,
    ``,
    `${session.userName} — *${ahora}*`,
    result.status?.assignedLocalLabel ? `🏢 Local asignado: *${result.status.assignedLocalLabel}*` : '',
    `🧾 También quedó sincronizada en la planilla.`,
    ``,
    `0️⃣  Volver`,
  ].filter(Boolean).join('\n')
}
