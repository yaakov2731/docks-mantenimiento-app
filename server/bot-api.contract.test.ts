import express from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const dbMock = vi.hoisted(() => ({
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
  getEmpleadoActivoById: vi.fn(),
  getEmpleadoAttendanceStatus: vi.fn(),
  getNextAssignableReporteForEmpleado: vi.fn(),
  getReporteById: vi.fn(),
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
  pauseTask: vi.fn(),
  finishTask: vi.fn(),
  rejectTask: vi.fn(),
}))

const roundsServiceMock = vi.hoisted(() => ({
  registerWhatsappReply: vi.fn(),
  startOccurrence: vi.fn(),
  pauseOccurrence: vi.fn(),
  finishOccurrence: vi.fn(),
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
      lastAction: 'entrada',
      lastActionAt: '2026-04-10T14:00:00.000Z',
      lastEntryAt: '2026-04-10T14:00:00.000Z',
      workedSecondsToday: 7200,
      currentShiftSeconds: 3600,
      todayEntries: 1,
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

  it('returns conflict when a previous assignee tries to start a reassigned round', async () => {
    roundsServiceMock.startOccurrence.mockRejectedValue(
      new Error('Round occurrence does not belong to current employee')
    )

    const response = await requestJson('/api/bot/rondas/ocurrencia/501/iniciar', {
      method: 'POST',
      body: { empleadoId: 7 },
    })

    expect(response.status).toBe(409)
    expect(response.body.error).toContain('current employee')
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
