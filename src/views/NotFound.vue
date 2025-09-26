<template>
  <div class="h-full w-full flex flex-col items-center justify-center text-center px-6 py-12 bg-white text-neutral-900 dark:bg-black dark:text-white">
    <p class="text-sm uppercase tracking-[0.2em] text-rose-500 mb-3">404</p>
    <h1 class="text-3xl font-semibold mb-3">Page not found</h1>
    <p class="max-w-md text-gray-600 dark:text-gray-400 mb-8">
      The page you are looking for doesn't exist or may have moved. Check the address or head back to SoundRoom.
    </p>
    <div class="flex flex-wrap items-center justify-center gap-3">
      <BaseButton @click="goHome">
        Return to SoundRoom
      </BaseButton>
      <RouterLink
        to="/help"
        class="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
      >
        Visit help center
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/input/BaseButton.vue'

const router = useRouter()

function goHome() {
  void router.push('/')
}
</script>
