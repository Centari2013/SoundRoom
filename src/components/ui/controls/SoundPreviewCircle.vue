<!-- SoundPreviewCircle.vue -->
<template>
  <div
  class="mb-3 w-8 h-8 rounded-full border-2 relative flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
  :class="isPlaying ? 'border-blue-600' : 'border-neutral-500'"
  @click="togglePlay"
>
  <!-- Progress Ring -->
  <svg class="absolute top-0 left-0 w-full h-full transform -rotate-90 z-0">
    <circle
  ref="circleRef"
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

<!-- Duration -->
<span class="text-xs text-neutral-500 mt-2">{{ audioDuration }}</span>

</template>

<script setup>
import { ref, onUnmounted, computed, watch, onMounted, nextTick } from 'vue'
import { supabase } from '@/utils/supabase'

const props = defineProps({
  src: String,
  category: String,
  sendAudioUp: Boolean,
})

let audio = null
const audioDuration = ref(null)
let blobUrl = null

const isPlaying = ref(false)
const progress = ref(0)

let rafId = null
let timeoutId = null

const circleRef = ref(null)
const radius = ref(0)
const circumference = computed(() => 2 * Math.PI * radius.value)
const dashOffset = computed(() => circumference.value * (1 - progress.value))
const duration = ref(15)
const emit = defineEmits(['sendAudio'])

function emitAudio() {
  if (audio) {
    emit('sendAudio', {
      blobUrl,
      name: props.src,
      category: props.category
    })
  }
}

watch(() => props.sendAudioUp, (newValue) => {
  if (newValue) {
    emitAudio()
  }
})

function formatSecondsToTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
}


onMounted(async () => {
  const { data: fileData, error: fileError } = await supabase
    .storage
    .from(props.category)
    .download(props.src)

  if (fileError) {
    console.error(`Failed to download ${props.src}:`, fileError)
    return
  }

  blobUrl = URL.createObjectURL(fileData)
  audio = new Audio(blobUrl)
  audio.preload = 'auto'

  // Listen for when metadata (including duration) is ready
  audio.addEventListener('loadedmetadata', () => {
    audioDuration.value = formatSecondsToTime(audio.duration)
    duration.value = duration.value > audio.duration ? Math.floor(audio.duration) : duration.value
  }, { once: true })

  nextTick(() => {
    if (circleRef.value) {
      const bbox = circleRef.value.getBBox()
      radius.value = bbox.r || bbox.width / 2
    }
  })
})

function togglePlay() {
  if (isPlaying.value) {
    stopPlayback()
  } else {
    audio.currentTime = 0
    audio.play().then(() => {
      isPlaying.value = true
      setupProgressTracking()
    })

    timeoutId = setTimeout(stopPlayback, duration.value * 1000)
  }
}

function setupProgressTracking() {
  function updateProgress() {
    if (!audio.paused && isPlaying.value) {
      const ratio = Math.min(audio.currentTime / duration.value, 1)
      progress.value = ratio
      rafId = requestAnimationFrame(updateProgress)
    }
  }

  rafId = requestAnimationFrame(updateProgress)
}

function stopPlayback() {
  audio.pause()
  clearTimeout(timeoutId)
  cancelAnimationFrame(rafId)
  isPlaying.value = false
  progress.value = 0
}

onUnmounted(() => {
  stopPlayback()

  if (audio) {
    audio.src = ''
    audio.load()
    audio = null
  }

  if (blobUrl && !props.sendAudioUp) {
    URL.revokeObjectURL(blobUrl)
    blobUrl = null
  }
})

</script>


<style scoped>
circle {
  transition: stroke-dashoffset 0.1s linear;
}
</style>
