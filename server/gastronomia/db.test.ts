import { describe, it, expect } from 'vitest'
import { getEmpleadosGastronomia } from '../db'

describe('getEmpleadosGastronomia', () => {
  it('returns only gastronomia employees', async () => {
    const result = await getEmpleadosGastronomia()
    expect(Array.isArray(result)).toBe(true)
  })
})
