import { google } from 'googleapis'

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
