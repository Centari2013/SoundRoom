import { describe, expect, it } from 'vitest'
import {
  getEntitlementsForPlan,
  hasPlanAccess,
  normalizePlan,
  resolveRequiredPlan,
} from '@/../api/_utils/entitlements.js'

describe('api entitlements', () => {
  it('normalizes plan ids defensively', () => {
    expect(normalizePlan('PRO')).toBe('pro')
    expect(normalizePlan('users')).toBe('users')
    expect(normalizePlan('enterprise')).toBe('free')
    expect(normalizePlan()).toBe('free')
  })

  it('resolves upload entitlement by plan', () => {
    expect(getEntitlementsForPlan('free').canUpload).toBe(false)
    expect(getEntitlementsForPlan('pro').canUpload).toBe(true)
  })

  it('compares plan access by rank', () => {
    expect(hasPlanAccess('pro', 'basic')).toBe(true)
    expect(hasPlanAccess('basic', 'pro')).toBe(false)
    expect(hasPlanAccess('free', null)).toBe(true)
    expect(hasPlanAccess('pro', 'users')).toBe(false)
  })

  it('resolves required plans in priority order', () => {
    expect(resolveRequiredPlan({ required_plan: 'pro', plan_tier: 'free' }, 'basic')).toBe('pro')
    expect(resolveRequiredPlan({ requiredPlan: 'basic' }, 'free')).toBe('basic')
    expect(resolveRequiredPlan({ plan_tier: 'pro' }, 'free')).toBe('pro')
    expect(resolveRequiredPlan({ base: 'basic' }, 'free')).toBe('basic')
    expect(resolveRequiredPlan(null, 'pro')).toBe('pro')
  })
})
