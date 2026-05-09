import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockUpdate = vi.fn()
const mockAppend = vi.fn()

// Mock googleapis before importing the module under test
vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn().mockImplementation(() => ({
        getClient: vi.fn().mockResolvedValue({}),
      })),
    },
    sheets: vi.fn().mockReturnValue({
      spreadsheets: {
        values: {
          get: mockGet,
          update: mockUpdate,
          append: mockAppend,
        },
      },
    }),
  },
}))

describe('writePlanificacionCheckmark', () => {
  beforeEach(() => {
    vi.resetModules()
    mockGet.mockReset()
    mockUpdate.mockReset()
    mockAppend.mockReset()
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({ type: 'service_account' })
    process.env.GOOGLE_SHEETS_ID = 'test-sheet-id'
    process.env.GOOGLE_SHEETS_PLANIFICACION_NAME = 'Planificación'
    process.env.GOOGLE_GASTRONOMIA_SHEETS_ID = 'test-gastro-sheet-id'
    process.env.GOOGLE_GASTRONOMIA_ASISTENCIA_SHEET_NAME = 'Asistencia_App'
  })

  it('does not write if sheetsRow is null', async () => {
    const { writePlanificacionCheckmark } = await import('./sheets')
    await expect(writePlanificacionCheckmark(null, 'lunes')).resolves.not.toThrow()
  })

  it('calls sheets.values.update with correct cell range', async () => {
    const { google } = await import('googleapis')
    ;(google.sheets as any).mockReturnValue({
      spreadsheets: { values: { get: mockGet, update: mockUpdate, append: mockAppend } },
    })

    mockGet.mockResolvedValue({ data: { values: [['']] } })
    mockUpdate.mockResolvedValue({ data: {} })

    const { writePlanificacionCheckmark } = await import('./sheets')
    await writePlanificacionCheckmark(5, 'miercoles')

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        range: "Planificación!F5",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['✓']] },
      })
    )
  })
})

describe('writeAsistenciaAppRow', () => {
  beforeEach(() => {
    mockGet.mockResolvedValue({ data: { values: [['FECHA']] } })
    mockUpdate.mockResolvedValue({ data: {} })
    mockAppend.mockResolvedValue({ data: {} })
  })

  it('returns ok when the row sync succeeds', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { values: [['FECHA']] } })
      .mockResolvedValueOnce({ data: { values: [] } })

    const { writeAsistenciaAppRow } = await import('./sheets')
    const result = await writeAsistenciaAppRow({
      sector: 'brooklyn',
      empleadoNombre: 'Ana García',
      canal: 'whatsapp',
      status: { lastActionAt: new Date('2026-05-09T12:00:00Z') },
    })

    expect(result).toEqual({
      ok: true,
      code: 'ok',
      message: null,
    })
  })

  it('returns missing_credentials when service account json is absent', async () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON

    const { writeAsistenciaAppRow } = await import('./sheets')
    const result = await writeAsistenciaAppRow({
      sector: 'brooklyn',
      empleadoNombre: 'Ana García',
      canal: 'whatsapp',
      status: { lastActionAt: new Date('2026-05-09T12:00:00Z') },
    })

    expect(result.ok).toBe(false)
    expect(result.code).toBe('missing_credentials')
  })
})
