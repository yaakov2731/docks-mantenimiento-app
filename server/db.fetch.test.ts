import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWithTimeout } from './db'

describe('fetchWithTimeout', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('normalizes request-like objects before delegating to fetch', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))
    const headers = new Headers({ authorization: 'Bearer test' })
    const requestLike = {
      url: 'https://example.test/v2/pipeline',
      method: 'POST',
      headers,
      body: '{"requests":[]}',
    }

    await fetchWithTimeout(requestLike as unknown as Request)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/v2/pipeline',
      expect.objectContaining({
        method: 'POST',
        headers,
        body: '{"requests":[]}',
      })
    )
  })
})
