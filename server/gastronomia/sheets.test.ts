import { describe, it, expect, vi, beforeEach } from 'vitest'

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
          get: vi.fn().mockResolvedValue({ data: { values: [['✓']] } }),
          update: vi.fn().mockResolvedValue({ data: {} }),
        },
      },
    }),
  },
}))

describe('writePlanificacionCheckmark', () => {
  beforeEach(() => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({ type: 'service_account' })
    process.env.GOOGLE_SHEETS_ID = 'test-sheet-id'
    process.env.GOOGLE_SHEETS_PLANIFICACION_NAME = 'Planificación'
  })

  it('does not write if sheetsRow is null', async () => {
    const { writePlanificacionCheckmark } = await import('./sheets')
    await expect(writePlanificacionCheckmark(null, 'lunes')).resolves.not.toThrow()
  })

  it('calls sheets.values.update with correct cell range', async () => {
    const { google } = await import('googleapis')
    const mockUpdate = vi.fn().mockResolvedValue({ data: {} })
    const mockGet = vi.fn().mockResolvedValue({ data: { values: [['']] } })
    ;(google.sheets as any).mockReturnValue({
      spreadsheets: { values: { get: mockGet, update: mockUpdate } },
    })

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
