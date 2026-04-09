import { beforeEach } from 'vitest'

const testDbName = 'file::memory:?cache=shared'

process.env.TURSO_URL = testDbName
process.env.TURSO_TOKEN = 'test-token'

beforeEach(async () => {
  const { resetTestDb } = await import('./db-factory')
  await resetTestDb()
})
