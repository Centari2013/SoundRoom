import { describe, expect, it } from 'vitest'
import { can, limit } from '@/utils/permissions'
import { compareTiers, formatTierLabel, TIERS } from '@/utils/tierUtils'

describe('plan permissions', () => {
  it('checks feature flags for known plans', () => {
    expect(can('free', 'canUpload')).toBe(false)
    expect(can('basic', 'curatedPacks')).toBe(true)
    expect(can('pro', 'timelineScheduler')).toBe(true)
  })

  it('falls back to free entitlements for unknown plans', () => {
    expect(can('enterprise', 'canUpload')).toBe(false)
    expect(limit('enterprise', 'maxSavedRooms')).toBe(1)
  })

  it('returns numeric and infinite limits without coercion', () => {
    expect(limit('basic', 'maxSavedRooms')).toBe(10)
    expect(limit('pro', 'maxSavedRooms')).toBe(Infinity)
    expect(limit('free', 'missingLimit')).toBe(0)
  })
})

describe('tierUtils', () => {
  it('orders tiers from free through pro', () => {
    expect(TIERS).toEqual(['free', 'basic', 'pro'])
    expect(compareTiers('pro', 'basic')).toBeGreaterThan(0)
    expect(compareTiers('free', 'pro')).toBeLessThan(0)
    expect(compareTiers('basic', 'basic')).toBe(0)
  })

  it('treats unknown tiers as incomparable', () => {
    expect(compareTiers('enterprise', 'free')).toBe(0)
    expect(compareTiers('pro', 'enterprise')).toBe(0)
  })

  it('formats tier labels for display', () => {
    expect(formatTierLabel('free')).toBe('Free')
    expect(formatTierLabel('PRO')).toBe('Pro')
    expect(formatTierLabel()).toBe('Free')
  })
})
