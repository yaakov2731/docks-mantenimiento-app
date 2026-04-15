/**
 * Módulo de templates de mensajes WhatsApp — Docks del Puerto
 *
 * Todos los mensajes salientes del bot deben construirse desde este módulo.
 * Mantiene consistencia visual y facilita actualizaciones centralizadas.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return `${safe}s`
}

function prioridadEmoji(prioridad: string): string {
  switch (prioridad) {
    case 'urgente': return '🔴'
    case 'alta': return '🟠'
    case 'media': return '🟡'
    case 'baja': return '🟢'
    default: return '⚪'
  }
}

function categoriaEmoji(categoria: string): string {
  switch (categoria) {
    case 'electrico': return '⚡'
    case 'plomeria': return '🔧'
    case 'estructura': return '🏗️'
    case 'limpieza': return '🧹'
    case 'seguridad': return '🔒'
    case 'climatizacion': return '❄️'
    default: return '📋'
  }
}

// ─── Templates de Tareas (Reclamos) ─────────────────────────────────────────

/**
 * Enviado al empleado cuando se le asigna un reclamo de mantenimiento.
 */
export function taskAssigned(params: {
  reporteId: number
  titulo: string
  local: string
  planta: string
  prioridad: string
  categoria?: string
  descripcion: string
}): string {
  const emoji = prioridadEmoji(params.prioridad)
  const catEmoji = params.categoria ? categoriaEmoji(params.categoria) : '📋'
  return [
    `${emoji} *Nueva tarea asignada — Docks del Puerto*`,
    '',
    `*Reclamo #${params.reporteId}:* ${params.titulo}`,
    `${catEmoji} Categoría: ${params.categoria ?? 'General'}`,
    `📍 Local: ${params.local} (planta ${params.planta})`,
    `⚠️ Prioridad: *${params.prioridad.toUpperCase()}*`,
    '',
    `📝 *Descripción:*`,
    params.descripcion,
    '',
    'Respondé con una opción:',
    '✅ 1. Tarea recibida',
    '❌ 2. No puedo tomarla',
  ].join('\n')
}

/**
 * Confirmación al empleado cuando acepta una tarea.
 */
export function taskAccepted(params: {
  reporteId: number
  titulo: string
  local: string
}): string {
  return [
    `✅ *Tarea #${params.reporteId} aceptada*`,
    '',
    `Registramos el inicio de tu trabajo en:`,
    `📍 *${params.titulo}* — ${params.local}`,
    '',
    'Podés enviar actualizaciones cuando quieras.',
    'Cuando termines, avisanos para registrar la finalización.',
  ].join('\n')
}

/**
 * Confirmación al empleado cuando completa una tarea.
 */
export function taskCompleted(params: {
  reporteId: number
  titulo: string
  tiempoTrabajado: string
}): string {
  return [
    `🏁 *Tarea #${params.reporteId} completada*`,
    '',
    `✅ "${params.titulo}"`,
    `⏱️ Tiempo total trabajado: *${params.tiempoTrabajado}*`,
    '',
    '¡Buen trabajo! Gracias por registrar el cierre.',
  ].join('\n')
}

/**
 * Notificación al empleado sobre siguiente tarea auto-asignada.
 */
export function nextTaskAutoAssigned(params: {
  reporteId: number
  titulo: string
  local: string
  planta: string
  prioridad: string
  descripcion: string
}): string {
  const emoji = prioridadEmoji(params.prioridad)
  return [
    `${emoji} *Nueva tarea disponible — Docks del Puerto*`,
    '',
    `Se te asignó automáticamente:`,
    `*Reclamo #${params.reporteId}:* ${params.titulo}`,
    `📍 Local: ${params.local} (planta ${params.planta})`,
    `⚠️ Prioridad: *${params.prioridad.toUpperCase()}*`,
    '',
    params.descripcion,
    '',
    '¿La tomás?',
    '✅ 1. Sí, acepto',
    '❌ 2. No puedo ahora',
  ].join('\n')
}

// ─── Templates de Tareas Operativas ─────────────────────────────────────────

/**
 * Enviado al empleado cuando se le asigna una tarea operativa interna.
 */
export function operationalTaskAssigned(params: {
  tareaId: number
  titulo: string
  ubicacion: string
  prioridad: string
  descripcion: string
  checklistObjetivo?: string | null
  proximaRevisionAt?: string | null
}): string {
  const emoji = prioridadEmoji(params.prioridad)
  const lines = [
    `${emoji} *Tarea operativa asignada — Docks del Puerto*`,
    '',
    `*Tarea #${params.tareaId}:* ${params.titulo}`,
    `📍 Ubicación: ${params.ubicacion}`,
    `⚠️ Prioridad: *${params.prioridad.toUpperCase()}*`,
    '',
    `📝 *Descripción:*`,
    params.descripcion,
  ]

  if (params.checklistObjetivo) {
    lines.push('', `📋 *Checklist:*`, params.checklistObjetivo)
  }

  if (params.proximaRevisionAt) {
    lines.push('', `⏰ Próxima revisión: ${params.proximaRevisionAt}`)
  }

  lines.push(
    '',
    'Respondé con una opción:',
    '✅ 1. Tarea recibida',
    '❌ 2. No puedo tomarla',
  )

  return lines.join('\n')
}

// ─── Templates de Rondas de Baños ───────────────────────────────────────────

/**
 * Recordatorio de control de ronda programada.
 */
export function roundReminder(params: {
  occurrenceId: number
  nombreRonda: string
  horaProgramada: string
}): string {
  return [
    `🚻 *${params.nombreRonda} — Docks del Puerto*`,
    '',
    `⏰ Control programado para las *${params.horaProgramada}*`,
    '',
    'Completá el control y respondé:',
    '✅ 1. Iniciar ronda',
    '⏸️ 2. Pausar ronda',
    '🏁 3. Finalizar ronda',
    '⚠️ 4. Finalizada con observación',
    '❌ 5. No pude realizarla',
    '',
    `🔑 ID control: ${params.occurrenceId}`,
  ].join('\n')
}

/**
 * Alerta de ronda vencida sin confirmación.
 */
export function roundOverdue(params: {
  occurrenceId: number
  nombreRonda: string
  horaProgramada: string
  empleadoNombre: string
  minutosVencida: number
}): string {
  return [
    `⚠️ *RONDA VENCIDA — Docks del Puerto*`,
    '',
    `La ronda "${params.nombreRonda}" programada para las *${params.horaProgramada}* no fue confirmada.`,
    '',
    `👤 Responsable: ${params.empleadoNombre}`,
    `⏱️ Demorada: ${params.minutosVencida} minutos`,
    `🔑 ID control: ${params.occurrenceId}`,
    '',
    '⚠️ Se requiere atención inmediata.',
  ].join('\n')
}

/**
 * Notificación al supervisor cuando hay observación en una ronda.
 */
export function roundObservationAlert(params: {
  occurrenceId: number
  nombreRonda: string
  horaProgramada: string
  empleadoNombre: string
  nota: string
}): string {
  return [
    `⚠️ *Observación en ronda — Docks del Puerto*`,
    '',
    `*Ronda:* ${params.nombreRonda} (${params.horaProgramada})`,
    `*Empleado:* ${params.empleadoNombre}`,
    `🔑 ID: ${params.occurrenceId}`,
    '',
    `📝 *Observación reportada:*`,
    params.nota || '(sin detalle)',
    '',
    'Se recomienda verificar en persona.',
  ].join('\n')
}

// ─── Templates de Leads ──────────────────────────────────────────────────────

/**
 * Enviado al vendedor cuando se le asigna un lead.
 */
export function leadAssigned(params: {
  leadId: number
  nombre: string
  telefono?: string | null
  email?: string | null
  rubro?: string | null
  tipoLocal?: string | null
  mensaje?: string | null
  fuente: string
}): string {
  const lines = [
    `🎯 *Nuevo lead asignado — Docks del Puerto*`,
    '',
    `*Lead #${params.leadId}*`,
    `👤 Nombre: ${params.nombre}`,
  ]

  if (params.telefono) lines.push(`📞 Teléfono: ${params.telefono}`)
  if (params.email) lines.push(`📧 Email: ${params.email}`)
  if (params.rubro) lines.push(`🏪 Rubro: ${params.rubro}`)
  if (params.tipoLocal) lines.push(`🏢 Tipo de local: ${params.tipoLocal}`)
  if (params.fuente) lines.push(`📡 Fuente: ${params.fuente}`)

  if (params.mensaje) {
    lines.push('', `💬 *Mensaje:*`, params.mensaje)
  }

  lines.push(
    '',
    '👉 Contactalo a la brevedad.',
    'Registrá el seguimiento en el panel.',
  )

  return lines.join('\n')
}

// ─── Templates de Alertas al Gerente ────────────────────────────────────────

/**
 * Alerta al gerente de reclamo nuevo recibido por WhatsApp.
 */
export function newComplaintAlert(params: {
  reporteId: number
  local: string
  prioridad: string
  titulo: string
  locatario: string
}): string {
  const emoji = prioridadEmoji(params.prioridad)
  return [
    `${emoji} *Nuevo reclamo #${params.reporteId} — Docks del Puerto*`,
    '',
    `📍 Local: ${params.local}`,
    `⚠️ Prioridad: *${params.prioridad.toUpperCase()}*`,
    `🔧 Motivo: ${params.titulo}`,
    `👤 Locatario: ${params.locatario}`,
    '',
    'Opciones:',
    '1. Ver pendientes',
    '2. Asignar este reclamo',
    '3. Buscar reclamo por número',
    '4. Ayuda',
  ].join('\n')
}

/**
 * Alerta de tarea rechazada por empleado — para el gerente.
 */
export function taskRejectedAlert(params: {
  reporteId: number
  titulo: string
  empleadoNombre: string
  motivo: string
  cantidadRechazos?: number
}): string {
  const urgent = (params.cantidadRechazos ?? 1) >= 3
  return [
    urgent ? '🚨 *TAREA RECHAZADA 3 VECES*' : `❌ *Tarea rechazada — Docks del Puerto*`,
    '',
    `*Reclamo #${params.reporteId}:* ${params.titulo}`,
    `👤 Empleado: ${params.empleadoNombre}`,
    `💬 Motivo: ${params.motivo}`,
    urgent ? '\n⚠️ Esta tarea fue rechazada 3 veces. Requiere atención manual.' : '',
    '',
    'La tarea quedó disponible para reasignar.',
  ].filter(l => l !== null).join('\n')
}

/**
 * Alerta de tareas vencidas — resumen para el gerente.
 */
export function overdueTasksSummary(params: {
  tareas: Array<{
    id: number
    titulo: string
    prioridad: string
    minutosVencida: number
  }>
}): string {
  if (params.tareas.length === 0) return ''
  const lines = [
    `⚠️ *${params.tareas.length} tarea(s) vencidas — Docks del Puerto*`,
    '',
  ]
  for (const tarea of params.tareas) {
    const emoji = prioridadEmoji(tarea.prioridad)
    lines.push(`${emoji} #${tarea.id} — ${tarea.titulo} (${tarea.minutosVencida}m de demora)`)
  }
  lines.push('', '👉 Revisar el panel para reasignar o escalar.')
  return lines.join('\n')
}

/**
 * Alerta de desconexión del bot.
 */
export function botDisconnectedAlert(params: {
  minutosDesconectado: number
  mensajesPendientes: number
}): string {
  return [
    `🔴 *Bot desconectado — Docks del Puerto*`,
    '',
    `El bot de WhatsApp no está respondiendo.`,
    `⏱️ Desconectado hace: *${params.minutosDesconectado} minutos*`,
    `📨 Mensajes pendientes sin enviar: *${params.mensajesPendientes}*`,
    '',
    'Verificar que el servicio local esté activo.',
  ].join('\n')
}

// ─── Templates de Asistencia ─────────────────────────────────────────────────

/**
 * Confirmación de entrada al turno.
 */
export function attendanceEntradaConfirmed(params: {
  nombre: string
  hora: string
}): string {
  return [
    `✅ *Entrada registrada — Docks del Puerto*`,
    '',
    `Hola ${params.nombre}!`,
    `📍 Entrada registrada a las *${params.hora}*`,
    '',
    'Buen turno 👷',
  ].join('\n')
}

/**
 * Confirmación de salida del turno.
 */
export function attendanceSalidaConfirmed(params: {
  nombre: string
  hora: string
  horasTrabajadas: string
}): string {
  return [
    `👋 *Salida registrada — Docks del Puerto*`,
    '',
    `${params.nombre}, salida registrada a las *${params.hora}*`,
    `⏱️ Horas trabajadas hoy: *${params.horasTrabajadas}*`,
    '',
    '¡Hasta mañana!',
  ].join('\n')
}
