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

import {
  buildAdminMainMenu,
  buildAdminOperationMenu,
  buildAdminReclamosMenu,
} from './main'

function adminSession(name = 'Juan'): BotSession {
  return {
    id: 1,
    waNumber: '5491111111111',
    userType: 'admin',
    userId: 1,
    userName: name,
    currentMenu: 'main',
    contextData: {},
    menuHistory: [],
    lastActivityAt: new Date(),
    createdAt: new Date(),
  }
}

describe('admin bot main menu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbMock.getReportes.mockResolvedValue([])
    dbMock.listUnassignedLeads.mockResolvedValue([])
  })

  it('renders a compact executive welcome with four category options', async () => {
    dbMock.getReportes.mockResolvedValue([
      { estado: 'pendiente', prioridad: 'urgente', asignadoId: null },
      { estado: 'en_progreso', prioridad: 'media', asignadoId: 3 },
      { estado: 'completado', prioridad: 'urgente', asignadoId: null },
    ])
    dbMock.listUnassignedLeads.mockResolvedValue([{ id: 10 }])

    const menu = await buildAdminMainMenu(adminSession('Juan'))

    expect(menu).toContain('👔 Hola, Juan. Panel de administración')
    expect(menu).toContain('📋 Abiertos: 2 | 🔴 Urgentes: 1 | 🎯 Leads: 1')
    expect(menu).toContain('Elegí un área:')
    expect(menu).toContain('1️⃣  Reclamos')
    expect(menu).toContain('2️⃣  Operación diaria')
    expect(menu).toContain('3️⃣  Rondas de baños')
    expect(menu).toContain('4️⃣  Comercial')
    expect(menu).not.toContain('5️⃣')
    expect(menu).not.toContain('9️⃣')
    expect(menu).not.toContain('Tareas vencidas')
  })

  it('renders zero counters without expanding the menu', async () => {
    const menu = await buildAdminMainMenu(adminSession('Sofía'))

    expect(menu).toContain('👔 Hola, Sofía. Panel de administración')
    expect(menu).toContain('📋 Abiertos: 0 | 🔴 Urgentes: 0 | 🎯 Leads: 0')
    expect(menu).toContain('4️⃣  Comercial')
  })
})

describe('admin category submenus', () => {
  it('renders the reclamos category actions', () => {
    const menu = buildAdminReclamosMenu(adminSession())

    expect(menu).toContain('📋 *Reclamos*')
    expect(menu).toContain('1️⃣  Ver pendientes')
    expect(menu).toContain('2️⃣  Urgentes sin asignar')
    expect(menu).toContain('3️⃣  Sin asignar')
    expect(menu).toContain('4️⃣  SLA vencidos')
    expect(menu).toContain('0️⃣  Volver')
  })

  it('renders the daily operations category actions', () => {
    const menu = buildAdminOperationMenu(adminSession())

    expect(menu).toContain('📊 *Operación diaria*')
    expect(menu).toContain('1️⃣  Estado general del día')
    expect(menu).toContain('2️⃣  Asignar tarea a empleado')
    expect(menu).toContain('0️⃣  Volver')
  })
})
