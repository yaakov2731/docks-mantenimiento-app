const testDbName = `file:codex-test-${process.pid}-${Math.random().toString(36).slice(2)}?mode=memory&cache=shared`

process.env.TURSO_URL = testDbName
process.env.TURSO_TOKEN = 'test-token'

if (typeof window === 'undefined') {
  const { beforeEach } = await import('vitest')
  const { resetTestDb } = await import('./db-factory')

  beforeEach(async () => {
    await resetTestDb()
  })
}
