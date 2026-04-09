import { describe, expect, it } from 'vitest'
import * as db from './db'

describe('manual attendance support', () => {
  it('exports createManualAttendanceEvent as a function', () => {
    expect(typeof db.createManualAttendanceEvent).toBe('function')
  })
})
