import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PulsingOverlay from '@/components/ui/overlays/PulsingOverlay.vue'

describe('PulsingOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stays visible by default until the parent unmounts it', async () => {
    const wrapper = mount(PulsingOverlay, {
      props: { text: 'Loading your room...' },
    })

    expect(wrapper.text()).toContain('Loading your room...')

    await vi.advanceTimersByTimeAsync(5000)

    expect(wrapper.text()).toContain('Loading your room...')
    expect(wrapper.emitted('done')).toBeUndefined()
  })

  it('can still auto-dismiss when a duration is provided', async () => {
    const wrapper = mount(PulsingOverlay, {
      props: {
        text: 'Logging out...',
        duration: 500,
      },
    })

    await vi.advanceTimersByTimeAsync(500)
    await vi.advanceTimersByTimeAsync(1000)

    expect(wrapper.text()).not.toContain('Logging out...')
  })
})
