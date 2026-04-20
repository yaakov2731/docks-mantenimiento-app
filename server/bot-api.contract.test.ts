import express from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const dbMock = vi.hoisted(() => ({
  ATTENDANCE_ACTIONS: ['entrada', 'inicio_almuerzo', 'fin_almuerzo', 'salida'],
  initDb: vi.fn(),
  db: {
    delete: vi.fn(() => ({ run: vi.fn(async () => undefined) })),
    run: vi.fn(async () => undefined),
  },
  crearReporte: vi.fn(),
  crearLead: vi.fn(),
  getEmpleadoByWaId: vi.fn(),
  getEmpleadoById: vi.fn(),
  getJornadaActivaEmpleado: vi.fn(),
  registrarEntradaEmpleado: vi.fn(),
  registrarSalidaEmpleado: vi.fn(),
  getTareasEmpleado: vi.fn(),
  crearActualizacion: vi.fn(),
  getPendingBotMessages: vi.fn(),
  markBotMessageSent: vi.fn(),
  markBotMessageFailed: vi.fn(),
  enqueueBotMessage: vi.fn(),
  getEmpleadoActivoById: vi.fn(),
  getEmpleadoAttendanceStatus: vi.fn(),
  getNextAssignableReporteForEmpleado: vi.fn(),
  getReporteById: vi.fn(),
  getReportes: vi.fn(),
  getUsers: vi.fn(),
  getReporteTiempoTrabajadoSegundos: vi.fn((reporte: any) => Number(reporte?.tiempoTrabajadoSegundos ?? reporte?.trabajoAcumuladoSegundos ?? 0)),
  registerEmpleadoAttendance: vi.fn(),
  iniciarTrabajoReporte: vi.fn(),
  pausarTrabajoReporte: vi.fn(),
  completarTrabajoReporte: vi.fn(),
  actualizarReporte: vi.fn(),
  listOperationalTasksByEmployee: vi.fn(),
  getOperationalTaskById: vi.fn(),
  persistOperationalTaskChange: vi.fn(),
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

const roundsServiceMock = vi.hoisted(() => ({
  registerWhatsappReply: vi.fn(),
  startOccurrence: vi.fn(),
  pauseOccurrence: vi.fn(),
  finishOccurrence: vi.fn(),
  assignOccurrence: vi.fn(),
  releaseOccurrence: vi.fn(),
}))

vi.mock('./db', () => dbMock)
vi.mock('./_core/env', () => ({
  readEnv: vi.fn((key: string) => (key === 'BOT_API_KEY' ? 'test-bot-key' : undefined)),
}))
vi.mock('./_core/notification', () => ({
  notifyOwner: vi.fn(() => Promise.resolve()),
}))
vi.mock('./tasks/service', () => ({
  createOperationalTasksService: vi.fn(() => tasksServiceMock),
}))
vi.mock('./rounds/service', () => ({
  createRoundsService: vi.fn(() => roundsServiceMock),
}))
vi.mock('./bot-menu/engine', () => ({
  handleIncomingMessage: vi.fn(async () => 'ok'),
}))

describe('bot api compatibility contract', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the employee summary shape expected by the WhatsApp bot', async () => {
    dbMock.getEmpleadoActivoById.mockResolvedValue({
      id: 7,
      nombre: 'Diego',
      especialidad: 'Mantenimiento',
    })
    dbMock.getEmpleadoAttendanceStatus.mockResolvedValue({
      onShift: true,
      onLunch: false,
      lastAction: 'entrada',
      lastActionAt: '2026-04-10T14:00:00.000Z',
      lastEntryAt: '2026-04-10T14:00:00.000Z',
      lastLunchStartAt: '2026-04-10T17:00:00.000Z',
      lastLunchEndAt: '2026-04-10T17:30:00.000Z',
      workedSecondsToday: 7200,
      grossWorkedSecondsToday: 9000,
      todayLunchSeconds: 1800,
      currentShiftSeconds: 3600,
      currentLunchSeconds: 0,
      todayEntries: 1,
      todayLunchStarts: 1,
      todayLunchEnds: 1,
      todayExits: 0,
    })
    dbMock.getTareasEmpleado.mockResolvedValue([
      {
        id: 101,
        origen: 'reclamo',
        titulo: 'Limpieza baño planta alta',
        local: 'Baños',
        planta: 'alta',
        prioridad: 'media',
        estado: 'en_progreso',
        asignacionEstado: 'aceptada',
        descripcion: 'Repaso completo y control de insumos',
        tiempoTrabajadoSegundos: 900,
      },
    ])
    dbMock.listOperationalTasksByEmployee.mockResolvedValue([
      {
        id: 202,
        origen: 'manual',
        titulo: 'Control baños',
        descripcion: 'Verificar insumos y limpieza',
        ubicacion: 'Pasillo norte',
        prioridad: 'alta',
        estado: 'pendiente_confirmacion',
        ordenAsignacion: 2,
        checklistObjetivo: 'Reponer jabón',
        trabajoAcumuladoSegundos: 0,
      },
    ])

    const response = await requestJson('/api/bot/empleado/7/resumen')

    expect(response.status).toBe(200)
    expect(response.body.empleado).toMatchObject({ id: 7, nombre: 'Diego' })
    expect(response.body.counters).toEqual({
      pendientesConfirmacion: 1,
      enCurso: 1,
      pausadas: 0,
      pendientes: 1,
      activas: 2,
      reclamosActivos: 1,
      operacionesActivas: 1,
      reclamosPendientesConfirmacion: 0,
      operacionesPendientesConfirmacion: 1,
    })
    expect(response.body.attendance).toMatchObject({
      onShift: true,
      onLunch: false,
      todayLunchSeconds: 1800,
      todayLunchStarts: 1,
      todayLunchEnds: 1,
    })
    expect(response.body.tareas).toHaveLength(2)
    expect(response.body.reclamos).toHaveLength(1)
    expect(response.body.tareasInternas).toHaveLength(1)
    expect(response.body.tareasInternas[0]).toMatchObject({
      id: 202,
      origen: 'operacion',
      local: 'Pasillo norte',
      estado: 'pendiente',
      asignacionEstado: 'pendiente_confirmacion',
      orden: 2,
      checklistObjetivo: 'Reponer jabón',
    })
  })

  it('supports the legacy operational assignment response endpoint used by the current bot', async () => {
    dbMock.getOperationalTaskById.mockResolvedValue({
      id: 202,
      empleadoId: 7,
      empleadoNombre: 'Diego',
      estado: 'pendiente_confirmacion',
      titulo: 'Control baños',
      descripcion: 'Verificar insumos',
      ubicacion: 'Pasillo norte',
      prioridad: 'alta',
      ordenAsignacion: 2,
      trabajoAcumuladoSegundos: 0,
    })
    tasksServiceMock.acceptTask.mockResolvedValue({
      id: 202,
      empleadoId: 7,
      empleadoNombre: 'Diego',
      estado: 'en_progreso',
      titulo: 'Control baños',
      descripcion: 'Verificar insumos',
      ubicacion: 'Pasillo norte',
      prioridad: 'alta',
      ordenAsignacion: 2,
      trabajoAcumuladoSegundos: 0,
    })

    const response = await requestJson('/api/bot/operacion/202/respuesta', {
      method: 'POST',
      body: { respuesta: 'recibida', empleadoNombre: 'Diego' },
    })

    expect(response.status).toBe(200)
    expect(tasksServiceMock.acceptTask).toHaveBeenCalledWith({ taskId: 202, empleadoId: 7 })
    expect(response.body).toMatchObject({
      success: true,
      respuesta: 'recibida',
      task: {
        id: 202,
        origen: 'operacion',
        estado: 'en_progreso',
      },
    })
  })

  it('accepts lunch actions through the attendance endpoint used by the current bot', async () => {
    dbMock.getEmpleadoActivoById.mockResolvedValue({
      id: 7,
      nombre: 'Diego',
      especialidad: 'Mantenimiento',
    })
    dbMock.registerEmpleadoAttendance.mockResolvedValue({
      success: true,
      code: 'ok',
      status: {
        onShift: true,
        onLunch: true,
        lastAction: 'inicio_almuerzo',
        todayLunchSeconds: 0,
        currentLunchSeconds: 0,
        todayLunchStarts: 1,
        todayLunchEnds: 0,
      },
    })

    const response = await requestJson('/api/bot/empleado/7/asistencia', {
      method: 'POST',
      body: { accion: 'inicio_almuerzo' },
    })

    expect(response.status).toBe(200)
    expect(dbMock.registerEmpleadoAttendance).toHaveBeenCalledWith(7, 'inicio_almuerzo', 'whatsapp', undefined)
    expect(response.body.attendance).toMatchObject({
      onShift: true,
      onLunch: true,
      lastAction: 'inicio_almuerzo',
      todayLunchStarts: 1,
    })
  })

  it('supports the legacy operational completion endpoint used by the current bot', async () => {
    dbMock.getOperationalTaskById.mockResolvedValue({
      id: 202,
      empleadoId: 7,
      empleadoNombre: 'Diego',
      estado: 'en_progreso',
      titulo: 'Control baños',
      descripcion: 'Verificar insumos',
      ubicacion: 'Pasillo norte',
      prioridad: 'alta',
      ordenAsignacion: 2,
      trabajoAcumuladoSegundos: 1800,
    })
    tasksServiceMock.finishTask.mockResolvedValue({
      task: {
        id: 202,
        empleadoId: 7,
        empleadoNombre: 'Diego',
        estado: 'terminada',
        titulo: 'Control baños',
        descripcion: 'Verificar insumos',
        ubicacion: 'Pasillo norte',
        prioridad: 'alta',
        ordenAsignacion: 2,
        trabajoAcumuladoSegundos: 1800,
      },
      nextTask: {
        id: 203,
        empleadoId: 7,
        empleadoNombre: 'Diego',
        estado: 'pendiente_confirmacion',
        titulo: 'Reponer papel',
        descripcion: 'Control siguiente',
        ubicacion: 'Baño mujeres',
        prioridad: 'media',
        ordenAsignacion: 3,
        trabajoAcumuladoSegundos: 0,
      },
    })

    const response = await requestJson('/api/bot/operacion/202/completar', {
      method: 'POST',
      body: { nota: 'Control realizado', empleadoId: 7, empleadoNombre: 'Diego' },
    })

    expect(response.status).toBe(200)
    expect(tasksServiceMock.finishTask).toHaveBeenCalledWith({
      taskId: 202,
      empleadoId: 7,
      note: 'Control realizado',
    })
    expect(response.body).toMatchObject({
      success: true,
      tiempoTrabajado: '30m',
      nextTask: {
        id: 203,
        origen: 'operacion',
        estado: 'pendiente',
        asignacionEstado: 'pendiente_confirmacion',
      },
    })
  })

  it('resumes a paused operational task through the legacy start endpoint', async () => {
    dbMock.getOperationalTaskById.mockResolvedValueOnce({
      id: 204,
      empleadoId: 7,
      empleadoNombre: 'Diego',
      estado: 'pausada',
      titulo: 'Control baños',
      descripcion: 'Retomar limpieza',
      ubicacion: 'Pasillo norte',
      prioridad: 'alta',
      ordenAsignacion: 2,
      trabajoAcumuladoSegundos: 900,
    })
    tasksServiceMock.resumeTask.mockResolvedValue({
      id: 204,
      empleadoId: 7,
      empleadoNombre: 'Diego',
      estado: 'en_progreso',
      titulo: 'Control baños',
      descripcion: 'Retomar limpieza',
      ubicacion: 'Pasillo norte',
      prioridad: 'alta',
      ordenAsignacion: 2,
      trabajoAcumuladoSegundos: 900,
    })

    const response = await requestJson('/api/bot/operacion/204/iniciar', {
      method: 'POST',
      body: { empleadoId: 7, empleadoNombre: 'Diego' },
    })

    expect(response.status).toBe(200)
    expect(tasksServiceMock.resumeTask).toHaveBeenCalledWith({ taskId: 204, empleadoId: 7 })
    expect(response.body).toMatchObject({
      success: true,
      estado: 'en_progreso',
      task: {
        id: 204,
        origen: 'operacion',
        estado: 'en_progreso',
      },
    })
  })

  it('cancels an operational task and returns it to the assignment queue', async () => {
    tasksServiceMock.cancelTask.mockResolvedValue({
      id: 205,
      empleadoId: null,
      empleadoNombre: 'Diego',
      estado: 'pendiente_asignacion',
      titulo: 'Control baños',
      descripcion: 'No se pudo terminar',
      ubicacion: 'Pasillo norte',
      prioridad: 'alta',
      ordenAsignacion: 2,
      trabajoAcumuladoSegundos: 900,
    })

    const response = await requestJson('/api/bot/tarea-operativa/205/cancelar', {
      method: 'POST',
      body: { empleadoId: 7, nota: 'Me llamaron a otra urgencia' },
    })

    expect(response.status).toBe(200)
    expect(tasksServiceMock.cancelTask).toHaveBeenCalledWith({
      taskId: 205,
      empleadoId: 7,
      note: 'Me llamaron a otra urgencia',
    })
    expect(response.body.task).toMatchObject({
      id: 205,
      estado: 'pendiente_asignacion',
    })
  })

  it('starts, pauses and finishes a bathroom round through the bot contract', async () => {
    roundsServiceMock.startOccurrence.mockResolvedValue({
      id: 501,
      estado: 'en_progreso',
      tiempoAcumuladoSegundos: 0,
    })
    roundsServiceMock.pauseOccurrence.mockResolvedValue({
      id: 501,
      estado: 'pausada',
      tiempoAcumuladoSegundos: 420,
    })
    roundsServiceMock.finishOccurrence.mockResolvedValue({
      id: 501,
      estado: 'cumplido',
      tiempoAcumuladoSegundos: 840,
    })

    const started = await requestJson('/api/bot/rondas/ocurrencia/501/iniciar', {
      method: 'POST',
      body: { empleadoId: 7 },
    })
    const paused = await requestJson('/api/bot/rondas/ocurrencia/501/pausar', {
      method: 'POST',
      body: { empleadoId: 7 },
    })
    const finished = await requestJson('/api/bot/rondas/ocurrencia/501/finalizar', {
      method: 'POST',
      body: { empleadoId: 7, nota: 'Todo limpio' },
    })

    expect(started.status).toBe(200)
    expect(paused.status).toBe(200)
    expect(finished.status).toBe(200)
    expect(roundsServiceMock.startOccurrence).toHaveBeenCalledWith({ occurrenceId: 501, empleadoId: 7 })
    expect(roundsServiceMock.pauseOccurrence).toHaveBeenCalledWith({ occurrenceId: 501, empleadoId: 7 })
    expect(roundsServiceMock.finishOccurrence).toHaveBeenCalledWith({ occurrenceId: 501, empleadoId: 7, note: 'Todo limpio' })
    expect(finished.body.occurrence).toMatchObject({ id: 501, estado: 'cumplido' })
  })

  it('queues a short admin WhatsApp alert when a new complaint arrives', async () => {
    dbMock.crearReporte.mockResolvedValue(184)
    dbMock.getUsers.mockResolvedValue([
      { id: 1, name: 'Gerente', role: 'admin', activo: true, waId: '5491110000000' },
    ])

    const response = await requestJson('/api/bot/reporte', {
      method: 'POST',
      body: {
        locatario: 'Sushi Club',
        local: 'Local 12',
        planta: 'baja',
        contacto: '1144556677',
        categoria: 'plomeria',
        prioridad: 'alta',
        titulo: 'Pérdida de agua',
        descripcion: 'Sale agua debajo de la bacha de cocina',
      },
    })

    expect(response.status).toBe(200)
    expect(dbMock.enqueueBotMessage).toHaveBeenCalledWith(
      '5491110000000',
      expect.stringContaining('Nuevo reclamo #184'),
    )
    expect(dbMock.enqueueBotMessage).toHaveBeenCalledWith(
      '5491110000000',
      expect.stringContaining('1. Ver pendientes'),
    )
  })

  it('identifies the admin WhatsApp number used by the bot', async () => {
    dbMock.getUsers.mockResolvedValue([
      { id: 1, name: 'Gerente', role: 'admin', activo: true, waId: '5491110000000' },
      { id: 2, name: 'Ventas', role: 'sales', activo: true, waId: '5491199999999' },
    ])

    const response = await requestJson('/api/bot/admin/identificar/5491110000000')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      found: true,
      admin: {
        id: 1,
        name: 'Gerente',
        role: 'admin',
      },
    })
  })

  it('returns the short admin menu and pending complaint counters', async () => {
    dbMock.getUsers.mockResolvedValue([
      { id: 1, name: 'Gerente', role: 'admin', activo: true, waId: '5491110000000' },
    ])
    dbMock.getReportes.mockResolvedValue([
      {
        id: 184,
        titulo: 'Pérdida de agua',
        local: 'Local 12',
        planta: 'baja',
        prioridad: 'alta',
        estado: 'pendiente',
        asignacionEstado: 'sin_asignar',
        locatario: 'Sushi Club',
        descripcion: 'Sale agua debajo de la bacha',
        createdAt: new Date('2026-04-12T10:00:00.000Z'),
      },
      {
        id: 185,
        titulo: 'Sin luz en depósito',
        local: 'Local 7',
        planta: 'alta',
        prioridad: 'urgente',
        estado: 'pendiente',
        asignacionEstado: 'sin_asignar',
        locatario: 'Mostaza',
        descripcion: 'Tablero apagado',
        createdAt: new Date('2026-04-12T11:00:00.000Z'),
      },
      {
        id: 186,
        titulo: 'Caso cerrado',
        local: 'Local 2',
        planta: 'baja',
        prioridad: 'media',
        estado: 'completado',
        asignacionEstado: 'aceptada',
        locatario: 'Havanna',
        descripcion: 'Resuelto',
        createdAt: new Date('2026-04-12T08:00:00.000Z'),
      },
    ])

    const response = await requestJson('/api/bot/admin/1/resumen')

    expect(response.status).toBe(200)
    expect(response.body.admin).toMatchObject({ id: 1, name: 'Gerente' })
    expect(response.body.counters).toEqual({
      pending: 2,
      urgent: 1,
      unassigned: 2,
    })
    expect(response.body.latestPending).toMatchObject({
      id: 185,
      prioridad: 'urgente',
    })
    expect(response.body.menu).toEqual([
      '1. Ver pendientes',
      '2. Asignar último reclamo',
      '3. Buscar reclamo por número',
      '4. Ayuda',
    ])
  })

  it('assigns a complaint from the admin bot flow and notifies the employee', async () => {
    dbMock.getUsers.mockResolvedValue([
      { id: 1, name: 'Gerente', role: 'admin', activo: true, waId: '5491110000000' },
    ])
    dbMock.getReporteById.mockResolvedValue({
      id: 184,
      titulo: 'Pérdida de agua',
      local: 'Local 12',
      planta: 'baja',
      prioridad: 'alta',
      estado: 'pendiente',
      asignacionEstado: 'sin_asignar',
      locatario: 'Sushi Club',
      descripcion: 'Sale agua debajo de la bacha',
      asignadoId: null,
      asignadoA: null,
    })
    dbMock.getEmpleadoById.mockResolvedValue({
      id: 7,
      nombre: 'Diego',
      waId: '549112223333',
      activo: true,
    })

    const response = await requestJson('/api/bot/admin/1/reporte/184/asignar', {
      method: 'POST',
      body: { empleadoId: 7 },
    })

    expect(response.status).toBe(200)
    expect(dbMock.actualizarReporte).toHaveBeenCalledWith(184, expect.objectContaining({
      asignadoA: 'Diego',
      asignadoId: 7,
      estado: 'pendiente',
      asignacionEstado: 'pendiente_confirmacion',
      asignacionRespondidaAt: null,
    }))
    expect(dbMock.crearActualizacion).toHaveBeenCalledWith(expect.objectContaining({
      reporteId: 184,
      usuarioId: 1,
      usuarioNombre: 'Gerente',
      tipo: 'asignacion',
    }))
    expect(dbMock.enqueueBotMessage).toHaveBeenCalledWith(
      '549112223333',
      expect.stringContaining('Nueva tarea asignada'),
    )
    expect(response.body).toMatchObject({
      success: true,
      reporteId: 184,
      empleado: {
        id: 7,
        nombre: 'Diego',
      },
    })
  })

  it('assigns and releases a round occurrence from the admin bot flow using the shared service', async () => {
    dbMock.getUsers.mockResolvedValue([
      { id: 1, name: 'Gerente', role: 'admin', activo: true, waId: '5491110000000' },
    ])
    dbMock.getEmpleadoById.mockResolvedValue({
      id: 8,
      nombre: 'Bea',
      waId: '5491222222222',
      activo: true,
    })
    roundsServiceMock.assignOccurrence.mockResolvedValue({
      id: 501,
      estado: 'pausada',
      responsableActualId: 8,
      responsableActualNombre: 'Bea',
      asignacionEstado: 'asignada',
      tiempoAcumuladoSegundos: 540,
    })
    roundsServiceMock.releaseOccurrence.mockResolvedValue({
      id: 501,
      estado: 'pausada',
      responsableActualId: null,
      responsableActualNombre: null,
      asignacionEstado: 'sin_asignar',
      tiempoAcumuladoSegundos: 540,
    })

    const assigned = await requestJson('/api/bot/admin/1/ronda/501/asignar', {
      method: 'POST',
      body: { empleadoId: 8 },
    })
    const released = await requestJson('/api/bot/admin/1/ronda/501/liberar', {
      method: 'POST',
      body: {},
    })

    expect(assigned.status).toBe(200)
    expect(released.status).toBe(200)
    expect(roundsServiceMock.assignOccurrence).toHaveBeenCalledWith({
      occurrenceId: 501,
      empleadoId: 8,
      actor: { id: 1, name: 'Gerente' },
    })
    expect(roundsServiceMock.releaseOccurrence).toHaveBeenCalledWith({
      occurrenceId: 501,
      actor: { id: 1, name: 'Gerente' },
    })
    expect(assigned.body.occurrence).toMatchObject({
      id: 501,
      responsableActualId: 8,
      asignacionEstado: 'asignada',
    })
    expect(released.body.occurrence).toMatchObject({
      id: 501,
      responsableActualId: null,
      asignacionEstado: 'sin_asignar',
    })
  })
})

async function requestJson(
  pathname: string,
  options: {
    method?: 'GET' | 'POST'
    body?: Record<string, unknown>
  } = {},
): Promise<{ status: number; body: any }> {
  const { default: botRouter } = await import('./bot-api')
  const app = express()
  app.use(express.json())
  app.use('/api/bot', botRouter)

  const server = await new Promise<import('node:http').Server>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
  })

  try {
    const address = server.address()
    if (!address || typeof address === 'string') {
      throw new Error('Test server did not expose a TCP port')
    }

    const response = await fetch(`http://127.0.0.1:${address.port}${pathname}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Bot-Api-Key': 'test-bot-key',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    return {
      status: response.status,
      body: await response.json(),
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}
