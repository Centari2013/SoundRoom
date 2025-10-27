// directives/v-can.js
import { can } from '@/utils/permissions'
import { useAuth } from '@/composables/useAuth'

export default {
  mounted(el, binding) {
    const { tier } = useAuth()
    const allowed = can(tier.value, binding.value)
    if (!allowed) el.setAttribute('disabled', 'true')
  },
  updated(el, binding) {
    const { tier } = useAuth()
    const allowed = can(tier.value, binding.value)
    if (!allowed) el.setAttribute('disabled', 'true')
    else el.removeAttribute('disabled')
  }
}
