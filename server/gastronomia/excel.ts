/**
 * Writes attendance rows to an OneDrive Excel file via Microsoft Graph API.
 * Uses OAuth2 refresh token flow — no file download/upload needed.
 * Graph Excel API writes directly to cells.
 */

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'

// Extracted from: https://excel.cloud.microsoft/open/onedrive/?docId=BD6EFBDE79F39AEE%21sd37295d1360c4261a9d28650b8fde5eb&driveId=BD6EFBDE79F39AEE
const DEFAULT_DRIVE_ID = 'BD6EFBDE79F39AEE'
const DEFAULT_ITEM_ID  = 'BD6EFBDE79F39AEE!sd37295d1360c4261a9d28650b8fde5eb'

const ASISTENCIA_SHEET_NAME = 'Asistencia'
const HEADERS = ['FECHA', 'DIA', 'LOCAL', 'EMPLEADO', 'PUESTO', '✓']
const ATTENDANCE_PRESENT_VALUE = 'Presente'

const LOCAL_LABELS: Record<string, string> = {
  uno_grill:   'UMO Grill',
  brooklyn:    'Brooklyn',
  heladeria:   'Heladería',
  trento_cafe: 'Trento Café',
  inflables:   'Inflables',
  encargados:  'Encargados',
  promotoras:  'Promotoras',
}

// ── Auth ──────────────────────────────────────────────────────────────────────

let cachedAccessToken: string | null = null
let tokenExpiresAt = 0
let currentRefreshToken: string | null = null // updated on token rotation

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedAccessToken && now < tokenExpiresAt - 60_000) return cachedAccessToken

  const clientId = process.env.MICROSOFT_CLIENT_ID
  const refreshToken = currentRefreshToken ?? process.env.MICROSOFT_REFRESH_TOKEN

  if (!clientId || !refreshToken) {
    throw new Error('MICROSOFT_CLIENT_ID or MICROSOFT_REFRESH_TOKEN not set')
  }

  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    client_id:     clientId,
    refresh_token: refreshToken,
    scope:         'https://graph.microsoft.com/Files.ReadWrite offline_access',
  })

  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
  if (clientSecret) body.set('client_secret', clientSecret)

  const res = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token refresh failed: ${res.status} — ${text}`)
  }

  const data = await res.json() as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }

  cachedAccessToken = data.access_token
  tokenExpiresAt = now + data.expires_in * 1000

  if (data.refresh_token && data.refresh_token !== refreshToken) {
    currentRefreshToken = data.refresh_token
    // Refresh token rotated — update MICROSOFT_REFRESH_TOKEN env var in Railway
    console.warn('[excel] Microsoft refresh token rotated — update MICROSOFT_REFRESH_TOKEN')
  }

  return cachedAccessToken
}

// ── Graph helpers ─────────────────────────────────────────────────────────────

function workbookUrl(): string {
  const driveId = process.env.ONEDRIVE_ASISTENCIA_DRIVE_ID ?? DEFAULT_DRIVE_ID
  const itemId  = process.env.ONEDRIVE_ASISTENCIA_ITEM_ID  ?? DEFAULT_ITEM_ID
  return `${GRAPH_BASE}/drives/${driveId}/items/${encodeURIComponent(itemId)}/workbook`
}

async function graphGet<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Graph GET ${url}: ${res.status} — ${text}`)
  }
  return res.json() as Promise<T>
}

async function graphPatch(url: string, token: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Graph PATCH ${url}: ${res.status} — ${text}`)
  }
}

async function graphPost(url: string, token: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Graph POST ${url}: ${res.status} — ${text}`)
  }
}

// ── Sheet management ──────────────────────────────────────────────────────────

async function ensureSheet(token: string): Promise<void> {
  const data = await graphGet<{ value: Array<{ name: string }> }>(
    `${workbookUrl()}/worksheets`,
    token,
  )
  const exists = data.value.some(ws => ws.name === ASISTENCIA_SHEET_NAME)
  if (exists) return

  await graphPost(`${workbookUrl()}/worksheets`, token, { name: ASISTENCIA_SHEET_NAME })
  await graphPatch(
    `${workbookUrl()}/worksheets('${ASISTENCIA_SHEET_NAME}')/range(address='A1:F1')`,
    token,
    { values: [HEADERS] },
  )
}

function excelSheetRef(name: string): string {
  return name.replace(/'/g, "''")
}

async function getWorksheetNames(token: string): Promise<string[]> {
  const data = await graphGet<{ value: Array<{ name: string }> }>(
    `${workbookUrl()}/worksheets`,
    token,
  )
  return data.value.map(ws => ws.name)
}

async function getUsedRange(
  token: string,
  sheetName = ASISTENCIA_SHEET_NAME,
): Promise<{ values: string[][]; rowCount: number }> {
  try {
    const data = await graphGet<{ values: string[][]; rowCount: number }>(
      `${workbookUrl()}/worksheets('${excelSheetRef(sheetName)}')/usedRange`,
      token,
    )
    return { values: data.values ?? [], rowCount: data.rowCount ?? 0 }
  } catch {
    // Sheet empty or no used range
    return { values: [], rowCount: 0 }
  }
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase()
}

function getBaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date)

  return {
    day: Number(parts.find(part => part.type === 'day')?.value ?? date.getDate()),
    month: Number(parts.find(part => part.type === 'month')?.value ?? date.getMonth() + 1),
  }
}

function cellMatchesDay(value: unknown, referenceDate: Date): boolean {
  const text = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  if (!text) return false

  const { day, month } = getBaDateParts(referenceDate)
  const dayPattern = String(day).padStart(1, '0')
  const monthPattern = String(month).padStart(1, '0')
  const monthPadded = String(month).padStart(2, '0')
  const dayPadded = String(day).padStart(2, '0')

  return new RegExp(`(^|\\D)${dayPattern}\\s*/\\s*${monthPattern}(\\D|$)`).test(text)
    || new RegExp(`(^|\\D)${dayPadded}\\s*/\\s*${monthPadded}(\\D|$)`).test(text)
    || new RegExp(`(^|\\D)${dayPadded}\\s*/\\s*${monthPattern}(\\D|$)`).test(text)
    || new RegExp(`(^|\\D)${dayPattern}\\s*/\\s*${monthPadded}(\\D|$)`).test(text)
}

function columnLetter(index: number): string {
  let value = index + 1
  let result = ''
  while (value > 0) {
    const remainder = (value - 1) % 26
    result = String.fromCharCode(65 + remainder) + result
    value = Math.floor((value - 1) / 26)
  }
  return result
}

export function findAttendanceTemplateCell(params: {
  values: unknown[][]
  local: string
  empleadoNombre: string
  referenceDate: Date
}): { address: string; rowNumber: number; columnIndex: number } | null {
  const localNeedle = normalizeText(params.local)
  const employeeNeedle = normalizeText(params.empleadoNombre)
  if (!localNeedle || !employeeNeedle) return null

  for (let headerIndex = 0; headerIndex < params.values.length; headerIndex++) {
    const header = params.values[headerIndex] ?? []
    const localCol = header.findIndex(cell => normalizeText(cell) === 'local')
    const employeeCol = header.findIndex(cell => normalizeText(cell) === 'empleado')
    const dayCol = header.findIndex(cell => cellMatchesDay(cell, params.referenceDate))

    if (localCol < 0 || employeeCol < 0 || dayCol < 0) continue

    for (let rowIndex = headerIndex + 1; rowIndex < params.values.length; rowIndex++) {
      const row = params.values[rowIndex] ?? []
      const localCell = normalizeText(row[localCol])
      const employeeCell = normalizeText(row[employeeCol])

      if (!localCell && !employeeCell) continue

      if (localCell === localNeedle && employeeCell === employeeNeedle) {
        const rowNumber = rowIndex + 1
        return {
          address: `${columnLetter(dayCol)}${rowNumber}`,
          rowNumber,
          columnIndex: dayCol,
        }
      }
    }
  }

  return null
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function formatBaDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date)
}

function formatBaDia(date: Date): string {
  const raw = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
  }).format(date)
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

// ── Public API ────────────────────────────────────────────────────────────────

export type GastronomiaExcelResult = {
  ok: boolean
  code: 'ok' | 'missing_credentials' | 'file_not_found' | 'template_not_found' | 'employee_not_found' | 'api_error' | 'unknown'
  message?: string | null
}

export async function writeAsistenciaExcelRow(params: {
  sector?: string | null
  empleadoNombre: string
  puesto?: string | null
  referenceDate?: Date | null
}): Promise<GastronomiaExcelResult> {
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_REFRESH_TOKEN) {
    return { ok: false, code: 'missing_credentials', message: 'MICROSOFT_CLIENT_ID or MICROSOFT_REFRESH_TOKEN not set' }
  }

  try {
    const token = await getAccessToken()

    const refDate = params.referenceDate ?? new Date()
    const local   = LOCAL_LABELS[params.sector ?? ''] ?? (params.sector ?? '')
    const empleado = params.empleadoNombre

    const preferredSheet = process.env.ONEDRIVE_ASISTENCIA_SHEET_NAME ?? ASISTENCIA_SHEET_NAME
    const worksheetNames = await getWorksheetNames(token)
    const resolvedPreferredSheet = worksheetNames.find(name => normalizeText(name) === normalizeText(preferredSheet)) ?? preferredSheet
    const targetSheets = Array.from(new Set([
      resolvedPreferredSheet,
      ...worksheetNames.filter(name => normalizeText(name).startsWith('sueldos')),
      ...worksheetNames.filter(name => normalizeText(name) !== normalizeText(resolvedPreferredSheet)),
    ])).filter(name => worksheetNames.includes(name))

    let match: { sheetName: string; address: string } | null = null
    let sawAttendanceTemplate = false

    for (const sheetName of targetSheets) {
      const { values } = await getUsedRange(token, sheetName)
      const hasTemplateHeader = values.some(row =>
        row.some(cell => normalizeText(cell) === 'local')
        && row.some(cell => normalizeText(cell) === 'empleado')
        && row.some(cell => cellMatchesDay(cell, refDate))
      )
      if (hasTemplateHeader) sawAttendanceTemplate = true

      const cell = findAttendanceTemplateCell({
        values,
        local,
        empleadoNombre: empleado,
        referenceDate: refDate,
      })
      if (cell) {
        match = { sheetName, address: cell.address }
        break
      }
    }

    if (!match) {
      return {
        ok: false,
        code: sawAttendanceTemplate ? 'employee_not_found' : 'template_not_found',
        message: sawAttendanceTemplate
          ? `No se encontro fila para ${empleado} en ${local}`
          : 'No se encontro una plantilla de asistencia con la fecha del periodo',
      }
    }

    await graphPatch(
      `${workbookUrl()}/worksheets('${excelSheetRef(match.sheetName)}')/range(address='${match.address}')`,
      token,
      { values: [[ATTENDANCE_PRESENT_VALUE]] },
    )

    return { ok: true, code: 'ok' }
  } catch (error: any) {
    const message = error?.message ?? 'Unknown error'
    const lowered  = String(message).toLowerCase()
    const code: GastronomiaExcelResult['code'] =
      lowered.includes('not found') || lowered.includes('404')
        ? 'file_not_found'
        : lowered.includes('401') || lowered.includes('403') || lowered.includes('token') || lowered.includes('unauthorized')
          ? 'missing_credentials'
          : 'api_error'
    console.error('[excel] Asistencia write failed:', { code, message, empleadoNombre: params.empleadoNombre })
    return { ok: false, code, message }
  }
}
