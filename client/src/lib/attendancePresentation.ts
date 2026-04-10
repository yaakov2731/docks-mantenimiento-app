export function attendanceChannelLabel(value?: string | null) {
  if (value === 'whatsapp') return 'WhatsApp'
  if (value === 'panel') return 'Panel'
  if (value === 'manual_admin') return 'Manual admin'
  return 'Otro'
}

export function getAttendanceEventDateTime(evento?: {
  timestamp?: string | number | Date | null
  createdAt?: string | number | Date | null
} | null) {
  return evento?.timestamp ?? evento?.createdAt ?? null
}
