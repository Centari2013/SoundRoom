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
import downloadAudio from '@/utils/downloadAudio'

const props = defineProps({
  soundData: Object,
  sendAudioUp: Boolean,
  currentlyPlayingId: String
})

let audio = null
const audioDuration = ref(null)
let blobUrl = null

const isPlaying = ref(false)
const progress = ref(0)

let rafId = null
let timeoutId = null

const circleRef = ref(null) // ref to progress ring svg circle element
const radius = ref(0)
const circumference = computed(() => 2 * Math.PI * radius.value)
const dashOffset = computed(() => circumference.value * (1 - progress.value))
const duration = ref(15)
const emit = defineEmits(['sendAudio', 'updateCurrent'])
const hasBeenPromoted = ref(false)

async function emitAudio() {
  if (!blobUrl) {
    ({ blobUrl } = await downloadAudio(props.soundData.bucket, props.soundData.path, false))
  }
  hasBeenPromoted.value = true
  const { cone_inner, cone_outer, id, ...rest } = props.soundData

  const source = {
    audioPath: blobUrl,
    coneInner: cone_inner,
    coneOuter: cone_outer,
    libraryId: id,
    ...rest
  }

  emit('sendAudio', { ...source, blobUrl })
}


watch(() => props.sendAudioUp, (newValue) => { // send downloaded audio up to add to draggable sources when signaled
  if (newValue) {
    emitAudio() 
  }
})

watch(() => props.currentlyPlayingId, (newId) => { // stop sound playback when new sound is played
  if (newId !== props.soundData.libraryId && isPlaying.value) {
    stopPlayback()
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
  const duration_seconds = props.soundData.duration_seconds
  audioDuration.value = formatSecondsToTime(duration_seconds)
  duration.value = duration.value > duration_seconds ? duration_seconds : duration.value


  nextTick(() => {
    if (circleRef.value) {
      const bbox = circleRef.value.getBBox()
      radius.value = bbox.r || bbox.width / 2
    }
  })
})


async function togglePlay() {
  if (isPlaying.value) {
    stopPlayback()
  } else {
    ({ blobUrl, audio } = await downloadAudio(props.soundData.bucket, props.soundData.path, true, stopPlayback))
    audio.currentTime = 0
    audio.play().then(() => {
      isPlaying.value = true
      setupProgressTracking()
    })
    emit('updateCurrent', props.soundData.libraryId)

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
  if (!audio) return
  audio.removeEventListener('ended', stopPlayback)

  audio.pause()
  audio.removeAttribute('src')
  audio.load()
  

  clearTimeout(timeoutId)
  cancelAnimationFrame(rafId)

  isPlaying.value = false
  progress.value = 0

  if (blobUrl && !hasBeenPromoted.value) { // revoke blob to free up memory only if blob has not been piped up to draggable sources
    URL.revokeObjectURL(blobUrl)
    blobUrl = null
  }

  audio = null
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
