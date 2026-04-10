import { describe, expect, it } from 'vitest'
import { attendanceChannelLabel, getAttendanceEventDateTime } from './attendancePresentation'

describe('attendancePresentation', () => {
  it('maps manual_admin to a user-facing label', () => {
    expect(attendanceChannelLabel('manual_admin')).toBe('Manual admin')
  })

  it('prefers the attendance timestamp over the record creation time', () => {
    expect(getAttendanceEventDateTime({
      timestamp: '2026-04-08T08:00:00.000Z',
      createdAt: '2026-04-10T12:00:00.000Z',
    })).toBe('2026-04-08T08:00:00.000Z')
  })
})
