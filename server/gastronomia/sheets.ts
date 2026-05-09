import { google } from 'googleapis'

export type GastronomiaSyncResult = {
  ok: boolean
  code: 'ok' | 'missing_credentials' | 'sheet_not_found' | 'api_error' | 'unknown'
  message?: string | null
}

const DAY_COLUMN_MAP: Record<string, string> = {
  lunes:     'D',
  martes:    'E',
  miercoles: 'F',
  jueves:    'G',
  viernes:   'H',
  sabado:    'I',
  domingo:   'J',
}

function getDayKey(date: Date): string {
  const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  return days[date.getDay()]
}

export function getTodayDayKey(): string {
  return getDayKey(new Date())
}

function getSheetClient() {
  const credJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!credJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set')

  const credentials = JSON.parse(credJson)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

const GASTRONOMIA_SPREADSHEET_ID = '1BZFMAjeXCM1bjIgWZ8kVl_4bDyYkB5gw1-9k2ZyEkG0'

const ASISTENCIA_APP_SHEET_COLUMNS = [
  'FECHA',
  'DIA',
  'LOCAL',
  'EMPLEADO',
  'PUESTO',
  'ENTRADA',
  'SALIDA',
  'ALMUERZO',
  'HORAS',
  'CANAL',
  'ESTADO',
  'ACTUALIZADO',
  'ORIGEN',
] as const

const SHEET_LOCAL_LABELS: Record<string, string> = {
  uno_grill: 'UMO Grill',
  brooklyn: 'Brooklyn',
  heladeria: 'Heladería',
  trento_cafe: 'Trento Café',
  inflables: 'Inflables',
  encargados: 'Encargados',
  promotoras: 'Promotoras',
}

function getGastronomiaSpreadsheetId() {
  return process.env.GOOGLE_GASTRONOMIA_SHEETS_ID
    ?? process.env.GOOGLE_SHEETS_ID
    ?? GASTRONOMIA_SPREADSHEET_ID
}

function getAsistenciaAppSheetName() {
  return process.env.GOOGLE_GASTRONOMIA_ASISTENCIA_SHEET_NAME ?? 'Asistencia_App'
}

function formatBaDate(value?: Date | string | null) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatBaTime(value?: Date | string | null) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function formatWeekdayLabel(value?: Date | string | null) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
  }).format(date)
}

function formatHoursFromSeconds(value?: number | null) {
  if (!value || value <= 0) return ''
  return (value / 3600).toFixed(2)
}

function buildLunchLabel(status: any) {
  const start = formatBaTime(status?.lastLunchStartAt)
  const end = formatBaTime(status?.lastLunchEndAt)
  if (start && end) return `${start}-${end}`
  if (start) return `${start}-`
  return ''
}

function buildEstadoLabel(status: any) {
  if (!status) return 'Sin estado'
  if (status.onLunch) return 'En almuerzo'
  if (status.onShift) return 'En turno'
  if (status.lastAction === 'salida') return 'Salida registrada'
  if (status.lastAction === 'entrada') return 'Entrada registrada'
  if (status.lastAction === 'inicio_almuerzo') return 'Inicio almuerzo'
  if (status.lastAction === 'fin_almuerzo') return 'Fin almuerzo'
  return 'Actualizado'
}

async function ensureAsistenciaAppHeader(sheets: ReturnType<typeof google.sheets>, spreadsheetId: string, sheetName: string) {
  const headerRange = `${sheetName}!A1:M1`
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: headerRange,
  })
  const firstRow = existing.data.values?.[0] ?? []
  if (firstRow.length > 0) return

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: headerRange,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [Array.from(ASISTENCIA_APP_SHEET_COLUMNS)] },
  })
}

export async function writeAsistenciaAppRow(params: {
  sector?: string | null
  empleadoNombre: string
  puesto?: string | null
  canal?: string | null
  status?: any
}): Promise<GastronomiaSyncResult> {
  const spreadsheetId = getGastronomiaSpreadsheetId()
  if (!spreadsheetId) {
    return {
      ok: false,
      code: 'sheet_not_found',
      message: 'GOOGLE_GASTRONOMIA_SHEETS_ID not set',
    }
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return {
      ok: false,
      code: 'missing_credentials',
      message: 'GOOGLE_SERVICE_ACCOUNT_JSON not set',
    }
  }

  try {
    const sheets = getSheetClient()
    const sheetName = getAsistenciaAppSheetName()
    await ensureAsistenciaAppHeader(sheets, spreadsheetId, sheetName)

    const referenceDate = params.status?.lastActionAt
      ?? params.status?.lastEntryAt
      ?? params.status?.lastExitAt
      ?? new Date()
    const fecha = formatBaDate(referenceDate)
    const localLabel = SHEET_LOCAL_LABELS[params.sector ?? ''] ?? (params.sector ?? '')
    const updatedAt = formatBaDate(new Date())
    const updatedTime = formatBaTime(new Date())

    const rowValues = [
      fecha,
      formatWeekdayLabel(referenceDate),
      localLabel,
      params.empleadoNombre,
      params.puesto ?? '',
      formatBaTime(params.status?.lastEntryAt),
      formatBaTime(params.status?.lastExitAt),
      buildLunchLabel(params.status),
      formatHoursFromSeconds(params.status?.workedSecondsToday ?? params.status?.currentShiftSeconds ?? params.status?.lastShiftWorkedSeconds),
      params.canal ?? 'whatsapp',
      buildEstadoLabel(params.status),
      `${updatedAt} ${updatedTime}`.trim(),
      'app_bot_gastronomia',
    ]

    const dataRange = `${sheetName}!A2:M`
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: dataRange,
    })
    const values = existing.data.values ?? []
    const rowIndex = values.findIndex(row =>
      (row[0] ?? '') === fecha
      && (row[2] ?? '') === localLabel
      && (row[3] ?? '') === params.empleadoNombre
    )

    if (rowIndex >= 0) {
      const range = `${sheetName}!A${rowIndex + 2}:M${rowIndex + 2}`
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowValues] },
      })
      return { ok: true, code: 'ok', message: null }
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:M`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [rowValues] },
    })
    return { ok: true, code: 'ok', message: null }
  } catch (error: any) {
    const message = error?.message ?? 'Unknown sheets error'
    const lowered = String(message).toLowerCase()
    const code: GastronomiaSyncResult['code'] =
      lowered.includes('unable to parse range') || lowered.includes('not found')
        ? 'sheet_not_found'
        : lowered.includes('google') || lowered.includes('api') || lowered.includes('quota')
          ? 'api_error'
          : 'unknown'

    console.error('[sheets] failed to sync Asistencia_App row:', {
      code,
      message,
      empleadoNombre: params.empleadoNombre,
      sector: params.sector ?? null,
    })
    return { ok: false, code, message }
  }
}

export async function writePlanificacionCheckmark(
  sheetsRow: number | null | undefined,
  dayKey: string
): Promise<void> {
  if (!sheetsRow) return

  const sheetsId = process.env.GOOGLE_SHEETS_ID
  const sheetName = process.env.GOOGLE_SHEETS_PLANIFICACION_NAME ?? 'Planificación'

  if (!sheetsId) {
    console.warn('[sheets] GOOGLE_SHEETS_ID not set — skipping write')
    return
  }

  const col = DAY_COLUMN_MAP[dayKey]
  if (!col) {
    console.warn(`[sheets] Unknown day key: ${dayKey}`)
    return
  }

  const range = `${sheetName}!${col}${sheetsRow}`

  try {
    const sheets = getSheetClient()

    // Idempotent: only write if cell is empty
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetsId,
      range,
    })
    const currentValue = existing.data.values?.[0]?.[0] ?? ''
    if (currentValue === '✓') return

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetsId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['✓']] },
    })
    console.log(`[sheets] wrote ✓ at ${range}`)
  } catch (err) {
    console.error(`[sheets] failed to write checkmark at ${range}:`, err)
    // Non-fatal: attendance is already saved in DB
  }
}
