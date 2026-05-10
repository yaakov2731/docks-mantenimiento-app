export type EventoLeadTemperature = 'hot' | 'warm' | 'cold'

export interface EventoScoreInput {
  tipoEvento?: string
  fechaEstimada?: string
  cantidadInvitados?: string
  presupuesto?: string
  seguimiento?: string
}

const URGENT_DATE = ['este mes', 'próxima semana', 'proxima semana', 'este finde', 'ya tengo fecha', 'lo antes posible', 'urgente']
const NEAR_DATE = ['próximo mes', 'proximo mes', '1 mes', 'un mes', '2 meses', 'dos meses']
const MEDIUM_DATE = ['3 meses', 'tres meses', '4 meses', '6 meses']
const FAR_DATE = ['más adelante', 'mas adelante', 'todavía no', 'todavia no', 'no sé', 'no se', 'evaluando']

const TIPO_PUNTOS: Record<string, number> = {
  'Boda / Casamiento': 20,
  'Evento corporativo': 18,
  'Fiesta de 15 años': 18,
  'Bar / Bat Mitzvá': 18,
  'Cumpleaños / Fiesta': 12,
  'Aniversario / Celebración': 12,
}

const INVITADOS_PUNTOS: Record<string, number> = {
  'Más de 400': 20,
  '200 a 400': 18,
  '100 a 200': 12,
  '50 a 100': 8,
  'Hasta 50': 5,
  'Todavía no sé': 5,
}

const PRESUPUESTO_PUNTOS: Record<string, number> = {
  'Más de $20.000.000': 20,
  '$10.000.000 a $20.000.000': 15,
  '$5.000.000 a $10.000.000': 10,
  'Hasta $5.000.000': 5,
  'Prefiero no decir': 5,
}

const SEGUIMIENTO_PUNTOS: Record<string, number> = {
  'Coordinar visita al salón': 20,
  'Que me llamen': 12,
  'Recibir información por WhatsApp': 5,
}

function scoreFecha(texto: string): number {
  const t = texto.toLowerCase()
  if (URGENT_DATE.some(k => t.includes(k))) return 20
  if (NEAR_DATE.some(k => t.includes(k))) return 15
  if (MEDIUM_DATE.some(k => t.includes(k))) return 8
  if (FAR_DATE.some(k => t.includes(k))) return 0
  return 8
}

export function calcularEventoScore(input: EventoScoreInput): number {
  let score = 0
  score += TIPO_PUNTOS[input.tipoEvento ?? ''] ?? 8
  score += scoreFecha(input.fechaEstimada ?? '')
  score += INVITADOS_PUNTOS[input.cantidadInvitados ?? ''] ?? 5
  score += PRESUPUESTO_PUNTOS[input.presupuesto ?? ''] ?? 5
  score += SEGUIMIENTO_PUNTOS[input.seguimiento ?? ''] ?? 0
  return Math.min(100, score)
}

export function getEventoTemperature(score: number): EventoLeadTemperature {
  if (score >= 70) return 'hot'
  if (score >= 45) return 'warm'
  return 'cold'
}
