<template>
  <slot v-if="!hasError" />
  <div
    v-else
    class="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 bg-surface-base text-text-primary"
  >
    <p class="text-sm uppercase tracking-[0.2em] text-status-danger mb-3">Unexpected error</p>
    <h2 class="text-2xl font-semibold mb-3">We couldn't load this view.</h2>
    <p class="max-w-md text-text-muted mb-8">
      {{ errorMessage }}
    </p>
    <div class="flex flex-wrap items-center justify-center gap-3">
      <BaseButton @click="reloadPage">
        Try again
      </BaseButton>
      <BaseButton
        variant="naked"
        class="text-accent hover:text-accent-soft text-sm font-medium"
        @click="goHome"
      >
        Go back home
      </BaseButton>
    </div>
  </div>
</template>

<script setup>
import { ref, onErrorCaptured, watch } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/input/BaseButton.vue'

const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Refresh the page to try again.'
const hasError = ref(false)
const errorMessage = ref(DEFAULT_ERROR_MESSAGE)
const router = useRouter()
const props = defineProps({
  resetOn: {
    type: [String, Number, Boolean],
    default: null,
  },
})

watch(
  () => props.resetOn,
  () => {
    hasError.value = false
    errorMessage.value = DEFAULT_ERROR_MESSAGE
  }
)

function reloadPage() {
  window.location.reload()
}

function goHome() {
  hasError.value = false
  errorMessage.value = DEFAULT_ERROR_MESSAGE
  void router.push({ name: 'landing' })
}

onErrorCaptured((error) => {
  hasError.value = true
  errorMessage.value = error?.message ?? DEFAULT_ERROR_MESSAGE
  console.error('Captured UI error:', error)
  return false
})
</script>
