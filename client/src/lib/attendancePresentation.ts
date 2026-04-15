export function attendanceChannelLabel(value?: string | null) {
  if (value === 'whatsapp') return 'WhatsApp'
  if (value === 'panel') return 'Panel'
  if (value === 'manual_admin') return 'Manual admin'
  return 'Otro'
}

export function attendanceActionLabel(value?: string | null) {
  switch (value) {
    case 'entrada':
      return 'Entrada'
    case 'inicio_almuerzo':
      return 'Inicio almuerzo'
    case 'fin_almuerzo':
      return 'Fin almuerzo'
    case 'salida':
      return 'Salida'
    default:
      return value ?? 'Sin registro'
  }
}

export function attendanceActionTone(value?: string | null) {
  switch (value) {
    case 'entrada':
      return 'bg-emerald-50 text-emerald-700'
    case 'salida':
      return 'bg-rose-50 text-rose-700'
    case 'inicio_almuerzo':
      return 'bg-amber-50 text-amber-700'
    case 'fin_almuerzo':
      return 'bg-cyan-50 text-cyan-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

export function getAttendanceEventDateTime(evento?: {
  timestamp?: string | number | Date | null
  createdAt?: string | number | Date | null
} | null) {
  return evento?.timestamp ?? evento?.createdAt ?? null
}
