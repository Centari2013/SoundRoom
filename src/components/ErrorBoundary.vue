<template>
  <slot v-if="!hasError" />
  <div
    v-else
    class="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 bg-white text-neutral-900 dark:bg-black dark:text-white"
  >
    <p class="text-sm uppercase tracking-[0.2em] text-rose-500 mb-3">Unexpected error</p>
    <h2 class="text-2xl font-semibold mb-3">We couldn't load this view.</h2>
    <p class="max-w-md text-gray-600 dark:text-gray-400 mb-8">
      {{ errorMessage }}
    </p>
    <div class="flex flex-wrap items-center justify-center gap-3">
      <BaseButton @click="reloadPage">
        Try again
      </BaseButton>
      <BaseButton
        variant="naked"
        class="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
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
  void router.push('/')
}

onErrorCaptured((error) => {
  hasError.value = true
  errorMessage.value = error?.message ?? DEFAULT_ERROR_MESSAGE
  console.error('Captured UI error:', error)
  return false
})
</script>
