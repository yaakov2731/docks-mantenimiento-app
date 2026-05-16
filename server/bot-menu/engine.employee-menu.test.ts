import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BotSession } from './session'

const sessionMock = vi.hoisted(() => ({
  getSession: vi.fn(),
  createSession: vi.fn(),
  navigateBack: vi.fn(),
  deleteSession: vi.fn(),
  resetToMain: vi.fn(),
  isSessionExpired: vi.fn(),
  updateSession: vi.fn(),
  navigateTo: vi.fn(),
}))

const mainMenuMock = vi.hoisted(() => ({
  buildEmployeeMainMenu: vi.fn(async () => 'employee main'),
  buildAdminMainMenu: vi.fn(async () => 'admin main'),
  buildSalesMainMenu: vi.fn(() => 'sales main'),
  buildHelpMessage: vi.fn(() => 'help'),
  buildAdminReclamosMenu: vi.fn(() => 'reclamos menu'),
  buildAdminOperationMenu: vi.fn(() => 'operation menu'),
}))

const employeeTasksMock = vi.hoisted(() => ({
  buildTareaActual: vi.fn(async () => 'current task'),
  handleTareaActual: vi.fn(async () => 'handled current task'),
  buildTareasLista: vi.fn(async () => 'task list'),
  handleTareasLista: vi.fn(async () => 'handled task list'),
  buildTareaDetalle: vi.fn(async () => 'task detail'),
  handleTareaDetalle: vi.fn(async () => 'handled task detail'),
  handleConfirmarCompletar: vi.fn(async () => 'handled confirm'),
  handlePausaMotivo: vi.fn(async () => 'handled pause reason'),
  handlePausaMotivoLibre: vi.fn(async () => 'handled free pause'),
  handleProblema: vi.fn(async () => 'handled problem'),
  handleProblemaLibre: vi.fn(async () => 'handled free problem'),
  handleNotaLibre: vi.fn(async () => 'handled free note'),
}))

const gastroMock = vi.hoisted(() => ({
  buildGastronomiaMenu: vi.fn(() => 'gastro menu'),
  handleGastronomia: vi.fn(async () => 'handled gastro'),
}))

vi.mock('./session', () => sessionMock)
vi.mock('./menus/main', () => mainMenuMock)
vi.mock('./menus/employee/tareas', () => employeeTasksMock)
vi.mock('./menus/gastronomia/handler', () => gastroMock)
vi.mock('./menus/employee/asistencia', () => ({
  buildAsistenciaMenu: vi.fn(async () => 'attendance menu'),
  handleAsistencia: vi.fn(async () => 'handled attendance'),
}))
vi.mock('./menus/employee/rondas', () => ({
  buildRondasLista: vi.fn(async () => 'rounds list'),
  handleRondasLista: vi.fn(async () => 'handled rounds'),
  handleRondaDetalle: vi.fn(async () => 'handled round detail'),
  handleRondaObservacion: vi.fn(async () => 'handled round observation'),
  handleRondaObservacionLibre: vi.fn(async () => 'handled free round observation'),
  handleRondaRechazo: vi.fn(async () => 'handled round reject'),
}))
vi.mock('./menus/admin/reclamos', () => ({
  buildReclamosPendientes: vi.fn(),
  handleReclamosPendientes: vi.fn(),
  buildAdminReclamoDetalle: vi.fn(),
  handleAdminReclamoDetalle: vi.fn(),
  handleAsignarEmpleado: vi.fn(),
  handleAsignarConfirmar: vi.fn(),
  handleCambiarPrioridad: vi.fn(),
  handleCancelarReclamo: vi.fn(),
  buildEstadoGeneral: vi.fn(),
  buildSLAVencidos: vi.fn(),
}))
vi.mock('./menus/admin/rondas', () => ({
  buildAdminRondasMenu: vi.fn(),
  handleAdminRondas: vi.fn(),
  buildAdminRondasUnassigned: vi.fn(),
  handleAdminRondasUnassigned: vi.fn(),
  buildAdminRondaDetalle: vi.fn(),
  handleAdminRondaDetalle: vi.fn(),
  buildAdminRondasAssign: vi.fn(),
  handleAdminRondasAssign: vi.fn(),
  buildAdminRondasCreate: vi.fn(),
  handleAdminRondasCreate: vi.fn(),
  handleAdminRondasCreateCustom: vi.fn(),
  handleAdminRondasCreateLocation: vi.fn(),
  buildAdminRondasByEmployee: vi.fn(),
  handleAdminRondasByEmployee: vi.fn(),
}))
vi.mock('./menus/admin/leads', () => ({
  buildAdminLeadsSinAsignar: vi.fn(),
  handleAdminLeadsSinAsignar: vi.fn(),
  handleAdminLeadDetalle: vi.fn(),
  handleAdminLeadElegirVendedor: vi.fn(),
  handleAdminLeadConfirmar: vi.fn(),
}))
vi.mock('./menus/admin/tasks', () => ({
  buildNuevaTareaP1: vi.fn(),
  handleNuevaTareaP1: vi.fn(),
  buildNuevaTareaP2: vi.fn(),
  handleNuevaTareaP2: vi.fn(),
  buildNuevaTareaP3: vi.fn(),
  handleNuevaTareaP3: vi.fn(),
  buildNuevaTareaConfirmar: vi.fn(),
  handleNuevaTareaConfirmar: vi.fn(),
}))
vi.mock('./menus/sales/leads', () => ({
  buildLeadsLista: vi.fn(),
  handleLeadsLista: vi.fn(),
  handleLeadDetalle: vi.fn(),
  handleLeadNota: vi.fn(),
  buildNuevoLeadPaso1: vi.fn(),
  handleNuevoLeadPaso1: vi.fn(),
  handleNuevoLeadPaso2: vi.fn(),
  handleNuevoLeadPaso3: vi.fn(),
  handleNuevoLeadPaso4: vi.fn(),
  handleNuevoLeadConfirmar: vi.fn(),
  buildEstadoLeads: vi.fn(),
}))
vi.mock('./menus/public/comercial', () => ({
  buildPublicMainMenu: vi.fn(() => 'public main'),
  handlePublicMain: vi.fn(),
  buildPublicAlquilerP1: vi.fn(),
  handlePublicAlquilerP1: vi.fn(),
  buildPublicAlquilerP2: vi.fn(),
  handlePublicAlquilerP2: vi.fn(),
  buildPublicAlquilerP3: vi.fn(),
  handlePublicAlquilerP3: vi.fn(),
  buildPublicAlquilerP4: vi.fn(),
  handlePublicAlquilerP4: vi.fn(),
  buildPublicAlquilerP5: vi.fn(),
  handlePublicAlquilerP5: vi.fn(),
  buildPublicAlquilerP6: vi.fn(),
  handlePublicAlquilerP6: vi.fn(),
  buildPublicAlquilerP7: vi.fn(),
  handlePublicAlquilerP7: vi.fn(),
  buildPublicAlquilerConfirmar: vi.fn(),
  handlePublicAlquilerConfirmar: vi.fn(),
  buildPublicVisitaP1: vi.fn(),
  handlePublicVisitaP1: vi.fn(),
  buildPublicVisitaP2: vi.fn(),
  handlePublicVisitaP2: vi.fn(),
  buildPublicVisitaP3: vi.fn(),
  handlePublicVisitaP3: vi.fn(),
  buildPublicUbicacion: vi.fn(),
  handlePublicUbicacion: vi.fn(),
  buildPublicAsesorP1: vi.fn(),
  handlePublicAsesorP1: vi.fn(),
  buildPublicAsesorP2: vi.fn(),
  handlePublicAsesorP2: vi.fn(),
  buildPublicReclamoP1: vi.fn(),
  handlePublicReclamoP1: vi.fn(),
  buildPublicReclamoP2: vi.fn(),
  handlePublicReclamoP2: vi.fn(),
  buildPublicMensajeP1: vi.fn(),
  handlePublicMensajeP1: vi.fn(),
  buildPublicMensajeP2: vi.fn(),
  handlePublicMensajeP2: vi.fn(),
}))
vi.mock('../db', () => ({
  initDb: vi.fn(async () => undefined),
  db: {
    delete: vi.fn(() => ({ run: vi.fn(async () => undefined) })),
    run: vi.fn(async () => undefined),
  },
  getEmpleadoByWaId: vi.fn(),
  getUsers: vi.fn(),
}))

import { handleIncomingMessage } from './engine'
import { getEmpleadoByWaId, getUsers } from '../db'

function employeeSession(currentMenu = 'main'): BotSession {
  return {
    id: 7,
    waNumber: '5491111111111',
    userType: 'employee',
    userId: 7,
    userName: 'Diego',
    currentMenu,
    contextData: {},
    menuHistory: [],
    lastActivityAt: new Date(),
    createdAt: new Date(),
  }
}

function dualEmployeeSession(currentMenu = 'main'): BotSession {
  return {
    ...employeeSession(currentMenu),
    contextData: {
      puedeGastronomia: true,
      gastroSector: 'brooklyn',
    },
  }
}

describe('employee current-task-first routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionMock.getSession.mockResolvedValue(employeeSession())
    sessionMock.createSession.mockImplementation(async ({ waNumber, userType, userId, userName }: any) => ({
      ...employeeSession(),
      waNumber,
      userType,
      userId,
      userName,
    }))
    sessionMock.isSessionExpired.mockReturnValue(false)
    sessionMock.updateSession.mockResolvedValue(undefined)
    vi.mocked(getUsers).mockResolvedValue([])
    vi.mocked(getEmpleadoByWaId).mockResolvedValue(null)
    sessionMock.resetToMain.mockImplementation(async (session: BotSession) => ({
      ...session,
      currentMenu: 'main',
      menuHistory: [],
    }))
    sessionMock.navigateTo.mockImplementation(async (session: BotSession, menu: string, contextData = {}) => ({
      ...session,
      currentMenu: menu,
      contextData,
      menuHistory: [...session.menuHistory, session.currentMenu],
    }))
  })

  it('opens the current task from option 1', async () => {
    await expect(handleIncomingMessage('5491111111111', '1')).resolves.toBe('current task')

    expect(sessionMock.navigateTo).toHaveBeenCalledWith(expect.any(Object), 'tarea_actual', {})
  })

  it('opens the full task list from option 2', async () => {
    await expect(handleIncomingMessage('5491111111111', '2')).resolves.toBe('task list')

    expect(sessionMock.navigateTo).toHaveBeenCalledWith(expect.any(Object), 'tareas_lista', { page: 1 })
  })

  it('keeps attendance on option 3', async () => {
    await expect(handleIncomingMessage('5491111111111', '3')).resolves.toBe('attendance menu')

    expect(sessionMock.navigateTo).toHaveBeenCalledWith(expect.any(Object), 'asistencia', {})
  })

  it('routes direct attendance text from the main menu', async () => {
    await expect(handleIncomingMessage('5491111111111', 'salida')).resolves.toBe('handled attendance')

    expect(sessionMock.navigateTo).toHaveBeenCalledWith(expect.any(Object), 'asistencia', {})
  })

  it('routes direct attendance text from a safe employee submenu', async () => {
    sessionMock.getSession.mockResolvedValue(employeeSession('tarea_detalle'))

    await expect(handleIncomingMessage('5491111111111', 'entrada')).resolves.toBe('handled attendance')

    expect(sessionMock.navigateTo).toHaveBeenCalledWith(expect.any(Object), 'asistencia', {})
  })

  it('keeps rounds on option 4', async () => {
    await expect(handleIncomingMessage('5491111111111', '4')).resolves.toBe('rounds list')

    expect(sessionMock.navigateTo).toHaveBeenCalledWith(expect.any(Object), 'rondas_lista', { page: 1 })
  })

  it('opens the dual mode selector from option 5 for employees with gastronomy access', async () => {
    sessionMock.getSession.mockResolvedValue(dualEmployeeSession())

    const result = await handleIncomingMessage('5491111111111', '5')

    expect(sessionMock.navigateTo).toHaveBeenCalledWith(expect.any(Object), 'empleado_modo_selector', { gastroSector: 'brooklyn' })
    expect(result).toContain('¿Qué menú necesitás hoy?')
    expect(result).toContain('Mantenimiento')
    expect(result).toContain('Gastronomía')
  })

  it('routes dual selector option 1 to regular attendance', async () => {
    sessionMock.getSession.mockResolvedValue(dualEmployeeSession('dual_asistencia_selector'))

    await expect(handleIncomingMessage('5491111111111', '1')).resolves.toBe('attendance menu')

    expect(sessionMock.navigateTo).toHaveBeenCalledWith(expect.any(Object), 'asistencia', {})
  })

  it('routes dual selector option 2 to gastronomia attendance', async () => {
    sessionMock.getSession.mockResolvedValue(dualEmployeeSession('dual_asistencia_selector'))

    await expect(handleIncomingMessage('5491111111111', '2')).resolves.toBe('gastro menu')

    expect(sessionMock.navigateTo).toHaveBeenCalledWith(expect.any(Object), 'employee_gastro', { sector: 'brooklyn' })
    expect(gastroMock.buildGastronomiaMenu).toHaveBeenCalledWith('brooklyn', 'Diego')
  })

  it('returns dual employees to the mode selector on menu reset', async () => {
    sessionMock.getSession.mockResolvedValue(dualEmployeeSession('tarea_detalle'))
    sessionMock.resetToMain.mockImplementation(async (session: BotSession) => ({
      ...session,
      currentMenu: 'main',
      contextData: dualEmployeeSession().contextData,
      menuHistory: [],
    }))

    const result = await handleIncomingMessage('5491111111111', 'menu')

    expect(sessionMock.updateSession).toHaveBeenCalledWith('5491111111111', {
      currentMenu: 'empleado_modo_selector',
      contextData: dualEmployeeSession().contextData,
      menuHistory: [],
    })
    expect(result).toContain('¿Qué menú necesitás hoy?')
  })

  it('reidentifies a stale maintenance session when the same number now resolves to a dual gastronomy employee', async () => {
    sessionMock.getSession.mockResolvedValue({
      ...employeeSession('asistencia'),
      waNumber: '5491138210373',
      userId: 9,
      userName: 'Marcos Enriques',
      contextData: {},
    })
    vi.mocked(getEmpleadoByWaId).mockResolvedValue({
      id: 38,
      nombre: 'MARCOS',
      waId: '5491138210373',
      tipoEmpleado: 'gastronomia',
      sector: 'uno_grill',
      puedeGastronomia: true,
    } as any)

    const result = await handleIncomingMessage('5491138210373', 'hola')

    expect(sessionMock.deleteSession).toHaveBeenCalledWith('5491138210373')
    expect(sessionMock.createSession).toHaveBeenCalledWith({
      waNumber: '5491138210373',
      userType: 'employee',
      userId: 38,
      userName: 'MARCOS',
    })
    expect(sessionMock.updateSession).toHaveBeenCalledWith('5491138210373', {
      currentMenu: 'empleado_modo_selector',
      contextData: {
        puedeGastronomia: true,
        gastroSector: 'uno_grill',
        baseTipoEmpleado: 'gastronomia',
      },
    })
    expect(result).toContain('¿Qué menú necesitás hoy?')
    expect(result).toContain('Gastronomía')
  })

  it('offers a commercial/employee selector when a sales user is also an employee', async () => {
    sessionMock.getSession.mockResolvedValue(null)
    vi.mocked(getUsers).mockResolvedValue([
      { id: 5, username: 'dario2026', name: 'Dario Cabrera', role: 'sales', activo: true, waId: '5491166889170' },
    ] as any)
    vi.mocked(getEmpleadoByWaId).mockResolvedValue({
      id: 4,
      nombre: 'Dario Cabrera',
      waId: '5491166889170',
      tipoEmpleado: 'operativo',
      sector: 'operativo',
      puedeVender: true,
    } as any)

    const result = await handleIncomingMessage('5491166889170', 'hola')

    expect(sessionMock.createSession).toHaveBeenCalledWith({
      waNumber: '5491166889170',
      userType: 'sales',
      userId: 5,
      userName: 'Dario Cabrera',
    })
    expect(sessionMock.updateSession).toHaveBeenCalledWith('5491166889170', {
      currentMenu: 'sales_employee_selector',
      contextData: expect.objectContaining({
        canUseEmployeeBot: true,
        employeeId: 4,
        employeeName: 'Dario Cabrera',
      }),
    })
    expect(result).toContain('Comercial')
    expect(result).toContain('Empleado')
  })

  it('routes a sales employee selector to the employee menu', async () => {
    sessionMock.getSession.mockResolvedValue({
      ...employeeSession('sales_employee_selector'),
      userType: 'sales',
      userId: 5,
      userName: 'Dario Cabrera',
      contextData: {
        canUseEmployeeBot: true,
        employeeId: 4,
        employeeName: 'Dario Cabrera',
      },
    })

    await expect(handleIncomingMessage('5491166889170', '2')).resolves.toBe('employee main')

    expect(sessionMock.navigateTo).toHaveBeenCalledWith(expect.any(Object), 'sales_employee_main', {})
    expect(mainMenuMock.buildEmployeeMainMenu).toHaveBeenCalledWith(expect.objectContaining({
      userType: 'employee',
      userId: 4,
      userName: 'Dario Cabrera',
    }))
  })

  it('refreshes an old sales-only session for a sales user who is also an employee', async () => {
    sessionMock.getSession.mockResolvedValue({
      ...employeeSession('main'),
      userType: 'sales',
      userId: 5,
      userName: 'Dario Cabrera',
      contextData: {},
    })
    vi.mocked(getUsers).mockResolvedValue([
      { id: 5, username: 'dario2026', name: 'Dario Cabrera', role: 'sales', activo: true, waId: '5491166889170' },
    ] as any)
    vi.mocked(getEmpleadoByWaId).mockResolvedValue({
      id: 4,
      nombre: 'Dario Cabrera',
      waId: '5491166889170',
      tipoEmpleado: 'operativo',
      sector: 'operativo',
      puedeVender: true,
    } as any)

    const result = await handleIncomingMessage('5491166889170', 'menu')

    expect(sessionMock.deleteSession).toHaveBeenCalledWith('5491166889170')
    expect(result).toContain('Comercial')
    expect(result).toContain('Empleado')
  })
})
