export type EventoLeadTemperature = 'hot' | 'warm' | 'cold'

export interface EventoScoreInput {
  tipoEvento?: string
  fechaEstimada?: string
  cantidadInvitados?: string
  seguimiento?: string
}

const URGENT_DATE = ['este mes', 'próxima semana', 'proxima semana', 'este finde', 'ya tengo fecha', 'lo antes posible', 'urgente']
const NEAR_DATE = ['próximo mes', 'proximo mes', '1 mes', 'un mes', '2 meses', 'dos meses']
const MEDIUM_DATE = ['3 meses', 'tres meses', '4 meses', '6 meses']
const FAR_DATE = ['más adelante', 'mas adelante', 'todavía no', 'todavia no', 'no sé', 'no se', 'evaluando']

const TIPO_PUNTOS: Record<string, number> = {
  'Boda / Casamiento': 25,
  'Evento corporativo': 20,
  'Fiesta de 15 años': 20,
  'Bar / Bat Mitzvá': 20,
  'Cumpleaños / Fiesta': 15,
  'Aniversario / Celebración': 15,
}

const INVITADOS_PUNTOS: Record<string, number> = {
  'Más de 400': 25,
  '200 a 400': 20,
  '100 a 200': 15,
  '50 a 100': 10,
  'Hasta 50': 5,
  'Todavía no sé': 5,
}

const SEGUIMIENTO_PUNTOS: Record<string, number> = {
  'Coordinar visita al salón': 25,
  'Que me llamen': 15,
  'Recibir información por WhatsApp': 5,
}

function scoreFecha(texto: string): number {
  const t = texto.toLowerCase()
  if (URGENT_DATE.some(k => t.includes(k))) return 25
  if (NEAR_DATE.some(k => t.includes(k))) return 20
  if (MEDIUM_DATE.some(k => t.includes(k))) return 10
  if (FAR_DATE.some(k => t.includes(k))) return 0
  return 10
}

export function calcularEventoScore(input: EventoScoreInput): number {
  let score = 0
  score += TIPO_PUNTOS[input.tipoEvento ?? ''] ?? 10
  score += scoreFecha(input.fechaEstimada ?? '')
  score += INVITADOS_PUNTOS[input.cantidadInvitados ?? ''] ?? 5
  score += SEGUIMIENTO_PUNTOS[input.seguimiento ?? ''] ?? 0
  return Math.min(100, score)
}

export function getEventoTemperature(score: number): EventoLeadTemperature {
  if (score >= 70) return 'hot'
  if (score >= 45) return 'warm'
  return 'cold'
}
