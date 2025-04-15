<!-- SoundPreviewCircle.vue -->
<template>
  <div
  class="w-8 h-8 rounded-full border-2 relative flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
  :class="isPlaying ? 'border-blue-600' : 'border-neutral-500'"
  @click="togglePlay"
>
  <!-- Progress Ring -->
  <svg class="absolute top-0 left-0 w-full h-full transform -rotate-90 z-0">
    <circle
      cx="50%"
      cy="50%"
      r="45%"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      :stroke-dasharray="circumference"
      :stroke-dashoffset="dashOffset"
      class="text-blue-600"
    />
  </svg>

  <!-- Icon -->
  <div class="z-10 flex items-center justify-center">
    <svg v-if="!isPlaying" class="w-4 h-4 text-current" fill="currentColor" viewBox="0 0 16 16">
      <path d="M4.5 3.5v9l7-4.5-7-4.5z" />
    </svg>
    <svg v-else class="w-4 h-4 text-current" fill="currentColor" viewBox="0 0 16 16">
      <path d="M5 3h2v10H5zm4 0h2v10H9z" />
    </svg>
  </div>
</div>

</template>

<script setup>
import { ref, onUnmounted, computed, watch } from 'vue'

const props = defineProps({
  src: String,
  duration: Number // in seconds
})

const audio = new Audio()
audio.preload = 'auto'

const isPlaying = ref(false)
const progress = ref(0)

let rafId = null

const circumference = 2 * Math.PI * 45
const dashOffset = computed(() => circumference * (1 - progress.value))

let timeoutId = null
const PREVIEW_DURATION = 15

function togglePlay() {
  if (isPlaying.value) {
    stopPlayback()
  } else {
    audio.src = props.src
    audio.currentTime = 0
    audio.play().then(() => {
      isPlaying.value = true
      setupProgressTracking()
    })

    timeoutId = setTimeout(stopPlayback, PREVIEW_DURATION * 1000)
  }
}

function setupProgressTracking() {
  audio.ontimeupdate = () => {
    if (!isPlaying.value) return
    progress.value = Math.min(audio.currentTime / PREVIEW_DURATION, 1)
  }
}


function stopPlayback() {
  audio.pause()
  audio.ontimeupdate = null
  clearTimeout(timeoutId)
  isPlaying.value = false
  progress.value = 0 // reset here only
}


onUnmounted(() => {
  stopPlayback()
})
</script>

<style scoped>
circle {
  transition: stroke-dashoffset 0.1s linear;
}
</style>
