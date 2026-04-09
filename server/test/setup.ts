const testDbName = `file:codex-test-${process.pid}-${Math.random().toString(36).slice(2)}?mode=memory&cache=shared`

process.env.TURSO_URL = testDbName
process.env.TURSO_TOKEN = 'test-token'
