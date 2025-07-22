import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { formatDate } from '../src/utils/dateUtils.js'

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2024-03-10T12:00:00Z'))
})

afterAll(() => {
  vi.useRealTimers()
})

describe('formatDate', () => {
  it('formats dates from today', () => {
    const str = formatDate('2024-03-10T08:00:00Z')
    expect(str).toContain('Today')
  })

  it('formats dates from yesterday', () => {
    const str = formatDate('2024-03-09T10:00:00Z')
    expect(str).toContain('Yesterday')
  })

  it('uses relative strings for recent dates', () => {
    const str = formatDate('2024-03-08T13:00:00Z')
    expect(str).toContain('ago')
  })

  it('formats older dates with month and day', () => {
    const str = formatDate('2023-12-25T15:00:00Z')
    expect(str).toMatch(/Dec 25, 2023/i)
  })
})
