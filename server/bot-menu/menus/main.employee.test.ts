import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BotSession } from '../session'

const dbMock = vi.hoisted(() => ({
  initDb: vi.fn(async () => undefined),
  db: {
    delete: vi.fn(() => ({ run: vi.fn(async () => undefined) })),
    run: vi.fn(async () => undefined),
  },
  getTareasEmpleado: vi.fn(),
  listOperationalTasksByEmployee: vi.fn(),
  getReportes: vi.fn(),
  getEmpleadoAttendanceStatus: vi.fn(),
  listUnassignedLeads: vi.fn(),
}))

vi.mock('../../db', () => dbMock)

import { buildEmployeeMainMenu } from './main'

function employeeSession(name = 'Diego'): BotSession {
  return {
    id: 7,
    waNumber: '5491111111111',
    userType: 'employee',
    userId: 7,
    userName: name,
    currentMenu: 'main',
    contextData: {},
    menuHistory: [],
    lastActivityAt: new Date(),
    createdAt: new Date(),
  }
}

function dualEmployeeSession(name = 'Diego'): BotSession {
  return {
    ...employeeSession(name),
    contextData: {
      puedeGastronomia: true,
      gastroSector: 'brooklyn',
    },
  }
}

describe('employee bot main menu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbMock.getTareasEmpleado.mockResolvedValue([])
    dbMock.listOperationalTasksByEmployee.mockResolvedValue([])
  })

  it('renders the current-task-first menu with a concise task summary', async () => {
    dbMock.getTareasEmpleado.mockResolvedValue([
      {
        id: 101,
        titulo: 'Limpieza baño planta alta',
        local: 'Baños',
        prioridad: 'media',
        estado: 'en_progreso',
        asignacionEstado: 'aceptada',
      },
    ])
    dbMock.listOperationalTasksByEmployee.mockResolvedValue([
      {
        id: 202,
        titulo: 'Control baños',
        ubicacion: 'Pasillo norte',
        prioridad: 'alta',
        estado: 'pendiente_confirmacion',
      },
    ])

    const menu = await buildEmployeeMainMenu(employeeSession('Diego'))

    expect(menu).toContain('👷 *Diego* — Menú principal')
    expect(menu).toContain('🎯 Siguiente: Op. #202 — Control baños')
    expect(menu).toContain('📋 Tenés 2 tareas activas (1 por aceptar, 1 en curso)')
    expect(menu).toContain('1️⃣  🎯 Ver mi tarea actual')
    expect(menu).toContain('2️⃣  📋 Ver todas mis tareas')
    expect(menu).toContain('3️⃣  🕐 Registrar asistencia')
    expect(menu).toContain('4️⃣  🚻 Control de baños')
  })

  it('renders an empty state when the employee has no active tasks', async () => {
    const menu = await buildEmployeeMainMenu(employeeSession('Sofía'))

    expect(menu).toContain('👷 *Sofía* — Menú principal')
    expect(menu).toContain('✅ No tenés tareas activas ahora.')
    expect(menu).toContain('1️⃣  🎯 Ver mi tarea actual')
    expect(menu).toContain('2️⃣  📋 Ver todas mis tareas')
  })

  it('adds the dual attendance option for employees with gastronomy access', async () => {
    const menu = await buildEmployeeMainMenu(dualEmployeeSession('Diego'))

    expect(menu).toContain('5️⃣  🔀 Cambiar de área')
  })
})
