import { describe, expect, it, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  registerEmpleadoAttendanceMock: vi.fn(),
  writeAsistenciaAppRowMock: vi.fn(),
  writeAsistenciaExcelRowMock: vi.fn(),
}))

vi.mock('../../../db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../db')>()
  return {
    ...actual,
    registerEmpleadoAttendance: mocks.registerEmpleadoAttendanceMock,
  }
})

vi.mock('../../../gastronomia/sheets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../gastronomia/sheets')>()
  return {
    ...actual,
    writeAsistenciaAppRow: mocks.writeAsistenciaAppRowMock,
  }
})

vi.mock('../../../gastronomia/excel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../gastronomia/excel')>()
  return {
    ...actual,
    writeAsistenciaExcelRow: mocks.writeAsistenciaExcelRowMock,
  }
})

import { handleGastronomia } from './handler'

describe('handleGastronomia', () => {
  beforeEach(() => {
    mocks.registerEmpleadoAttendanceMock.mockReset()
    mocks.writeAsistenciaAppRowMock.mockReset()
    mocks.writeAsistenciaExcelRowMock.mockReset()
    mocks.writeAsistenciaExcelRowMock.mockResolvedValue({
      ok: true,
      code: 'ok',
      message: null,
    })
  })

  it('reports partial success when app saves but sheets sync fails', async () => {
    mocks.registerEmpleadoAttendanceMock.mockResolvedValue({
      success: true,
      code: 'ok',
      status: {
        assignedSector: 'brooklyn',
        assignedLocalLabel: 'Brooklyn',
        lastAction: 'entrada',
        lastActionAt: new Date('2026-05-09T12:00:00Z'),
      },
    })
    mocks.writeAsistenciaAppRowMock.mockResolvedValue({
      ok: false,
      code: 'api_error',
      message: 'quota exceeded',
    })

    const reply = await handleGastronomia({
      userId: 7,
      userName: 'Ana García',
      contextData: { sector: 'brooklyn', puesto: 'Cajera' },
    } as any, '1')

    expect(reply).toContain('registrada en la app')
    expect(reply).toContain('planilla')
  })

  it('reports partial success when the Excel payroll template cannot be marked', async () => {
    mocks.registerEmpleadoAttendanceMock.mockResolvedValue({
      success: true,
      code: 'ok',
      status: {
        assignedSector: 'brooklyn',
        assignedLocalLabel: 'Brooklyn',
        lastAction: 'entrada',
        lastActionAt: new Date('2026-05-09T12:00:00Z'),
      },
    })
    mocks.writeAsistenciaAppRowMock.mockResolvedValue({
      ok: true,
      code: 'ok',
      message: null,
    })
    mocks.writeAsistenciaExcelRowMock.mockResolvedValue({
      ok: false,
      code: 'employee_not_found',
      message: 'No se encontro fila para Ana Garcia en Brooklyn',
    })

    const reply = await handleGastronomia({
      userId: 7,
      userName: 'Ana García',
      contextData: { sector: 'brooklyn', puesto: 'Cajera' },
    } as any, '1')

    expect(reply).toContain('registrada en la app')
    expect(reply).toContain('sincronización con la planilla quedó pendiente')
  })

  it('reports full success when app and sheets sync both succeed', async () => {
    mocks.registerEmpleadoAttendanceMock.mockResolvedValue({
      success: true,
      code: 'ok',
      status: {
        assignedSector: 'brooklyn',
        assignedLocalLabel: 'Brooklyn',
        lastAction: 'entrada',
        lastActionAt: new Date('2026-05-09T12:00:00Z'),
      },
    })
    mocks.writeAsistenciaAppRowMock.mockResolvedValue({
      ok: true,
      code: 'ok',
      message: null,
    })

    const reply = await handleGastronomia({
      userId: 7,
      userName: 'Ana García',
      contextData: { sector: 'brooklyn', puesto: 'Cajera' },
    } as any, '1')

    expect(reply).toContain('Entrada registrada')
    expect(reply).toContain('sincronizada en la planilla')
  })
})
