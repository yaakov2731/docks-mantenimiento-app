/**
 * Guards y helpers de validación para la navegación por menús.
 */

/** Valida que el mensaje sea un número dentro del rango permitido. */
export function parseMenuOption(message: string, max: number): number | null {
  const trimmed = message.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const n = parseInt(trimmed, 10)
  if (n < 0 || n > max) return null
  return n
}

/** Mensaje estándar de opción inválida — repite el menú. */
export function invalidOption(menuText: string): string {
  return `❓ Opción no válida. Ingresá el número de la opción:\n\n${menuText}`
}

/** Separador visual estándar */
export const SEP = '─────────────────────'

/** Construye una línea de opción numerada */
export function opt(n: number | string, emoji: string, label: string): string {
  return `${n}️⃣ ${emoji} ${label}`
}

/** Mensaje de confirmación genérico */
export function confirmMsg(question: string, yesLabel = 'Sí, confirmar', noLabel = 'Cancelar'): string {
  return [
    question,
    SEP,
    `1️⃣ ✅ ${yesLabel}`,
    `2️⃣ ❌ ${noLabel}`,
  ].join('\n')
}

/** Mensaje de éxito estándar */
export function successMsg(text: string, backLabel = 'Menú principal'): string {
  return `✅ ${text}\n\n0️⃣ ${backLabel}`
}

/** Mensaje de error estándar */
export function errorMsg(text: string): string {
  return `⚠️ ${text}\n\n0️⃣ Volver`
}

/** Prioridad con emoji */
export function prioEmoji(prioridad: string): string {
  switch (prioridad) {
    case 'urgente': return '🔴'
    case 'alta':    return '🟠'
    case 'media':   return '🟡'
    case 'baja':    return '🟢'
    default:        return '⚪'
  }
}

/** Estado con emoji */
export function estadoEmoji(estado: string): string {
  switch (estado) {
    case 'en_progreso': return '▶️'
    case 'pausado':     return '⏸️'
    case 'pendiente':   return '⏳'
    case 'completado':  return '✅'
    case 'cancelado':   return '❌'
    default:            return '❓'
  }
}

/** Asignacion estado con texto corto */
export function asignacionLabel(estado: string): string {
  switch (estado) {
    case 'pendiente_confirmacion': return 'Pendiente confirm.'
    case 'aceptada':               return 'Aceptada'
    case 'rechazada':              return 'Rechazada'
    case 'sin_asignar':            return 'Sin asignar'
    default:                       return estado
  }
}

/** Formatear tiempo trabajado */
export function fmtDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${safe}s`
}

/** Paginación: slice de un array con info de página */
export function paginate<T>(items: T[], page: number, pageSize = 5): {
  items: T[]
  page: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
} {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.max(1, Math.min(page, totalPages))
  const start = (safePage - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  }
}
