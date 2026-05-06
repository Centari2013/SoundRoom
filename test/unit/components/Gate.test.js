import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const tier = ref('free')

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ tier }),
}))

const { default: Gate } = await import('@/components/Gate.vue')

describe('Gate', () => {
  it('renders the locked slot when the plan lacks the feature', () => {
    tier.value = 'free'
    const wrapper = mount(Gate, {
      props: { feature: 'canUpload' },
      slots: {
        default: '<span>Uploader</span>',
        locked: '<span>Upgrade</span>',
      },
    })

    expect(wrapper.text()).toBe('Upgrade')
  })

  it('renders default content when the plan includes the feature', () => {
    tier.value = 'pro'
    const wrapper = mount(Gate, {
      props: { feature: 'canUpload' },
      slots: {
        default: '<span>Uploader</span>',
        locked: '<span>Upgrade</span>',
      },
    })

    expect(wrapper.text()).toBe('Uploader')
  })
})
