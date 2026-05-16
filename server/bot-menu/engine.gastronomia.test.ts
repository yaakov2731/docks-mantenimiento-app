import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BotSession } from './session'

// ── Session mock ──────────────────────────────────────────────────────────────

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

// ── Main menus mock ───────────────────────────────────────────────────────────

const mainMenuMock = vi.hoisted(() => ({
  buildEmployeeMainMenu: vi.fn(async () => 'employee main'),
  buildAdminMainMenu: vi.fn(async () => 'admin main'),
  buildSalesMainMenu: vi.fn(() => 'sales main'),
  buildHelpMessage: vi.fn(() => 'help'),
  buildAdminReclamosMenu: vi.fn(() => 'reclamos menu'),
  buildAdminOperationMenu: vi.fn(() => 'operation menu'),
}))

// ── Gastro handler mock ───────────────────────────────────────────────────────

const gastroMock = vi.hoisted(() => ({
  buildGastronomiaMenu: vi.fn(() => 'gastro menu'),
  handleGastronomia: vi.fn(async () => 'handled gastro'),
}))

// ── vi.mock calls ─────────────────────────────────────────────────────────────

vi.mock('./session', () => sessionMock)
vi.mock('./menus/main', () => mainMenuMock)
vi.mock('./menus/gastronomia/handler', () => gastroMock)

vi.mock('./menus/employee/tareas', () => ({
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
  buildAdminBotAutorespuesta: vi.fn(),
  handleAdminBotAutorespuesta: vi.fn(),
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
  buildLeadsLibre: vi.fn(),
  handleLeadsLibre: vi.fn(),
  handleLeadLibreDetalle: vi.fn(),
  buildBandeja: vi.fn(),
  handleBandeja: vi.fn(),
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
vi.mock('./menus/public/lead-response', () => ({
  buildLeadRespondioMenu: vi.fn(() => 'lead respondio'),
  handleLeadRespondio: vi.fn(),
  handleLeadVisita: vi.fn(),
  handleLeadConsulta: vi.fn(),
}))
vi.mock('../db', () => ({
  initDb: vi.fn(async () => undefined),
  db: {
    delete: vi.fn(() => ({ run: vi.fn(async () => undefined) })),
    run: vi.fn(async () => undefined),
  },
  getEmpleadoByWaId: vi.fn(),
  getUsers: vi.fn(),
  getLeadByWaId: vi.fn(),
  getPendingPlanificacionForEmpleado: vi.fn(async () => []),
  responderPlanificacionGastronomia: vi.fn(async () => undefined),
}))

import { handleIncomingMessage } from './engine'

// ── Test helpers ──────────────────────────────────────────────────────────────

function gastroSession(currentMenu = 'main'): BotSession {
  return {
    id: 42,
    waNumber: '5491112345678',
    userType: 'gastronomia' as any,
    userId: 42,
    userName: 'Ana García',
    currentMenu,
    contextData: { sector: 'brooklyn', sheetsRow: 5 },
    menuHistory: [],
    lastActivityAt: new Date(),
    createdAt: new Date(),
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('gastronomia bot routing', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    // No existing session — engine will call identifyUser
    sessionMock.getSession.mockResolvedValue(null)
    sessionMock.isSessionExpired.mockReturnValue(false)
    sessionMock.updateSession.mockResolvedValue(undefined)
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

    // getUsers returns empty → goes to employee lookup
    const { getUsers } = await import('../db')
    vi.mocked(getUsers).mockResolvedValue([])

    // getEmpleadoByWaId returns a gastro employee
    const { getEmpleadoByWaId } = await import('../db')
    vi.mocked(getEmpleadoByWaId).mockResolvedValue({
      id: 42,
      nombre: 'Ana García',
      puedeVender: false,
      tipoEmpleado: 'gastronomia',
      sector: 'brooklyn',
      sheetsRow: 5,
    } as any)

    // createSession returns a gastro session
    sessionMock.createSession.mockResolvedValue(gastroSession('main'))
  })

  it('routes a new gastro employee to buildGastronomiaMenu on first message', async () => {
    const result = await handleIncomingMessage('5491112345678', 'hola')

    expect(gastroMock.buildGastronomiaMenu).toHaveBeenCalledWith('brooklyn', 'Ana García')
    expect(result).toBe('gastro menu')
  })

  it('routes a dual gastro employee to the employee mode selector on first message', async () => {
    const { getEmpleadoByWaId } = await import('../db')
    vi.mocked(getEmpleadoByWaId).mockResolvedValue({
      id: 42,
      nombre: 'Ana García',
      puedeVender: false,
      puedeGastronomia: true,
      tipoEmpleado: 'gastronomia',
      sector: 'brooklyn',
      sheetsRow: 5,
    } as any)
    sessionMock.createSession.mockResolvedValue({
      ...gastroSession('main'),
      userType: 'employee',
      contextData: {},
    })

    const result = await handleIncomingMessage('5491112345678', 'hola')

    expect(sessionMock.updateSession).toHaveBeenCalledWith('5491112345678', {
      currentMenu: 'empleado_modo_selector',
      contextData: {
        puedeGastronomia: true,
        gastroSector: 'brooklyn',
        baseTipoEmpleado: 'gastronomia',
      },
    })
    expect(result).toContain('¿Qué menú necesitás hoy?')
    expect(result).toContain('Mantenimiento')
    expect(result).toContain('Gastronomía')
  })

  it('promotes a stale public session to the gastronomy menu when the number belongs to an employee', async () => {
    sessionMock.getSession.mockResolvedValueOnce({
      id: 9,
      waNumber: '5491112345678',
      userType: 'public',
      userId: 0,
      userName: 'Visitante',
      currentMenu: 'main',
      contextData: {},
      menuHistory: [],
      lastActivityAt: new Date(),
      createdAt: new Date(),
    } as BotSession)
    sessionMock.createSession.mockResolvedValue(gastroSession('main'))

    const result = await handleIncomingMessage('5491112345678', 'hola')

    expect(sessionMock.deleteSession).toHaveBeenCalledWith('5491112345678')
    expect(gastroMock.buildGastronomiaMenu).toHaveBeenCalledWith('brooklyn', 'Ana García')
    expect(result).toBe('gastro menu')
  })

  it('routes an existing gastro session to handleGastronomia', async () => {
    // Provide an existing session so engine skips identifyUser
    sessionMock.getSession.mockResolvedValue(gastroSession('main'))

    const result = await handleIncomingMessage('5491112345678', '1')

    expect(gastroMock.handleGastronomia).toHaveBeenCalled()
    expect(result).toBe('handled gastro')
  })

  it('confirms a pending planning shift without routing to the gastro menu', async () => {
    sessionMock.getSession.mockResolvedValue(gastroSession('main'))
    const dbMock = await import('../db')
    vi.mocked(dbMock.getPendingPlanificacionForEmpleado).mockResolvedValue([
      {
        id: 77,
        empleadoId: 42,
        empleadoNombre: 'Ana García',
        fecha: '2026-05-08',
        horaEntrada: '18:00',
        horaSalida: '00:00',
      },
    ] as any)
    vi.mocked(dbMock.responderPlanificacionGastronomia).mockResolvedValue({ id: 77, estado: 'confirmado' } as any)

    const result = await handleIncomingMessage('5491112345678', 'Confirmo asistencia')

    expect(dbMock.responderPlanificacionGastronomia).toHaveBeenCalledWith({
      turnoId: 77,
      empleadoId: 42,
      respuesta: 'confirmado',
    })
    expect(gastroMock.handleGastronomia).not.toHaveBeenCalled()
    expect(result).toContain('Turno confirmado')
  })

  it('accepts button-like confirmation text for a pending shift', async () => {
    sessionMock.getSession.mockResolvedValue(gastroSession('main'))
    const dbMock = await import('../db')
    vi.mocked(dbMock.getPendingPlanificacionForEmpleado).mockResolvedValue([
      {
        id: 88,
        empleadoId: 42,
        empleadoNombre: 'Ana García',
        fecha: '2026-05-09',
        horaEntrada: '12:00',
        horaSalida: '18:00',
        estado: 'sin_respuesta',
      },
    ] as any)
    vi.mocked(dbMock.responderPlanificacionGastronomia).mockResolvedValue({ id: 88, estado: 'confirmado' } as any)

    const result = await handleIncomingMessage('5491112345678', '1 ✅ Confirmo asistencia')

    expect(dbMock.responderPlanificacionGastronomia).toHaveBeenCalledWith({
      turnoId: 88,
      empleadoId: 42,
      respuesta: 'confirmado',
    })
    expect(result).toContain('Turno confirmado')
  })

  it('accepts numeric confirmation when there is exactly one pending shift', async () => {
    sessionMock.getSession.mockResolvedValue(gastroSession('main'))
    const dbMock = await import('../db')
    vi.mocked(dbMock.getPendingPlanificacionForEmpleado).mockResolvedValue([
      {
        id: 91,
        empleadoId: 42,
        empleadoNombre: 'Ana García',
        fecha: '2026-05-12',
        horaEntrada: '12:00',
        horaSalida: '18:00',
        estado: 'enviado',
      },
    ] as any)
    vi.mocked(dbMock.responderPlanificacionGastronomia).mockResolvedValue({ id: 91, estado: 'confirmado' } as any)

    const result = await handleIncomingMessage('5491112345678', '1')

    expect(dbMock.responderPlanificacionGastronomia).toHaveBeenCalledWith({
      turnoId: 91,
      empleadoId: 42,
      respuesta: 'confirmado',
    })
    expect(gastroMock.handleGastronomia).not.toHaveBeenCalled()
    expect(result).toContain('Turno confirmado')
  })

  it('accepts short negative replies for a pending shift', async () => {
    sessionMock.getSession.mockResolvedValue(gastroSession('main'))
    const dbMock = await import('../db')
    vi.mocked(dbMock.getPendingPlanificacionForEmpleado).mockResolvedValue([
      {
        id: 89,
        empleadoId: 42,
        empleadoNombre: 'Ana García',
        fecha: '2026-05-10',
        horaEntrada: '18:00',
        horaSalida: '00:00',
        estado: 'enviado',
      },
    ] as any)
    vi.mocked(dbMock.responderPlanificacionGastronomia).mockResolvedValue({ id: 89, estado: 'no_trabaja' } as any)

    const result = await handleIncomingMessage('5491112345678', 'no')

    expect(dbMock.responderPlanificacionGastronomia).toHaveBeenCalledWith({
      turnoId: 89,
      empleadoId: 42,
      respuesta: 'no_trabaja',
    })
    expect(result).toContain('Disponibilidad registrada')
  })

  it('tells the employee when a planning-specific reply has no pending shifts', async () => {
    sessionMock.getSession.mockResolvedValue(gastroSession('main'))
    const dbMock = await import('../db')
    vi.mocked(dbMock.getPendingPlanificacionForEmpleado).mockResolvedValue([])

    const result = await handleIncomingMessage('5491112345678', 'confirmo asistencia')

    expect(result).toContain('No tenés turnos pendientes')
    expect(gastroMock.handleGastronomia).not.toHaveBeenCalled()
  })

  it('does not hijack gastro attendance menu option 1 when there are no pending shifts', async () => {
    sessionMock.getSession.mockResolvedValue(gastroSession('main'))
    const dbMock = await import('../db')
    vi.mocked(dbMock.getPendingPlanificacionForEmpleado).mockResolvedValue([])

    const result = await handleIncomingMessage('5491112345678', '1')

    expect(dbMock.responderPlanificacionGastronomia).not.toHaveBeenCalled()
    expect(gastroMock.handleGastronomia).toHaveBeenCalled()
    expect(result).toBe('handled gastro')
  })

  it('asks for the shift number when numeric confirmation is ambiguous', async () => {
    sessionMock.getSession.mockResolvedValue(gastroSession('main'))
    const dbMock = await import('../db')
    vi.mocked(dbMock.getPendingPlanificacionForEmpleado).mockResolvedValue([
      {
        id: 90,
        empleadoId: 42,
        empleadoNombre: 'Ana García',
        fecha: '2026-05-11',
        horaEntrada: '10:00',
        horaSalida: '18:00',
        estado: 'enviado',
      },
      {
        id: 92,
        empleadoId: 42,
        empleadoNombre: 'Ana García',
        fecha: '2026-05-12',
        horaEntrada: '10:00',
        horaSalida: '18:00',
        estado: 'enviado',
      },
    ] as any)

    const result = await handleIncomingMessage('5491112345678', '1')

    expect(dbMock.responderPlanificacionGastronomia).not.toHaveBeenCalled()
    expect(gastroMock.handleGastronomia).not.toHaveBeenCalled()
    expect(result).toContain('Confirmación de turnos')
    expect(result).toContain('1️⃣ Confirmar todos')
    expect(result).toContain('2️⃣ Elegir un turno')
  })

  it('opens a professional bulk confirmation selector when multiple shifts are pending', async () => {
    sessionMock.getSession.mockResolvedValue(gastroSession('main'))
    const dbMock = await import('../db')
    vi.mocked(dbMock.getPendingPlanificacionForEmpleado).mockResolvedValue([
      {
        id: 93,
        empleadoId: 42,
        empleadoNombre: 'Ana García',
        fecha: '2026-05-13',
        horaEntrada: '10:00',
        horaSalida: '18:00',
        estado: 'enviado',
      },
      {
        id: 94,
        empleadoId: 42,
        empleadoNombre: 'Ana García',
        fecha: '2026-05-14',
        horaEntrada: '10:00',
        horaSalida: '18:00',
        estado: 'enviado',
      },
    ] as any)

    const result = await handleIncomingMessage('5491112345678', 'confirmo asistencia')

    expect(dbMock.responderPlanificacionGastronomia).not.toHaveBeenCalled()
    expect(sessionMock.updateSession).toHaveBeenCalledWith('5491112345678', expect.objectContaining({
      currentMenu: 'planificacion_confirmar_multiple',
      contextData: expect.objectContaining({ planificacionAccion: 'confirmado' }),
    }))
    expect(result).toContain('Confirmación de turnos')
    expect(result).toContain('1️⃣ Confirmar todos')
    expect(result).toContain('2️⃣ Elegir un turno')
  })

  it('handles planning confirmation replies even when the gastronomy session expired', async () => {
    sessionMock.getSession.mockResolvedValue(gastroSession('main'))
    sessionMock.isSessionExpired.mockReturnValue(true)
    sessionMock.resetToMain.mockImplementation(async (session: BotSession) => ({
      ...session,
      currentMenu: 'main',
      menuHistory: [],
      contextData: { sector: 'brooklyn' },
    }))
    const dbMock = await import('../db')
    vi.mocked(dbMock.getPendingPlanificacionForEmpleado).mockResolvedValue([
      {
        id: 98,
        empleadoId: 42,
        empleadoNombre: 'Ana García',
        fecha: '2026-05-18',
        horaEntrada: '10:00',
        horaSalida: '18:00',
        estado: 'enviado',
      },
      {
        id: 99,
        empleadoId: 42,
        empleadoNombre: 'Ana García',
        fecha: '2026-05-19',
        horaEntrada: '10:00',
        horaSalida: '18:00',
        estado: 'enviado',
      },
    ] as any)

    const result = await handleIncomingMessage('5491112345678', 'confirmo asistencia')

    expect(dbMock.responderPlanificacionGastronomia).not.toHaveBeenCalled()
    expect(result).toContain('Sesión expirada')
    expect(result).toContain('Confirmación de turnos')
    expect(result).toContain('1️⃣ Confirmar todos')
    expect(gastroMock.buildGastronomiaMenu).not.toHaveBeenCalled()
  })

  it('handles planning replies for a stale employee session when the WhatsApp belongs to a gastronomy record', async () => {
    sessionMock.getSession.mockResolvedValue({
      ...gastroSession('main'),
      userType: 'employee',
      userId: 9,
      userName: 'Marcos',
      contextData: {},
    })
    const dbMock = await import('../db')
    vi.mocked(dbMock.getEmpleadoByWaId).mockResolvedValue({
      id: 38,
      nombre: 'MARCOS',
      tipoEmpleado: 'gastronomia',
      puedeGastronomia: true,
      sector: 'uno_grill',
    } as any)
    vi.mocked(dbMock.getPendingPlanificacionForEmpleado).mockResolvedValue([
      {
        id: 59,
        empleadoId: 38,
        empleadoNombre: 'MARCOS',
        fecha: '2026-05-16',
        horaEntrada: '10:00',
        horaSalida: '17:00',
        estado: 'enviado',
      },
      {
        id: 60,
        empleadoId: 38,
        empleadoNombre: 'MARCOS',
        fecha: '2026-05-17',
        horaEntrada: '09:00',
        horaSalida: '17:00',
        estado: 'enviado',
      },
    ] as any)

    const result = await handleIncomingMessage('5491138210373', 'Confirmo')

    expect(dbMock.getPendingPlanificacionForEmpleado).toHaveBeenCalledWith(38)
    expect(dbMock.responderPlanificacionGastronomia).not.toHaveBeenCalled()
    expect(gastroMock.handleGastronomia).not.toHaveBeenCalled()
    expect(result).toContain('Confirmación de turnos')
    expect(result).toContain('1️⃣ Confirmar todos')
  })

  it('confirms all pending planning shifts from the bulk selector', async () => {
    sessionMock.getSession.mockResolvedValue({
      ...gastroSession('planificacion_confirmar_multiple'),
      contextData: { sector: 'brooklyn', planificacionAccion: 'confirmado' },
    })
    const dbMock = await import('../db')
    vi.mocked(dbMock.getPendingPlanificacionForEmpleado).mockResolvedValue([
      {
        id: 95,
        empleadoId: 42,
        empleadoNombre: 'Ana García',
        fecha: '2026-05-15',
        horaEntrada: '10:00',
        horaSalida: '18:00',
        estado: 'enviado',
      },
      {
        id: 96,
        empleadoId: 42,
        empleadoNombre: 'Ana García',
        fecha: '2026-05-16',
        horaEntrada: '10:00',
        horaSalida: '18:00',
        estado: 'enviado',
      },
    ] as any)
    vi.mocked(dbMock.responderPlanificacionGastronomia).mockResolvedValue({ id: 95, estado: 'confirmado' } as any)

    const result = await handleIncomingMessage('5491112345678', '1')

    expect(dbMock.responderPlanificacionGastronomia).toHaveBeenCalledTimes(2)
    expect(dbMock.responderPlanificacionGastronomia).toHaveBeenNthCalledWith(1, {
      turnoId: 95,
      empleadoId: 42,
      respuesta: 'confirmado',
    })
    expect(dbMock.responderPlanificacionGastronomia).toHaveBeenNthCalledWith(2, {
      turnoId: 96,
      empleadoId: 42,
      respuesta: 'confirmado',
    })
    expect(sessionMock.updateSession).toHaveBeenCalledWith('5491112345678', expect.objectContaining({
      currentMenu: 'main',
      contextData: expect.not.objectContaining({ planificacionAccion: expect.anything() }),
    }))
    expect(result).toContain('2 turnos confirmados')
    expect(result).toContain('Ya no quedan pendientes')
  })

  it('shows only still-pending shifts when choosing one from the selector', async () => {
    sessionMock.getSession.mockResolvedValue({
      ...gastroSession('planificacion_confirmar_multiple'),
      contextData: { sector: 'brooklyn', planificacionAccion: 'confirmado' },
    })
    const dbMock = await import('../db')
    vi.mocked(dbMock.getPendingPlanificacionForEmpleado).mockResolvedValue([
      {
        id: 97,
        empleadoId: 42,
        empleadoNombre: 'Ana García',
        fecha: '2026-05-17',
        horaEntrada: '10:00',
        horaSalida: '18:00',
        estado: 'enviado',
      },
    ] as any)

    const result = await handleIncomingMessage('5491112345678', '2')

    expect(dbMock.responderPlanificacionGastronomia).not.toHaveBeenCalled()
    expect(result).toContain('Elegí el turno')
    expect(result).toContain('CONFIRMO #97')
    expect(result).not.toContain('CONFIRMO #95')
  })

  it('rebuilds gastro menu when handleGastronomia returns null (option 0)', async () => {
    sessionMock.getSession.mockResolvedValue(gastroSession('main'))
    gastroMock.handleGastronomia.mockResolvedValue(null as any)
    sessionMock.navigateBack.mockResolvedValue({
      session: gastroSession('main'),
      previousMenu: 'main',
    })

    const result = await handleIncomingMessage('5491112345678', '0')

    expect(result).toBe('gastro menu')
  })
})
