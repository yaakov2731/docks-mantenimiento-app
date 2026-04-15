# Bot Gerente Asignacion Operativa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extender el contrato del bot de WhatsApp para que el gerente pueda consultar y asignar reclamos y tareas operativas recurrentes desde un menu mas profesional, con permisos restringidos solo a admins.

**Architecture:** Mantener `server/bot-api.ts` como capa HTTP del bot, pero sacar la notificacion y asignacion de tareas operativas a un helper compartido parecido a `server/reporte-assignment.ts`. El bot reutiliza `server/db.ts` para leer tareas operativas y persistir cambios, mientras que `server/bot-api.contract.test.ts` fija el contrato admin antes de tocar produccion.

**Tech Stack:** Express, TypeScript, Vitest, Drizzle ORM, WhatsApp bot queue.

---

## File Structure

- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\bot-api.contract.test.ts`
  Amplia el contrato del bot con resumen admin enriquecido, listado/detalle de tareas programadas y asignacion/reasignacion.
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\operational-task-assignment.ts`
  Nuevo helper compartido para asignar o reasignar tareas operativas y enviar la notificacion de WhatsApp.
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\bot-api.ts`
  Expone los nuevos endpoints admin, serializa tareas operativas para el menu del gerente y amplía el resumen.
- `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\routers.ts`
  Reusa el helper compartido de notificacion para no duplicar el texto de tareas operativas entre panel web y bot.

### Task 1: Fijar el contrato admin del bot con tests rojos

**Files:**
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\bot-api.contract.test.ts`

- [ ] **Step 1: Write the failing test**

Agregar el mock que falta para `listOperationalTasks` y cuatro pruebas nuevas al archivo de contrato.

```ts
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
  listOperationalTasks: vi.fn(),
  listOperationalTasksByEmployee: vi.fn(),
  getOperationalTaskById: vi.fn(),
  persistOperationalTaskChange: vi.fn(),
  addOperationalTaskEvent: vi.fn(),
}))
```

```ts
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

it('lists scheduled operational tasks visible to the admin bot flow', async () => {
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
  expect(dbMock.persistOperationalTaskChange).toHaveBeenCalledWith(
    301,
    expect.objectContaining({
      empleadoId: 7,
      empleadoNombre: 'Diego',
      empleadoWaId: '549112223333',
      estado: 'pendiente_confirmacion',
      aceptadoAt: null,
      trabajoIniciadoAt: null,
      pausadoAt: null,
    }),
    expect.arrayContaining([
      expect.objectContaining({
        tipo: 'asignacion',
        actorTipo: 'admin',
        actorId: 1,
        actorNombre: 'Gerente',
      }),
    ]),
  )
  expect(dbMock.enqueueBotMessage).toHaveBeenCalledWith(
    '549112223333',
    expect.stringContaining('Nueva tarea operativa'),
  )
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/bot-api.contract.test.ts`

Expected: FAIL con errores del estilo `dbMock.listOperationalTasks is not a function`, `Cannot GET /api/bot/admin/1/tareas-programadas` o aserciones rotas porque el resumen actual no trae contadores de tareas programadas.

- [ ] **Step 3: Commit**

```bash
git add server/bot-api.contract.test.ts
git commit -m "test: cover admin bot task assignment contract"
```

### Task 2: Extraer un helper compartido para asignar tareas operativas

**Files:**
- Create: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\operational-task-assignment.ts`
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\routers.ts`

- [ ] **Step 1: Write the minimal shared helper**

Crear `server/operational-task-assignment.ts` con un helper equivalente al de reclamos.

```ts
import {
  enqueueBotMessage,
  getEmpleadoById,
  getOperationalTaskById,
  persistOperationalTaskChange,
} from './db'

type AssignmentActor = {
  id?: number | null
  name: string
}

export async function assignOperationalTaskToEmployee(params: {
  taskId: number
  empleadoId: number
  actor: AssignmentActor
}) {
  const task = await getOperationalTaskById(params.taskId)
  if (!task) throw new Error('Operational task not found')

  if (!['pendiente_asignacion', 'pendiente_confirmacion'].includes(task.estado)) {
    throw new Error('Operational task cannot be reassigned from its current state')
  }

  const empleado = await getEmpleadoById(params.empleadoId)
  if (!empleado) throw new Error('Empleado no encontrado')

  const now = new Date()
  const eventType = task.empleadoId && task.empleadoId !== empleado.id ? 'reasignacion' : 'asignacion'
  const descriptionPrefix = eventType === 'reasignacion' ? 'Reasignada a' : 'Asignada a'

  await persistOperationalTaskChange(params.taskId, {
    empleadoId: empleado.id,
    empleadoNombre: empleado.nombre,
    empleadoWaId: empleado.waId ?? null,
    estado: 'pendiente_confirmacion',
    asignadoAt: now,
    aceptadoAt: null,
    trabajoIniciadoAt: null,
    pausadoAt: null,
  } as any, [{
    tareaId: params.taskId,
    tipo: eventType,
    actorTipo: 'admin',
    actorId: params.actor.id ?? null,
    actorNombre: params.actor.name,
    descripcion: `${descriptionPrefix}: ${empleado.nombre}. Pendiente de confirmacion del empleado.`,
    createdAt: now,
  }])

  await notifyOperationalTaskAssignment(params.taskId, {
    nombre: empleado.nombre,
    waId: empleado.waId,
  })

  const updatedTask = await getOperationalTaskById(params.taskId)
  if (!updatedTask) throw new Error('Operational task not found after update')

  return {
    task: updatedTask,
    empleado,
  }
}

export async function notifyOperationalTaskAssignment(
  taskId: number,
  employee: { nombre: string; waId?: string | null },
) {
  if (!employee.waId) return

  const task = await getOperationalTaskById(taskId)
  if (!task) return

  const lines = [
    '*Nueva tarea operativa — Docks del Puerto*',
    '',
    `Asignado a: ${employee.nombre}`,
    `Tarea #${task.id}`,
    task.titulo ? `Trabajo: ${task.titulo}` : '',
    task.tipoTrabajo ? `Tipo: ${task.tipoTrabajo}` : '',
    task.ubicacion ? `Ubicacion: ${task.ubicacion}` : '',
    task.prioridad ? `Prioridad: ${String(task.prioridad).toUpperCase()}` : '',
    '',
    task.descripcion ?? '',
    '',
    'Responde con una opcion:',
    '1. Aceptar tarea',
    '2. No puedo realizarla',
    '3. Ver cola del dia',
  ]

  await enqueueBotMessage(employee.waId, lines.filter(Boolean).join('\n'))
}
```

- [ ] **Step 2: Reuse the helper from the tRPC router**

Reemplazar la funcion local al final de `server/routers.ts` por el import del helper nuevo.

```ts
import { notifyOperationalTaskAssignment } from './operational-task-assignment'
```

Eliminar la funcion local:

```ts
async function notifyOperationalTaskAssignment(taskId: number, employee: { nombre: string; waId?: string | null }) {
  // delete this local copy after moving it to server/operational-task-assignment.ts
}
```

Dejar intactos los usos existentes en:

```ts
if (empleado) {
  await notifyOperationalTaskAssignment(id, empleado)
}
```

- [ ] **Step 3: Run the focused test to keep it red for the right reason**

Run: `npm test -- server/bot-api.contract.test.ts`

Expected: sigue FAIL, pero ahora por endpoints o payloads admin faltantes, no por errores de importacion ni helpers ausentes.

- [ ] **Step 4: Commit**

```bash
git add server/operational-task-assignment.ts server/routers.ts
git commit -m "refactor: share operational task assignment helper"
```

### Task 3: Implementar el menu admin profesional y los endpoints de tareas programadas

**Files:**
- Modify: `C:\Users\jcbru\docks_del_puerto\docks-mantenimiento-app\server\bot-api.ts`

- [ ] **Step 1: Extend imports and admin helpers**

Agregar los imports productivos y reemplazar el menu admin actual.

```ts
import {
  ATTENDANCE_ACTIONS,
  crearReporte,
  crearLead,
  getEmpleadoByWaId,
  getEmpleadoById,
  getJornadaActivaEmpleado,
  registrarEntradaEmpleado,
  registrarSalidaEmpleado,
  getTareasEmpleado,
  getUsers,
  crearActualizacion,
  getReportes,
  getPendingBotMessages,
  markBotMessageSent,
  markBotMessageFailed,
  enqueueBotMessage,
  getEmpleadoActivoById,
  getEmpleadoAttendanceStatus,
  getNextAssignableReporteForEmpleado,
  getReporteById,
  getReporteTiempoTrabajadoSegundos,
  registerEmpleadoAttendance,
  iniciarTrabajoReporte,
  pausarTrabajoReporte,
  completarTrabajoReporte,
  actualizarReporte,
  listOperationalTasks,
  listOperationalTasksByEmployee,
  getOperationalTaskById,
  persistOperationalTaskChange,
  addOperationalTaskEvent,
} from './db'
import { assignOperationalTaskToEmployee } from './operational-task-assignment'
```

```ts
function buildAdminMenu() {
  return [
    '1. Ver pendientes',
    '2. Reclamos',
    '3. Tareas programadas',
    '4. Buscar por numero',
    '5. Ayuda',
  ]
}

function buildAdminActions() {
  return ['ver_pendientes', 'ver_reclamos', 'ver_tareas_programadas', 'buscar_por_numero', 'ayuda']
}
```

- [ ] **Step 2: Add serialization and filtering for scheduled tasks**

Insertar helpers nuevos cerca del bloque admin actual.

```ts
function adminOperationalTaskPriorityRank(prioridad?: string) {
  switch (prioridad) {
    case 'urgente': return 4
    case 'alta': return 3
    case 'media': return 2
    case 'baja': return 1
    default: return 0
  }
}

function isAdminAssignableOperationalTask(task: any) {
  return ['pendiente_asignacion', 'pendiente_confirmacion'].includes(task?.estado)
}

function serializeAdminOperationalTask(task: any) {
  const accionesPermitidas = task.estado === 'pendiente_confirmacion' ? ['reasignar'] : ['asignar']

  return {
    id: task.id,
    titulo: task.titulo,
    descripcion: task.descripcion,
    tipoTrabajo: task.tipoTrabajo,
    ubicacion: task.ubicacion,
    prioridad: task.prioridad,
    estado: task.estado,
    empleadoId: task.empleadoId ?? null,
    empleadoNombre: task.empleadoNombre ?? null,
    recurrenteCadaHoras: task.recurrenteCadaHoras ?? null,
    checklistObjetivo: task.checklistObjetivo ?? null,
    ultimaRevisionAt: formatDateTime(task.ultimaRevisionAt),
    proximaRevisionAt: formatDateTime(task.proximaRevisionAt),
    tiempoTrabajadoSegundos: Number(task.tiempoTrabajadoSegundos ?? task.trabajoAcumuladoSegundos ?? 0),
    accionesPermitidas,
  }
}

async function listAdminPendingOperationalTasks() {
  const tasks = await listOperationalTasks()
  return tasks
    .filter(isAdminAssignableOperationalTask)
    .sort((left: any, right: any) =>
      Number(right.estado === 'pendiente_asignacion') - Number(left.estado === 'pendiente_asignacion') ||
      adminOperationalTaskPriorityRank(right.prioridad) - adminOperationalTaskPriorityRank(left.prioridad) ||
      Number(left.ordenAsignacion ?? 0) - Number(right.ordenAsignacion ?? 0) ||
      Number(left.id ?? 0) - Number(right.id ?? 0)
    )
}
```

- [ ] **Step 3: Expand the admin summary and add the new endpoints**

Actualizar `GET /admin/:id/resumen` y sumar listado, detalle y asignacion de tareas programadas.

```ts
botRouter.get('/admin/:id/resumen', authBot, async (req, res) => {
  try {
    const adminId = parseId(req.params.id)
    if (!adminId) return res.status(400).json({ error: 'id de admin invalido' })

    const admin = await getAdminBotUserById(adminId)
    if (!admin) return res.status(404).json({ error: 'Admin no encontrado' })

    const [pendingReports, pendingTasks] = await Promise.all([
      listAdminPendingReports(),
      listAdminPendingOperationalTasks(),
    ])

    return res.json({
      admin: {
        id: admin.id,
        name: admin.name,
        role: admin.role,
      },
      counters: {
        pending: pendingReports.length,
        urgent: pendingReports.filter((item) => item.prioridad === 'urgente').length,
        unassigned: pendingReports.filter((item) => !item.asignadoId).length,
        scheduledPending: pendingTasks.length,
        scheduledHighPriority: pendingTasks.filter((item) => ['urgente', 'alta'].includes(item.prioridad)).length,
        scheduledUnassigned: pendingTasks.filter((item) => !item.empleadoId).length,
      },
      latestPending: pendingReports[0] ? serializeAdminReport(pendingReports[0]) : null,
      latestScheduledTask: pendingTasks[0] ? serializeAdminOperationalTask(pendingTasks[0]) : null,
      domains: {
        reclamos: {
          total: pendingReports.length,
          latestPending: pendingReports[0] ? serializeAdminReport(pendingReports[0]) : null,
        },
        tareasProgramadas: {
          total: pendingTasks.length,
          latestPending: pendingTasks[0] ? serializeAdminOperationalTask(pendingTasks[0]) : null,
        },
      },
      accionesPermitidas: buildAdminActions(),
      menu: buildAdminMenu(),
    })
  } catch (error: any) {
    return res.status(500).json({ error: error?.message ?? 'No se pudo cargar el resumen admin' })
  }
})

botRouter.get('/admin/:id/tareas-programadas', authBot, async (req, res) => {
  try {
    const adminId = parseId(req.params.id)
    if (!adminId) return res.status(400).json({ error: 'id de admin invalido' })

    const admin = await getAdminBotUserById(adminId)
    if (!admin) return res.status(404).json({ error: 'Admin no encontrado' })

    const items = await listAdminPendingOperationalTasks()
    return res.json({
      items: items.map(serializeAdminOperationalTask),
      accionesPermitidas: ['asignar', 'reasignar'],
      menu: buildAdminMenu(),
    })
  } catch (error: any) {
    return res.status(500).json({ error: error?.message ?? 'No se pudo listar tareas programadas' })
  }
})

botRouter.get('/admin/:id/tarea-programada/:taskId', authBot, async (req, res) => {
  try {
    const adminId = parseId(req.params.id)
    const taskId = parseId(req.params.taskId)
    if (!adminId || !taskId) return res.status(400).json({ error: 'adminId y taskId son requeridos' })

    const admin = await getAdminBotUserById(adminId)
    if (!admin) return res.status(404).json({ error: 'Admin no encontrado' })

    const task = await getOperationalTaskById(taskId)
    if (!task) return res.status(404).json({ error: 'Tarea operativa no encontrada' })

    return res.json({
      task: serializeAdminOperationalTask(task),
      menu: buildAdminMenu(),
    })
  } catch (error: any) {
    return res.status(500).json({ error: error?.message ?? 'No se pudo obtener la tarea programada' })
  }
})

botRouter.post('/admin/:id/tarea-programada/:taskId/asignar', authBot, async (req, res) => {
  try {
    const adminId = parseId(req.params.id)
    const taskId = parseId(req.params.taskId)
    const empleadoId = Number(req.body?.empleadoId)

    if (!adminId || !taskId || !Number.isFinite(empleadoId)) {
      return res.status(400).json({ error: 'adminId, taskId y empleadoId son requeridos' })
    }

    const admin = await getAdminBotUserById(adminId)
    if (!admin) return res.status(404).json({ error: 'Admin no encontrado' })

    const result = await assignOperationalTaskToEmployee({
      taskId,
      empleadoId,
      actor: {
        id: admin.id,
        name: admin.name,
      },
    })

    return res.json({
      success: true,
      task: serializeAdminOperationalTask(result.task),
      empleado: {
        id: result.empleado.id,
        nombre: result.empleado.nombre,
      },
    })
  } catch (error: any) {
    const message = error?.message ?? 'No se pudo asignar la tarea programada'
    if (message.includes('not found') || message.includes('no encontrado')) {
      return res.status(404).json({ error: message })
    }
    if (message.includes('cannot be reassigned')) {
      return res.status(400).json({ error: message })
    }
    return res.status(500).json({ error: message })
  }
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/bot-api.contract.test.ts`

Expected: PASS, con las nuevas pruebas admin verdes y las de reclamos anteriores todavia pasando.

- [ ] **Step 5: Commit**

```bash
git add server/bot-api.ts
git commit -m "feat: add admin bot task assignment endpoints"
```

### Task 4: Ejecutar una regresion corta del backend del bot

**Files:**
- No code changes expected

- [ ] **Step 1: Run the bot contract suite**

Run: `npm test -- server/bot-api.contract.test.ts`

Expected: PASS

- [ ] **Step 2: Run the operational task service suite**

Run: `npm test -- server/tasks/service.test.ts`

Expected: PASS, para confirmar que el helper nuevo no rompe la maquina de estados de tareas operativas.

- [ ] **Step 3: Run the tareas operativas router test**

Run: `npm test -- server/tareas-operativas.router.test.ts`

Expected: PASS, para confirmar que el panel admin sigue pudiendo crear o borrar tareas operativas sin romper la notificacion compartida.

- [ ] **Step 4: Commit verification notes if no code changed in this task**

```bash
git status --short
```

Expected: working tree clean o solo con cambios deliberados ya incluidos en commits anteriores.
