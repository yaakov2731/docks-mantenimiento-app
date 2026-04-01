export const COOKIE_NAME = 'docks_session'

export const LOCALES_PLANTA_BAJA = [
  ...Array.from({ length: 104 }, (_, i) => `Local ${i + 1}`),
  ...Array.from({ length: 66 }, (_, i) => `Local ${105 + i}`),
  ...Array.from({ length: 9 }, (_, i) => `Local ${214 + i}`),
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
