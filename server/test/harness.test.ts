import { describe, expect, it } from 'vitest'

describe('vitest server harness', () => {
  it('boots with the isolated in-memory turso setup', () => {
    expect(process.env.TURSO_URL).toBe('file::memory:?cache=shared')
    expect(process.env.TURSO_TOKEN).toBe('test-token')
  })
})
