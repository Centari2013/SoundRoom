import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseInput from '@/components/ui/input/BaseInput.vue'

describe('BaseInput', () => {
  it('renders labels and wires input accessibility attributes', () => {
    const wrapper = mount(BaseInput, {
      props: {
        id: 'email',
        name: 'email',
        label: 'Email',
        modelValue: '',
        required: true,
      },
    })

    expect(wrapper.find('label').attributes('for')).toBe('email')
    expect(wrapper.find('input').attributes()).toMatchObject({
      id: 'email',
      name: 'email',
      required: '',
    })
  })

  it('emits model updates from typing', async () => {
    const wrapper = mount(BaseInput, {
      props: { modelValue: '', id: 'name' },
    })

    await wrapper.find('input').setValue('Studio A')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Studio A'])
  })

  it('marks invalid input and displays error text', () => {
    const wrapper = mount(BaseInput, {
      props: {
        id: 'password',
        modelValue: '',
        error: 'Password is required',
      },
    })

    expect(wrapper.find('input').attributes('aria-invalid')).toBe('true')
    expect(wrapper.find('input').attributes('aria-describedby')).toBe('password-error')
    expect(wrapper.find('[role="alert"]').text()).toBe('Password is required')
  })
})
