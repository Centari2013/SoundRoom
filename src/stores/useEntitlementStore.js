import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useEntitlementStore = defineStore('entitlement', () => {
  const isOpen = ref(false)
  const feature = ref(null)
  const planLabel = ref('')
  const modalTitle = ref('')
  const modalMessage = ref('')

  function open({ featureKey, title, message, plan }) {
    feature.value = featureKey
    modalTitle.value = title
    modalMessage.value = message
    planLabel.value = plan
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  const details = computed(() => ({
    feature: feature.value,
    planLabel: planLabel.value,
    title: modalTitle.value,
    message: modalMessage.value
  }))

  return {
    isOpen,
    details,
    title: modalTitle,
    message: modalMessage,
    planLabel,
    open,
    close
  }
})
