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
  <div class="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-app text-center text-text-primary px-4">
    <h1 class="text-3xl font-semibold">Login Failed</h1>
    <p>Something went wrong during login. Please try again.</p>
    <button
      class="mt-2 rounded bg-surface-muted px-4 py-2 font-bold text-text-primary transition hover:bg-surface-raised/90"
      @click="goHome"
    >
      Back to Home
    </button>
  </div>
</template>
