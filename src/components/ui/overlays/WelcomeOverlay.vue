<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-panel-overlay text-panel-overlay"
    >
      <div class="text-center space-y-4">
        <h1
          class="text-5xl lg:text-6xl font-semibold tracking-tight bg-gradient-to-b from-gray-300 via-gray-500 to-gray-200 dark:from-neutral-200 dark:via-neutral-400 dark:to-neutral-100 bg-clip-text text-transparent drop-shadow-md"
        >
          {{ text }}
        </h1>
        <p
          v-if="subtext"
          class="text-lg opacity-80"
        >
          {{ subtext }}
        </p>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { onMounted, ref } from 'vue'

defineProps({
  text: {
    type: String,
    default: 'Welcome to SoundRoom'
  },
  subtext: {
    type: String,
    default: 'Immersive audio. Minimal distraction'
  }
})

const visible = ref(true)

onMounted(() => {
  setTimeout(() => {
    visible.value = false
  }, 2500)
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
