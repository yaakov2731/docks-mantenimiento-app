export const COOKIE_NAME = 'docks_session'

export const LOCALES_PLANTA_BAJA = [
  ...Array.from({ length: 222 }, (_, i) => `Local ${i + 1}`),
  ...Array.from({ length: 5 }, (_, i) => `Local ${257 + i}`),
  'Plaza Central (223)',
  'Anfiteatro (228)',
  'Baños PB Hombres',
  'Baños PB Mujeres',
  'Escaleras',
  'Estacionamiento',
  'Acceso Principal',
  'Depósito PB',
]

export const LOCALES_PLANTA_ALTA = [
  ...Array.from({ length: 20 }, (_, i) => `Local ${236 + i}`),
  'Baños PA Hombres',
  'Baños PA Mujeres',
  'Pasillo PA Norte',
  'Pasillo PA Sur',
  'Terraza PA',
  'Depósito PA',
]

export const CATEGORIAS = [
  { value: 'electrico', label: 'Eléctrico', icon: '⚡' },
  { value: 'plomeria', label: 'Plomería', icon: '🔧' },
  { value: 'estructura', label: 'Estructura', icon: '🏗️' },
  { value: 'limpieza', label: 'Limpieza', icon: '🧹' },
  { value: 'seguridad', label: 'Seguridad', icon: '🔒' },
  { value: 'climatizacion', label: 'Climatización', icon: '❄️' },
  { value: 'otro', label: 'Otro', icon: '📋' },
] as const

export const PRIORIDADES = [
  { value: 'baja', label: 'Baja', color: '#22C55E' },
  { value: 'media', label: 'Media', color: '#EAB308' },
  { value: 'alta', label: 'Alta', color: '#FF6B35' },
  { value: 'urgente', label: 'Urgente', color: '#EF4444' },
] as const

export const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente', color: '#EAB308' },
  { value: 'en_progreso', label: 'En Progreso', color: '#0A7EA4' },
  { value: 'pausado', label: 'Pausado', color: '#94A3B8' },
  { value: 'completado', label: 'Completado', color: '#22C55E' },
  { value: 'cancelado', label: 'Cancelado', color: '#EF4444' },
] as const

export const RONDAS_DIAS_SEMANA = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
] as const

export const RONDAS_ESTADOS = [
  { value: 'programado', label: 'Programado', color: '#64748B' },
  { value: 'pendiente', label: 'Pendiente', color: '#D97706' },
  { value: 'en_progreso', label: 'En progreso', color: '#0A7EA4' },
  { value: 'pausada', label: 'Pausada', color: '#64748B' },
  { value: 'cumplido', label: 'Cumplido', color: '#16A34A' },
  { value: 'cumplido_con_observacion', label: 'Con observación', color: '#92400E' },
  { value: 'vencido', label: 'Vencido', color: '#DC2626' },
] as const

export const SECTORES_GASTRONOMIA = [
  { value: 'uno_grill', label: 'Uno Grill' },
  { value: 'brooklyn', label: 'Brooklyn' },
  { value: 'heladeria', label: 'Puerto Gelato / Heladería' },
  { value: 'trento_cafe', label: 'Trento Café' },
  { value: 'inflables', label: 'Inflables' },
  { value: 'encargados', label: 'Encargados' },
  { value: 'promotoras', label: 'Promotoras' },
] as const

export type SectorGastronomia = typeof SECTORES_GASTRONOMIA[number]['value']
