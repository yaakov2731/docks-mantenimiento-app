export function readEnv(name: string): string | undefined {
  const raw = process.env[name]
  if (typeof raw !== 'string') return undefined

  let value = raw.trim()

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim()
  }

  value = value.replace(/\\r\\n|\\n|\\r/g, '').trim()

  return value.length > 0 ? value : undefined
}

/**
 * Read an env var that is required in production.
 * Throws on startup if missing when NODE_ENV=production, warns in dev.
 */
export function requireEnv(name: string): string | undefined {
  const value = readEnv(name)
  const isProduction = process.env.NODE_ENV === 'production'

  if (!value && isProduction) {
    console.error(`[ENV] FATAL: La variable de entorno ${name} es obligatoria en producción.`)
    process.exit(1)
  }

  if (!value) {
    console.warn(`[ENV] ⚠️  ${name} no configurada. Usando valor por defecto (solo para desarrollo).`)
  }

  return value
}
