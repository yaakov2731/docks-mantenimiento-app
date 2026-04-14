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
    task.ubicacion ? `Ubicación: ${task.ubicacion}` : '',
    task.prioridad ? `Prioridad: ${String(task.prioridad).toUpperCase()}` : '',
    '',
    task.descripcion ?? '',
    '',
    'Respondé con una opción:',
    '1. Aceptar tarea',
    '2. No puedo realizarla',
    '3. Ver cola del día',
    '',
    'Cuando la aceptes, el reloj de trabajo queda en marcha y después vas a poder pausar o finalizar desde el bot.',
  ]

  await enqueueBotMessage(employee.waId, lines.filter(Boolean).join('\n'))
}
