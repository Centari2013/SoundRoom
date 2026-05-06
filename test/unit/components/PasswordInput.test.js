import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PasswordInput from '@/components/ui/input/PasswordInput.vue'

describe('PasswordInput', () => {
  it('starts as a password field and toggles visibility', async () => {
    const wrapper = mount(PasswordInput, {
      props: { modelValue: 'Secret1!', name: 'password', id: 'password' },
    })

    expect(wrapper.find('input').attributes('type')).toBe('password')
    expect(wrapper.find('button').attributes('aria-label')).toBe('Show password')

    await wrapper.find('button').trigger('click')

    expect(wrapper.find('input').attributes('type')).toBe('text')
    expect(wrapper.find('button').attributes('aria-label')).toBe('Hide password')
  })

  it('proxies model updates from BaseInput', async () => {
    const wrapper = mount(PasswordInput, {
      props: { modelValue: '', id: 'password' },
    })

    await wrapper.find('input').setValue('SoundRoom1!')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['SoundRoom1!'])
  })
})
