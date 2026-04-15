import {
  actualizarReporte,
  crearActualizacion,
  enqueueBotMessage,
  getEmpleadoById,
  getReporteById,
} from './db'

type AssignmentActor = {
  id?: number | null
  name: string
}

export async function assignReporteToEmployee(params: {
  reporteId: number
  empleadoNombre: string
  empleadoId?: number
  actor: AssignmentActor
}) {
  const reporte = await getReporteById(params.reporteId)
  if (!reporte) throw new Error('Reporte no encontrado')

  const empleado = typeof params.empleadoId === 'number'
    ? await getEmpleadoById(params.empleadoId)
    : null

  if (typeof params.empleadoId === 'number' && !empleado) {
    throw new Error('Empleado no encontrado')
  }

  const empleadoNombre = empleado?.nombre ?? params.empleadoNombre

  await actualizarReporte(params.reporteId, {
    asignadoA: empleadoNombre,
    asignadoId: params.empleadoId,
    estado: 'pendiente',
    trabajoIniciadoAt: null as any,
    asignacionEstado: params.empleadoId ? 'pendiente_confirmacion' : 'sin_asignar',
    asignacionRespondidaAt: null as any,
  })

  await crearActualizacion({
    reporteId: params.reporteId,
    usuarioId: params.actor.id ?? null,
    usuarioNombre: params.actor.name,
    tipo: 'asignacion',
    descripcion: `Asignado a: ${empleadoNombre}. Pendiente de confirmación del empleado.`,
  })

  if (empleado?.waId) {
    await enqueueBotMessage(empleado.waId, buildReporteAssignmentMessage({
      reporteId: reporte.id,
      titulo: reporte.titulo,
      local: reporte.local,
      planta: reporte.planta,
      prioridad: reporte.prioridad,
      descripcion: reporte.descripcion,
    }))
  }

  return {
    reporte,
    empleado,
    empleadoNombre,
  }
}

function buildReporteAssignmentMessage(input: {
  reporteId: number
  titulo: string
  local: string
  planta: string
  prioridad: string
  descripcion: string
}) {
  return [
    '*Nueva tarea asignada — Docks del Puerto*',
    '',
    `*Reclamo #${input.reporteId}:* ${input.titulo}`,
    `Local: ${input.local} (${input.planta})`,
    `Prioridad: ${input.prioridad}`,
    '',
    input.descripcion,
    '',
    'Respondé con una opción:',
    '1. Tarea recibida',
    '2. No puedo tomarla',
  ].join('\n')
}
