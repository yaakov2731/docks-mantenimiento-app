import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BotSession } from '../../session'

const sessionMock = vi.hoisted(() => ({
  navigateTo: vi.fn(),
  navigateBack: vi.fn(),
}))

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

vi.mock('../../session', () => sessionMock)
vi.mock('../../../db', () => dbMock)
vi.mock('../../../tasks/service', () => ({
  createOperationalTasksService: vi.fn(() => tasksServiceMock),
}))
vi.mock('../../../_core/notification', () => ({
  notifyOwner: vi.fn(() => Promise.resolve()),
}))

import { buildTareaActual, handleTareaActual } from './tareas'

function employeeSession(): BotSession {
  return {
    id: 7,
    waNumber: '5491111111111',
    userType: 'employee',
    userId: 7,
    userName: 'Diego',
    currentMenu: 'tarea_actual',
    contextData: {},
    menuHistory: ['main'],
    lastActivityAt: new Date(),
    createdAt: new Date(),
  }
}

describe('employee current task screen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbMock.getTareasEmpleado.mockResolvedValue([])
    dbMock.listOperationalTasksByEmployee.mockResolvedValue([])
    sessionMock.navigateTo.mockResolvedValue(undefined)
    sessionMock.navigateBack.mockResolvedValue({ session: employeeSession(), previousMenu: 'main' })
  })

  it('prioritizes a task pending confirmation and offers direct acceptance', async () => {
    dbMock.getTareasEmpleado.mockResolvedValue([
      {
        id: 101,
        titulo: 'Limpieza baño planta alta',
        local: 'Baños',
        prioridad: 'media',
        estado: 'en_progreso',
        asignacionEstado: 'aceptada',
        descripcion: 'Repaso completo',
      },
    ])
    dbMock.listOperationalTasksByEmployee.mockResolvedValue([
      {
        id: 202,
        titulo: 'Control baños',
        ubicacion: 'Pasillo norte',
        prioridad: 'alta',
        estado: 'pendiente_confirmacion',
        descripcion: 'Verificar insumos',
      },
    ])
    dbMock.getOperationalTaskById.mockResolvedValue({
      id: 202,
      titulo: 'Control baños',
      ubicacion: 'Pasillo norte',
      prioridad: 'alta',
      estado: 'pendiente_confirmacion',
      descripcion: 'Verificar insumos',
      checklistObjetivo: 'Reponer jabón',
    })

    const menu = await buildTareaActual(employeeSession())

    expect(menu).toContain('🎯 *Tu tarea actual*')
    expect(menu).toContain('Op. #202')
    expect(menu).toContain('Pendiente de confirmación')
    expect(menu).toContain('1️⃣  ✅ Aceptar e iniciar')
    expect(menu).toContain('2️⃣  ❌ No puedo tomarla')
    expect(menu).toContain('4️⃣  📋 Ver todas mis tareas')
  })

  it('renders a fallback state when there is no current task', async () => {
    const menu = await buildTareaActual(employeeSession())

    expect(menu).toContain('🎯 *Tu tarea actual*')
    expect(menu).toContain('✅ No tenés una tarea activa ahora.')
    expect(menu).toContain('1️⃣  📋 Ver todas mis tareas')
    expect(menu).toContain('2️⃣  🕐 Registrar asistencia')
    expect(menu).toContain('3️⃣  🚻 Ver rondas')
  })

  it('returns a clear message when a new operational task cannot be accepted because another one is already in progress', async () => {
    dbMock.getTareasEmpleado.mockResolvedValue([])
    dbMock.listOperationalTasksByEmployee.mockResolvedValue([
      {
        id: 202,
        titulo: 'Control baños',
        ubicacion: 'Pasillo norte',
        prioridad: 'alta',
        estado: 'pendiente_confirmacion',
        descripcion: 'Verificar insumos',
      },
      {
        id: 203,
        titulo: 'Reposición cocina',
        ubicacion: 'Cocina',
        prioridad: 'media',
        estado: 'en_progreso',
        descripcion: 'Reponer descartables',
      },
    ])
    dbMock.getOperationalTaskById.mockResolvedValue({
      id: 202,
      titulo: 'Control baños',
      ubicacion: 'Pasillo norte',
      prioridad: 'alta',
      estado: 'pendiente_confirmacion',
      descripcion: 'Verificar insumos',
      checklistObjetivo: 'Reponer jabón',
    })
    tasksServiceMock.acceptTask.mockRejectedValue(new Error('Employee already has an active operational task'))

    await expect(handleTareaActual(employeeSession(), '1')).resolves.toMatch(/ya ten[eé]s.*en curso|termin[aá] o paus[aá]/i)
  })
})
