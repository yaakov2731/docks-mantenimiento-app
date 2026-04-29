import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BotSession } from '../../session'

const dbMock = vi.hoisted(() => ({
  initDb: vi.fn(async () => undefined),
  db: {
    delete: vi.fn(() => ({ run: vi.fn(async () => undefined) })),
    run: vi.fn(async () => undefined),
  },
  getEmpleadoAttendanceStatus: vi.fn(),
  registerEmpleadoAttendance: vi.fn(),
}))

const assignmentMock = vi.hoisted(() => ({
  autoDistributePoolTasksOnEntry: vi.fn(),
}))

vi.mock('../../../db', () => dbMock)
vi.mock('../../../operational-task-assignment', () => assignmentMock)

import { handleAsistencia } from './asistencia'

function employeeSession(): BotSession {
  return {
    id: 7,
    waNumber: '5491111111111',
    userType: 'employee',
    userId: 7,
    userName: 'Walter',
    currentMenu: 'asistencia',
    contextData: {},
    menuHistory: ['main'],
    lastActivityAt: new Date(),
    createdAt: new Date(),
  }
}

describe('attendance menu text shortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbMock.getEmpleadoAttendanceStatus.mockResolvedValue({
      onShift: true,
      onLunch: false,
      lastEntryAt: '2026-04-25T11:00:00.000Z',
      workedSecondsToday: 3600,
      todayLunchSeconds: 0,
    })
    dbMock.registerEmpleadoAttendance.mockResolvedValue({
      success: true,
      code: 'ok',
      status: {
        workedSecondsToday: 3600,
        todayLunchSeconds: 0,
      },
    })
    assignmentMock.autoDistributePoolTasksOnEntry.mockResolvedValue([])
  })

  it('accepts "salida" as a valid attendance action', async () => {
    const reply = await handleAsistencia(employeeSession(), 'salida')

    expect(dbMock.registerEmpleadoAttendance).toHaveBeenCalledWith(7, 'salida', 'whatsapp')
    expect(reply).toContain('Salida registrada')
  })

  it('shows the correct friendly message for lowercase attendance error codes', async () => {
    dbMock.registerEmpleadoAttendance.mockResolvedValue({
      success: false,
      code: 'not_on_shift',
      status: {
        onShift: false,
        onLunch: false,
      },
    })

    const reply = await handleAsistencia(employeeSession(), 'salida')

    expect(reply).toContain('Primero registrá la entrada')
  })
})
