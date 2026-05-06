import { describe, expect, it } from 'vitest'
import {
  annotateSoundAccess,
  evaluateSoundAccess,
  filterAccessibleSounds,
} from '@/utils/soundEntitlements'

describe('soundEntitlements', () => {
  it('allows free sounds for every user', () => {
    expect(evaluateSoundAccess({ plan_tier: 'free' }, { userTier: 'free' })).toMatchObject({
      accessible: true,
      locked: false,
      requiredPlan: null,
    })
  })

  it('locks paid sounds below the required plan and exposes upgrade metadata', () => {
    expect(evaluateSoundAccess({ plan_tier: 'pro' }, { userTier: 'basic' })).toMatchObject({
      accessible: false,
      locked: true,
      reason: 'tier',
      requiredPlan: 'pro',
      entitlementFeature: 'allPacks',
      canUpgrade: true,
    })
  })

  it('requires ownership and upload entitlement for user-uploaded sounds', () => {
    expect(evaluateSoundAccess(
      { plan_tier: 'users', owner_id: 'user-1' },
      { userTier: 'pro', userId: 'user-1', canUpload: true },
    )).toMatchObject({ accessible: true, isOwner: true })

    expect(evaluateSoundAccess(
      { plan_tier: 'users', owner_id: 'user-1' },
      { userTier: 'pro', userId: 'user-2', canUpload: true },
    )).toMatchObject({ accessible: false, reason: 'ownership', canUpgrade: false })
  })

  it('annotates sounds without mutating the source record', () => {
    const sound = { id: 's1', plan_tier: 'basic' }
    const annotated = annotateSoundAccess(sound, { userTier: 'free' })

    expect(annotated).toMatchObject({
      id: 's1',
      base: 'basic',
      locked: true,
      requiredPlan: 'basic',
    })
    expect(sound).not.toHaveProperty('locked')
  })

  it('filters a mixed list to accessible sounds only', () => {
    const sounds = [
      { id: 'free', plan_tier: 'free' },
      { id: 'basic', plan_tier: 'basic' },
      { id: 'pro', plan_tier: 'pro' },
    ]

    expect(filterAccessibleSounds(sounds, { userTier: 'basic' }).map(sound => sound.id))
      .toEqual(['free', 'basic'])
  })
})
