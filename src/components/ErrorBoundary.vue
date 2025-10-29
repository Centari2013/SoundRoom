<template>
  <slot v-if="!hasError" />
  <div
    v-else
    class="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 bg-panel text-primary"
  >
    <p class="text-sm uppercase tracking-[0.2em] text-rose-500 mb-3">Unexpected error</p>
    <h2 class="text-2xl font-semibold mb-3">We couldn't load this view.</h2>
    <p class="max-w-md text-muted mb-8">
      {{ errorMessage }}
    </p>
    <div class="flex flex-wrap items-center justify-center gap-3">
      <BaseButton @click="reloadPage">
        Try again
      </BaseButton>
      <BaseButton
        variant="naked"
        class="text-accent hover:text-accent/80 text-sm font-medium"
        @click="goHome"
      >
        Go back home
      </BaseButton>
    </div>
  </div>
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/input/BaseButton.vue'

const hasError = ref(false)
const errorMessage = ref('Something went wrong. Refresh the page to try again.')
const router = useRouter()

function reloadPage() {
  window.location.reload()
}

function goHome() {
  hasError.value = false
  errorMessage.value = 'Something went wrong. Refresh the page to try again.'
  void router.push('/')
}

onErrorCaptured((error) => {
  hasError.value = true
  errorMessage.value = error?.message ?? 'Something went wrong. Refresh the page to try again.'
  console.error('Captured UI error:', error)
  return false
})
</script>
