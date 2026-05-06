import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseButton from '@/components/ui/input/BaseButton.vue'

describe('BaseButton', () => {
  it('emits click events and preserves the requested button type', async () => {
    const wrapper = mount(BaseButton, {
      props: { type: 'submit' },
      slots: { default: 'Save room' },
    })

    await wrapper.trigger('click')

    expect(wrapper.attributes('type')).toBe('submit')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('shows a loading state instead of slot content', () => {
    const wrapper = mount(BaseButton, {
      props: { loading: true },
      slots: { default: 'Save room' },
    })

    expect(wrapper.text()).toContain('Loading')
    expect(wrapper.text()).not.toContain('Save room')
  })

  it('sets disabled state on the native button', () => {
    const wrapper = mount(BaseButton, {
      props: { disabled: true },
    })

    expect(wrapper.attributes('disabled')).toBeDefined()
  })
})
