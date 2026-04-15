import { describe, expect, it } from 'vitest'
import { LOCALES_PLANTA_BAJA } from '../shared/const'

describe('LOCALES_PLANTA_BAJA', () => {
  it('includes every numbered planta baja local in the expected ranges without gaps', () => {
    const numberedLocals = LOCALES_PLANTA_BAJA
      .filter(local => /^Local \d+$/.test(local))
      .map(local => Number(local.replace('Local ', '')))

    const expectedLocals = [
      ...Array.from({ length: 222 }, (_, index) => index + 1),
      ...Array.from({ length: 5 }, (_, index) => 257 + index),
    ]

    expect(numberedLocals).toEqual(expectedLocals)
  })
})
