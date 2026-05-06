import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatDate } from '@/utils/dateUtils'

describe('dateUtils', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-06T16:30:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats dates from today with time', () => {
    expect(formatDate('2026-05-06T15:05:00Z')).toBe('Today at 11:05 AM')
  })

  it('formats dates from yesterday with time', () => {
    expect(formatDate('2026-05-05T13:00:00Z')).toBe('Yesterday at 9:00 AM')
  })

  it('uses relative wording inside the recent window', () => {
    expect(formatDate('2026-05-04T17:30:00Z')).toBe('2 days ago')
  })

  it('includes the year for dates outside the current year', () => {
    expect(formatDate('2025-12-25T10:15:00Z')).toBe('Dec 25, 2025 at 5:15 AM')
  })
})
