import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BotSession } from './session'

const sessionMock = vi.hoisted(() => ({
  getSession: vi.fn(),
  createSession: vi.fn(),
  navigateBack: vi.fn(),
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

const adminReclamosMock = vi.hoisted(() => ({
  buildReclamosPendientes: vi.fn(async () => 'reclamos pendientes'),
  handleReclamosPendientes: vi.fn(async () => 'handled reclamos'),
  buildAdminReclamoDetalle: vi.fn(() => 'detalle reclamo'),
  handleAdminReclamoDetalle: vi.fn(async () => 'handled detalle'),
  handleAsignarEmpleado: vi.fn(async () => 'handled asignar'),
  handleAsignarConfirmar: vi.fn(async () => 'handled confirmar'),
  handleCambiarPrioridad: vi.fn(async () => 'handled prioridad'),
  handleCancelarReclamo: vi.fn(async () => 'handled cancelar'),
  buildEstadoGeneral: vi.fn(async () => 'estado general'),
  buildEstadoRondas: vi.fn(async () => 'estado rondas'),
  buildSLAVencidos: vi.fn(async () => 'sla vencidos'),
}))

const adminRondasMock = vi.hoisted(() => ({
  buildAdminRondasMenu: vi.fn(async () => 'rondas menu'),
  handleAdminRondas: vi.fn(async () => 'handled rondas'),
  buildAdminRondasUnassigned: vi.fn(async () => 'rondas lista'),
  handleAdminRondasUnassigned: vi.fn(async () => 'handled rondas lista'),
  buildAdminRondaDetalle: vi.fn(() => 'ronda detalle'),
  handleAdminRondaDetalle: vi.fn(async () => 'handled ronda detalle'),
  buildAdminRondasAssign: vi.fn(async () => 'rondas assign'),
  handleAdminRondasAssign: vi.fn(async () => 'handled rondas assign'),
  buildAdminRondasCreate: vi.fn(() => 'rondas create'),
  handleAdminRondasCreate: vi.fn(async () => 'handled rondas create'),
  handleAdminRondasCreateCustom: vi.fn(async () => 'handled rondas custom'),
  handleAdminRondasCreateLocation: vi.fn(async () => 'handled rondas location'),
  buildAdminRondasByEmployee: vi.fn(async () => 'rondas by employee'),
  handleAdminRondasByEmployee: vi.fn(async () => 'handled rondas by employee'),
}))

const adminLeadsMock = vi.hoisted(() => ({
  buildAdminLeadsSinAsignar: vi.fn(async () => 'leads menu'),
  handleAdminLeadsSinAsignar: vi.fn(async () => 'handled leads'),
  handleAdminLeadDetalle: vi.fn(async () => 'handled lead detalle'),
  handleAdminLeadElegirVendedor: vi.fn(async () => 'handled elegir vendedor'),
  handleAdminLeadConfirmar: vi.fn(async () => 'handled lead confirmar'),
}))

const adminTasksMock = vi.hoisted(() => ({
  buildNuevaTareaP1: vi.fn(async () => 'nueva tarea p1'),
  handleNuevaTareaP1: vi.fn(async () => 'handled tarea p1'),
  buildNuevaTareaP2: vi.fn(() => 'nueva tarea p2'),
  handleNuevaTareaP2: vi.fn(async () => 'handled tarea p2'),
  buildNuevaTareaP3: vi.fn(() => 'nueva tarea p3'),
  handleNuevaTareaP3: vi.fn(async () => 'handled tarea p3'),
  buildNuevaTareaConfirmar: vi.fn(() => 'nueva tarea confirmar'),
  handleNuevaTareaConfirmar: vi.fn(async () => 'handled tarea confirmar'),
}))

vi.mock('./session', () => sessionMock)
vi.mock('./menus/main', () => mainMenuMock)
vi.mock('./menus/admin/reclamos', () => adminReclamosMock)
vi.mock('./menus/admin/rondas', () => adminRondasMock)
vi.mock('./menus/admin/leads', () => adminLeadsMock)
vi.mock('./menus/admin/tasks', () => adminTasksMock)
vi.mock('./menus/employee/tareas', () => ({
  buildTareasLista: vi.fn(),
  handleTareasLista: vi.fn(),
  buildTareaDetalle: vi.fn(),
  handleTareaDetalle: vi.fn(),
  handleConfirmarCompletar: vi.fn(),
  handlePausaMotivo: vi.fn(),
  handlePausaMotivoLibre: vi.fn(),
  handleProblema: vi.fn(),
  handleProblemaLibre: vi.fn(),
  handleNotaLibre: vi.fn(),
}))
vi.mock('./menus/employee/asistencia', () => ({
  buildAsistenciaMenu: vi.fn(),
  handleAsistencia: vi.fn(),
}))
vi.mock('./menus/employee/rondas', () => ({
  buildRondasLista: vi.fn(),
  handleRondasLista: vi.fn(),
  handleRondaDetalle: vi.fn(),
  handleRondaObservacion: vi.fn(),
  handleRondaObservacionLibre: vi.fn(),
  handleRondaRechazo: vi.fn(),
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
  handlePublicAlquilerP3Otro: vi.fn(),
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

function adminSession(currentMenu = 'main'): BotSession {
  return {
    id: 1,
    waNumber: '5491111111111',
    userType: 'admin',
    userId: 1,
    userName: 'Juan',
    currentMenu,
    contextData: {},
    menuHistory: [],
    lastActivityAt: new Date(),
    createdAt: new Date(),
  }
}

describe('admin compact menu routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionMock.getSession.mockResolvedValue(adminSession())
    sessionMock.isSessionExpired.mockReturnValue(false)
    sessionMock.updateSession.mockResolvedValue(undefined)
    sessionMock.navigateTo.mockImplementation(async (session: BotSession, menu: string, contextData = {}) => ({
      ...session,
      currentMenu: menu,
      contextData,
      menuHistory: [...session.menuHistory, session.currentMenu],
    }))
  })

  it('opens the reclamos category from option 1', async () => {
    await expect(handleIncomingMessage('5491111111111', '1')).resolves.toBe('reclamos menu')

    expect(sessionMock.navigateTo).toHaveBeenCalledWith(expect.any(Object), 'admin_reclamos_home', {})
  })

  it('opens daily operations from option 2', async () => {
    await expect(handleIncomingMessage('5491111111111', '2')).resolves.toBe('operation menu')

    expect(sessionMock.navigateTo).toHaveBeenCalledWith(expect.any(Object), 'admin_operacion_home', {})
  })

  it('keeps rounds management on option 3', async () => {
    await expect(handleIncomingMessage('5491111111111', '3')).resolves.toBe('rondas menu')

    expect(sessionMock.navigateTo).toHaveBeenCalledWith(expect.any(Object), 'admin_rondas', { page: 1 })
  })

  it('opens commercial leads from option 4', async () => {
    await expect(handleIncomingMessage('5491111111111', '4')).resolves.toBe('leads menu')

    expect(sessionMock.navigateTo).toHaveBeenCalledWith(expect.any(Object), 'admin_leads_sin_asignar', { page: 1 })
  })

  it('routes reclamos category option 1 to pending complaints', async () => {
    sessionMock.getSession.mockResolvedValue(adminSession('admin_reclamos_home'))

    await expect(handleIncomingMessage('5491111111111', '1')).resolves.toBe('reclamos pendientes')

    expect(sessionMock.navigateTo).toHaveBeenCalledWith(expect.any(Object), 'admin_reclamos', { page: 1 })
  })

  it('routes reclamos category option 2 to urgent unassigned complaints', async () => {
    sessionMock.getSession.mockResolvedValue(adminSession('admin_reclamos_home'))

    await expect(handleIncomingMessage('5491111111111', '2')).resolves.toBe('reclamos pendientes')

    expect(sessionMock.navigateTo).toHaveBeenCalledWith(expect.any(Object), 'admin_urgentes', { page: 1 })
    expect(adminReclamosMock.buildReclamosPendientes).toHaveBeenCalledWith(expect.any(Object), 'urgentes')
  })

  it('routes reclamos category option 3 to unassigned complaints', async () => {
    sessionMock.getSession.mockResolvedValue(adminSession('admin_reclamos_home'))

    await expect(handleIncomingMessage('5491111111111', '3')).resolves.toBe('reclamos pendientes')

    expect(sessionMock.navigateTo).toHaveBeenCalledWith(expect.any(Object), 'admin_sin_asignar', { page: 1 })
    expect(adminReclamosMock.buildReclamosPendientes).toHaveBeenCalledWith(expect.any(Object), 'sin_asignar')
  })

  it('routes reclamos category option 4 to expired SLA view', async () => {
    sessionMock.getSession.mockResolvedValue(adminSession('admin_reclamos_home'))

    await expect(handleIncomingMessage('5491111111111', '4')).resolves.toBe('sla vencidos')

    expect(sessionMock.navigateTo).toHaveBeenCalledWith(expect.any(Object), 'admin_info', {})
  })

  it('routes operation option 1 to daily status', async () => {
    sessionMock.getSession.mockResolvedValue(adminSession('admin_operacion_home'))

    await expect(handleIncomingMessage('5491111111111', '1')).resolves.toBe('estado general')

    expect(sessionMock.navigateTo).toHaveBeenCalledWith(expect.any(Object), 'admin_info', {})
  })

  it('routes operation option 2 to new task assignment', async () => {
    sessionMock.getSession.mockResolvedValue(adminSession('admin_operacion_home'))

    await expect(handleIncomingMessage('5491111111111', '2')).resolves.toBe('nueva tarea p1')

    expect(sessionMock.navigateTo).toHaveBeenCalledWith(expect.any(Object), 'admin_nueva_tarea_p1', { page: 1 })
  })
})
