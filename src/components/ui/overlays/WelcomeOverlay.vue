<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-surface-app/70"
    >
      <div class="text-center space-y-4">
        <h1
          class="text-5xl lg:text-6xl font-semibold tracking-tight bg-gradient-to-b from-[rgba(var(--color-text-muted-rgb),0.75)] via-[rgba(var(--color-text-secondary-rgb),0.9)] to-[rgba(var(--color-text-primary-rgb),0.95)] bg-clip-text text-transparent drop-shadow-md"
        >
          {{ text }}
        </h1>
        <p
          v-if="subtext"
          class="text-lg text-text-muted opacity-80"
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
