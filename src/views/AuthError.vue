<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
/**
 * Navigate the user back to the home page.
 *
 * @returns {void}
 */
function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="flex flex-col items-center justify-center h-[100dvh] text-center space-y-3 text-text-primary">
    <h1>Login Failed</h1>
    <p>Something went wrong during login. Please try again.</p>
    <button
      class="mt-4 px-5 py-2 font-bold rounded bg-surface-muted text-text-primary hover:bg-surface-raised transition-colors"
      @click="goHome"
    >
      Back to Home
    </button>
  </div>
</template>
