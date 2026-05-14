export type DraftTurno = {
  id?: number
  empleadoId: number
  fecha: string
  trabaja: boolean
  horaEntrada: string
  horaSalida: string
  sector: string
  puesto: string
  nota: string
}

export const DAY_MS = 24 * 60 * 60 * 1000
export const DEFAULT_ENTRADA = '18:00'
export const DEFAULT_SALIDA = '00:00'

export function draftKey(empleadoId: number, fecha: string): string {
  return `${empleadoId}:${fecha}`
}

export function dateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getMonday(input: Date): Date {
  const date = new Date(input)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

export function formatDayLabel(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(year!, (month! - 1), day!)
  return {
    short: date.toLocaleDateString('es-AR', { weekday: 'short' }),
    long: date.toLocaleDateString('es-AR', { weekday: 'long' }),
    number: date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
  }
}

export function statusLabel(status?: string): string {
  if (status === 'confirmado') return 'Confirmado'
  if (status === 'no_trabaja') return 'No trabaja'
  if (status === 'enviado') return 'Enviado'
  if (status === 'sin_respuesta') return 'Sin respuesta'
  if (status === 'cancelado') return 'Cancelado'
  return 'Borrador'
}

export function statusClass(status?: string): string {
  if (status === 'confirmado') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (status === 'no_trabaja') return 'bg-rose-50 text-rose-700 border-rose-200'
  if (status === 'enviado') return 'bg-sky-50 text-sky-700 border-sky-200'
  return 'bg-slate-50 text-slate-600 border-slate-200'
}
