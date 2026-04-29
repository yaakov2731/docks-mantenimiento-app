import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BotSession } from '../../session'

const dbMock = vi.hoisted(() => ({
  initDb: vi.fn(async () => undefined),
  db: {
    delete: vi.fn(() => ({ run: vi.fn(async () => undefined) })),
    run: vi.fn(async () => undefined),
  },
  getTareasEmpleado: vi.fn(),
  listOperationalTasksByEmployee: vi.fn(),
  getReporteById: vi.fn(),
  iniciarTrabajoReporte: vi.fn(),
  pausarTrabajoReporte: vi.fn(),
  completarTrabajoReporte: vi.fn(),
  actualizarReporte: vi.fn(),
  crearActualizacion: vi.fn(),
  getOperationalTaskById: vi.fn(),
  enqueueBotMessage: vi.fn(),
  addOperationalTaskEvent: vi.fn(),
}))

const tasksServiceMock = vi.hoisted(() => ({
  acceptTask: vi.fn(),
  resumeTask: vi.fn(),
  pauseTask: vi.fn(),
  finishTask: vi.fn(),
  cancelTask: vi.fn(),
  rejectTask: vi.fn(),
}))

const sessionMock = vi.hoisted(() => ({
  navigateTo: vi.fn(async () => undefined),
  navigateBack: vi.fn(async () => ({ session: null, previousMenu: 'main' })),
}))

vi.mock('../../../db', () => dbMock)
vi.mock('../../../tasks/service', () => ({
  createOperationalTasksService: vi.fn(() => tasksServiceMock),
}))
vi.mock('../../../_core/notification', () => ({
  notifyOwner: vi.fn(() => Promise.resolve()),
}))
vi.mock('../../session', async () => {
  const actual = await vi.importActual<typeof import('../../session')>('../../session')
  return {
    ...actual,
    navigateTo: sessionMock.navigateTo,
    navigateBack: sessionMock.navigateBack,
  }
})

import { buildTareasLista, handleTareasLista } from './tareas'

function employeeSession(page = 1): BotSession {
  return {
    id: 7,
    waNumber: '5491111111111',
    userType: 'employee',
    userId: 7,
    userName: 'Walter',
    currentMenu: 'tareas_lista',
    contextData: { page },
    menuHistory: ['main'],
    lastActivityAt: new Date(),
    createdAt: new Date(),
  }
}

function makeReporte(id: number) {
  return {
    id,
    titulo: `Tarea ${id}`,
    local: `Local ${id}`,
    planta: 'PB',
    prioridad: 'media',
    estado: 'pendiente',
    asignacionEstado: 'aceptada',
    descripcion: `Descripcion ${id}`,
    trabajoAcumuladoSegundos: 0,
    createdAt: new Date(`2026-04-${String(id).padStart(2, '0')}T10:00:00.000Z`),
  }
}

describe('employee task list pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbMock.getTareasEmpleado.mockResolvedValue([
      makeReporte(1),
      makeReporte(2),
      makeReporte(3),
      makeReporte(4),
      makeReporte(5),
      makeReporte(6),
      makeReporte(7),
    ])
    dbMock.listOperationalTasksByEmployee.mockResolvedValue([])
    dbMock.getReporteById.mockImplementation(async (id: number) => makeReporte(id))
  })

  it('renders page-local numbering on later pages so task options do not collide with pagination controls', async () => {
    const menu = await buildTareasLista(employeeSession(2))

    expect(menu).toContain('1️⃣  🟡 Rec. #6 — Tarea 6')
    expect(menu).toContain('2️⃣  🟡 Rec. #7 — Tarea 7')
    expect(menu).not.toContain('6️⃣  🟡 Rec. #6 — Tarea 6')
    expect(menu).not.toContain('7️⃣  🟡 Rec. #7 — Tarea 7')
    expect(menu).toContain('8️⃣  ◀️ Página anterior')
  })

  it('opens the correct task when selecting the first option on the second page', async () => {
    const result = await handleTareasLista(employeeSession(2), '1')

    expect(sessionMock.navigateTo).toHaveBeenCalledWith(expect.any(Object), 'tarea_detalle', {
      tareaId: 6,
      origen: 'reclamo',
      page: 1,
    })
    expect(result).toContain('📌 *Reclamo #6*')
  })
})
