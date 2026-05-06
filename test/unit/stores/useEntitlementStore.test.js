import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEntitlementStore } from '@/stores/useEntitlementStore'

describe('useEntitlementStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('opens with feature metadata for the upsell modal', () => {
    const store = useEntitlementStore()

    store.open({
      featureKey: 'canUpload',
      title: 'Unlock uploads',
      message: 'Upgrade to upload your own sounds.',
      plan: 'Pro',
    })

    expect(store.isOpen).toBe(true)
    expect(store.details).toEqual({
      feature: 'canUpload',
      title: 'Unlock uploads',
      message: 'Upgrade to upload your own sounds.',
      planLabel: 'Pro',
    })
  })

  it('closes without discarding the last modal details', () => {
    const store = useEntitlementStore()
    store.open({ featureKey: 'allPacks', title: 'Title', message: 'Message', plan: 'Pro' })
    store.close()

    expect(store.isOpen).toBe(false)
    expect(store.details.feature).toBe('allPacks')
  })
})
