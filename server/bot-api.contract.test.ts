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
  listOperationalTasks: vi.fn(),
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

  it('returns the admin summary with separate complaint and scheduled-task counters', async () => {
    dbMock.getUsers.mockResolvedValue([
      { id: 1, name: 'Gerente', role: 'admin', activo: true, waId: '5491110000000' },
    ])
    dbMock.getReportes.mockResolvedValue([
      {
        id: 184,
        titulo: 'Perdida de agua',
        local: 'Local 12',
        planta: 'baja',
        prioridad: 'alta',
        estado: 'pendiente',
        asignacionEstado: 'sin_asignar',
        locatario: 'Sushi Club',
        descripcion: 'Sale agua debajo de la bacha',
        createdAt: new Date('2026-04-12T10:00:00.000Z'),
      },
    ])
    dbMock.listOperationalTasks.mockResolvedValue([
      {
        id: 301,
        origen: 'manual',
        tipoTrabajo: 'Limpieza',
        titulo: 'Control banos',
        descripcion: 'Repasar insumos',
        ubicacion: 'Pasillo norte',
        prioridad: 'alta',
        estado: 'pendiente_asignacion',
        empleadoId: null,
        empleadoNombre: null,
        recurrenteCadaHoras: 2,
        checklistObjetivo: 'Reponer jabon',
        trabajoAcumuladoSegundos: 0,
        proximaRevisionAt: '2026-04-12T11:00:00.000Z',
        ultimaRevisionAt: null,
        createdAt: new Date('2026-04-12T09:30:00.000Z'),
      },
    ])

    const response = await requestJson('/api/bot/admin/1/resumen')

    expect(response.status).toBe(200)
    expect(response.body.menu).toEqual([
      '1. Ver pendientes',
      '2. Reclamos',
      '3. Tareas programadas',
      '4. Buscar por numero',
      '5. Ayuda',
    ])
    expect(response.body.counters).toMatchObject({
      pending: 1,
      urgent: 0,
      unassigned: 1,
      scheduledPending: 1,
      scheduledHighPriority: 1,
      scheduledUnassigned: 1,
    })
    expect(response.body.domains.tareasProgramadas.latestPending).toMatchObject({
      id: 301,
      estado: 'pendiente_asignacion',
    })
  })

  it('lists scheduled operational tasks newest-first for the admin bot flow', async () => {
    dbMock.getUsers.mockResolvedValue([
      { id: 1, name: 'Gerente', role: 'admin', activo: true, waId: '5491110000000' },
    ])
    dbMock.listOperationalTasks.mockResolvedValue([
      {
        id: 301,
        origen: 'manual',
        tipoTrabajo: 'Limpieza',
        titulo: 'Control banos',
        descripcion: 'Repasar insumos',
        ubicacion: 'Pasillo norte',
        prioridad: 'alta',
        estado: 'pendiente_asignacion',
        empleadoId: null,
        empleadoNombre: null,
        recurrenteCadaHoras: 2,
        checklistObjetivo: 'Reponer jabon',
        trabajoAcumuladoSegundos: 0,
        createdAt: new Date('2026-04-12T09:30:00.000Z'),
      },
      {
        id: 302,
        origen: 'manual',
        tipoTrabajo: 'Reposicion',
        titulo: 'Control cocina',
        descripcion: 'Verificar stock',
        ubicacion: 'Local 7',
        prioridad: 'media',
        estado: 'pendiente_confirmacion',
        empleadoId: 7,
        empleadoNombre: 'Diego',
        recurrenteCadaHoras: null,
        checklistObjetivo: null,
        trabajoAcumuladoSegundos: 0,
        createdAt: new Date('2026-04-12T10:00:00.000Z'),
      },
      {
        id: 303,
        origen: 'manual',
        tipoTrabajo: 'Electricidad',
        titulo: 'Tablero pasillo',
        descripcion: 'Trabajo activo',
        ubicacion: 'Pasillo sur',
        prioridad: 'urgente',
        estado: 'en_progreso',
        empleadoId: 9,
        empleadoNombre: 'Ana',
        recurrenteCadaHoras: null,
        checklistObjetivo: null,
        trabajoAcumuladoSegundos: 300,
        createdAt: new Date('2026-04-12T10:30:00.000Z'),
      },
    ])

    const response = await requestJson('/api/bot/admin/1/tareas-programadas')

    expect(response.status).toBe(200)
    // The bot UI expects the newest actionable tasks first.
    expect(response.body.items).toHaveLength(2)
    expect(response.body.items.map((item: any) => item.id)).toEqual([301, 302])
    expect(response.body.items[0]).toMatchObject({
      id: 301,
      estado: 'pendiente_asignacion',
      accionesPermitidas: ['asignar'],
    })
    expect(response.body.items[1]).toMatchObject({
      id: 302,
      estado: 'pendiente_confirmacion',
      accionesPermitidas: ['reasignar'],
    })
  })

  it('assigns a scheduled operational task from the admin bot flow', async () => {
    dbMock.getUsers.mockResolvedValue([
      { id: 1, name: 'Gerente', role: 'admin', activo: true, waId: '5491110000000' },
    ])
    dbMock.getOperationalTaskById.mockResolvedValue({
      id: 301,
      origen: 'manual',
      tipoTrabajo: 'Limpieza',
      titulo: 'Control banos',
      descripcion: 'Repasar insumos',
      ubicacion: 'Pasillo norte',
      prioridad: 'alta',
      estado: 'pendiente_asignacion',
      empleadoId: null,
      empleadoNombre: null,
      empleadoWaId: null,
      trabajoAcumuladoSegundos: 0,
    })
    dbMock.getEmpleadoById.mockResolvedValue({
      id: 7,
      nombre: 'Diego',
      waId: '549112223333',
      activo: true,
    })

    const response = await requestJson('/api/bot/admin/1/tarea-programada/301/asignar', {
      method: 'POST',
      body: { empleadoId: 7 },
    })

    expect(response.status).toBe(200)
    expect(response.body.task).toMatchObject({
      id: 301,
      estado: 'pendiente_confirmacion',
      empleadoId: 7,
      empleadoNombre: 'Diego',
    })
  })

  it('blocks reassigning an in-progress scheduled task from the admin bot flow', async () => {
    dbMock.getUsers.mockResolvedValue([
      { id: 1, name: 'Gerente', role: 'admin', activo: true, waId: '5491110000000' },
    ])
    dbMock.getOperationalTaskById.mockResolvedValue({
      id: 303,
      origen: 'manual',
      tipoTrabajo: 'Electricidad',
      titulo: 'Tablero pasillo',
      descripcion: 'Trabajo activo',
      ubicacion: 'Pasillo sur',
      prioridad: 'urgente',
      estado: 'en_progreso',
      empleadoId: 9,
      empleadoNombre: 'Ana',
      empleadoWaId: '549119998877',
      trabajoAcumuladoSegundos: 300,
    })
    dbMock.getEmpleadoById.mockResolvedValue({
      id: 7,
      nombre: 'Diego',
      waId: '549112223333',
      activo: true,
    })

    const response = await requestJson('/api/bot/admin/1/tarea-programada/303/asignar', {
      method: 'POST',
      body: { empleadoId: 7 },
    })

    expect(response.status).toBe(400)
    expect(response.body.error).toContain('cannot be reassigned')
    expect(dbMock.persistOperationalTaskChange).not.toHaveBeenCalled()
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

    const contentType = response.headers.get('content-type') ?? ''
    const rawBody = await response.text()

    if (!contentType.includes('application/json')) {
      throw new Error(
        `Expected JSON from ${pathname} but received ${response.status} ${response.statusText} with content-type ${contentType || '<missing>'}. Body preview: ${rawBody.slice(0, 200)}`,
      )
    }

    try {
      return {
        status: response.status,
        body: JSON.parse(rawBody),
      }
    } catch (error) {
      throw new Error(
        `Failed to parse JSON from ${pathname} (${response.status} ${response.statusText}): ${(error as Error).message}. Body preview: ${rawBody.slice(0, 200)}`,
      )
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}
