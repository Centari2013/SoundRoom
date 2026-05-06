import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { useEntitlementStore } from '@/stores/useEntitlementStore'

const tier = ref('free')

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ tier }),
}))

const { useEntitlements } = await import('@/composables/useEntitlements')

describe('useEntitlements', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    tier.value = 'free'
  })

  it('allows access when the current plan includes the feature', () => {
    tier.value = 'pro'
    const entitlements = useEntitlements()

    expect(entitlements.currentPlan.value).toBe('pro')
    expect(entitlements.canAccess('canUpload')).toBe(true)
    expect(entitlements.requireEntitlement('canUpload')).toBe(true)
  })

  it('opens the upsell modal when a feature is locked', () => {
    const entitlements = useEntitlements()
    const store = useEntitlementStore()

    expect(entitlements.requireEntitlement('allPacks')).toBe(false)
    expect(store.isOpen).toBe(true)
    expect(store.details).toMatchObject({
      feature: 'allPacks',
      planLabel: 'Pro',
    })
  })

  it('enforces numeric limits and targets the next useful plan', () => {
    const entitlements = useEntitlements()
    const store = useEntitlementStore()

    expect(entitlements.requireWithinLimit('maxSavedRooms', 1)).toBe(false)
    expect(store.details).toMatchObject({
      feature: 'maxSavedRooms',
      planLabel: 'Basic',
      title: 'Save more Saved Rooms',
    })
  })

  it('treats infinite pro limits as available', () => {
    tier.value = 'pro'
    const entitlements = useEntitlements()

    expect(entitlements.requireWithinLimit('maxSavedRooms', 10_000)).toBe(true)
  })
})
