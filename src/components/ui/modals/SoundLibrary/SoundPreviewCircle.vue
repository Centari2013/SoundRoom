<!-- SoundPreviewCircle.vue -->
<template>
  <div
    class="mb-3 w-8 h-8 rounded-full border-2 relative flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
    :class="[
      isPlaying ? 'border-blue-600' : 'border-neutral-600',
      isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:scale-105'
    ]"
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
  <span class="text-xs text-neutral-600 mt-2">{{ audioDuration }}</span>
</template>

<script setup>
import { ref, onUnmounted, computed, watch, onMounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useAudioEngineStore } from '@/stores/useAudioEngineStore'
import { useAudioCacheStore } from '@/stores/useAudioCacheStore'
import { buildStorageKey, fetchAudioBlob } from '@/utils/downloadAudio'

const props = defineProps({
  soundData: Object,
  currentlyPlayingId: String,
  locked: Boolean
})

const emit = defineEmits(['updateCurrent', 'locked'])

const audioDuration = ref(null)
const duration = ref(0)
const isPlaying = ref(false)
const progress = ref(0)
const isLoading = ref(false)

let rafId = null
let timeoutId = null
let bufferSource = null
let playStartTime = 0

const circleRef = ref(null)
const radius = ref(0)
const circumference = computed(() => 2 * Math.PI * radius.value)
const dashOffset = computed(() => circumference.value * (1 - progress.value))

const audioEngineStore = useAudioEngineStore()
const { audioEngine } = storeToRefs(audioEngineStore)
const audioCacheStore = useAudioCacheStore()
const { audioCacheManager } = storeToRefs(audioCacheStore)

watch(() => props.currentlyPlayingId, (newId) => {
  if (newId !== props.soundData.libraryId && isPlaying.value) {
    stopPlayback()
  }
})

function formatSecondsToTime(totalSeconds = 0) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)

  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function syncDurationFromProps() {
  const durationSeconds = props.soundData?.duration_seconds ?? props.soundData?.preview_duration_seconds ?? 0
  audioDuration.value = formatSecondsToTime(durationSeconds)
  duration.value = durationSeconds
}

onMounted(async () => {
  syncDurationFromProps()

  nextTick(() => {
    if (circleRef.value) {
      const bbox = circleRef.value.getBBox()
      radius.value = bbox.r || bbox.width / 2
    }
  })
})

watch(
  () => props.soundData?.duration_seconds,
  () => {
    syncDurationFromProps()
  }
)

async function togglePlay() {
  if (props.locked) {
    emit('locked')
    return
  }
  if (isLoading.value) return
  if (isPlaying.value) {
    stopPlayback()
    return
  }

  const engine = audioEngine.value
  if (!engine) {
    console.warn('Audio engine not ready yet; cannot preview sound.')
    return
  }
  const context = engine.getAudioContext()
  if (!context) {
    console.warn('Audio context unavailable; cannot preview sound.')
    return
  }

  if (context.state === 'suspended') {
    try {
      await context.resume()
    } catch (err) {
      console.warn('Failed to resume audio context for preview:', err)
    }
  }

  const cacheManager = audioCacheManager.value
  if (!cacheManager) {
    console.warn('Audio cache manager not initialised; cannot preview sound.')
    return
  }

  if (!cacheManager.audioContext && typeof cacheManager.setAudioContext === 'function') {
    cacheManager.setAudioContext(context)
  }

  const previewUrl = props.soundData?.preview_url
  const bucket = props.soundData?.bucket
  const path = props.soundData?.path
  const base = props.soundData?.base ?? props.soundData?.plan_tier ?? (props.soundData?.owner_id ? 'users' : 'free')
  const derivedStorageKey = bucket && path ? buildStorageKey(base, bucket, path) : null
  const storageKey = props.soundData?.storageKey ?? derivedStorageKey
  const fallbackFileId = props.soundData?.libraryId ?? storageKey ?? props.soundData?.audioPath ?? crypto.randomUUID()
  const fileId = previewUrl ? `preview-${fallbackFileId}` : fallbackFileId

  isLoading.value = true

  try {
    const buffer = await cacheManager.getAudioBuffer(fileId, async () => {
      if (previewUrl) {
        const previewResponse = await fetch(previewUrl)
        if (!previewResponse.ok) {
          throw new Error(`Failed to fetch preview audio (status ${previewResponse.status})`)
        }
        return await previewResponse.blob()
      }

      if (storageKey) {
        return await fetchAudioBlob(storageKey)
      }

      if (props.soundData?.audioPath) {
        const res = await fetch(props.soundData.audioPath)
        if (!res.ok) {
          throw new Error(`Failed to fetch preview audio (status ${res.status})`)
        }
        return await res.blob()
      }

      throw new Error('Missing storage metadata for sound preview.')
    })

    if (!buffer) {
      throw new Error('No audio buffer returned for preview.')
    }

    stopPlayback()

    bufferSource = context.createBufferSource()
    bufferSource.buffer = buffer
    bufferSource.onended = () => stopPlayback(true)
    bufferSource.connect(context.destination)

    const playbackDuration = buffer.duration
    playStartTime = context.currentTime

    bufferSource.start(0, 0, playbackDuration)

    isPlaying.value = true
    emit('updateCurrent', props.soundData.libraryId)

    setupProgressTracking(context, playbackDuration)
    timeoutId = setTimeout(() => stopPlayback(), playbackDuration * 1000)
  } catch (err) {
    console.error('Failed to preview sound:', err)
    stopPlayback()
  } finally {
    isLoading.value = false
  }
}

function setupProgressTracking(context, maxDuration) {
  cancelAnimationFrame(rafId)

  function updateProgress() {
    if (isPlaying.value) {
      const elapsed = Math.max(0, context.currentTime - playStartTime)
      const denom = maxDuration || 1
      progress.value = Math.min(elapsed / denom, 1)
      rafId = requestAnimationFrame(updateProgress)
    }
  }

  rafId = requestAnimationFrame(updateProgress)
}

function stopPlayback(skipStop = false) {
  clearTimeout(timeoutId)
  timeoutId = null
  cancelAnimationFrame(rafId)

  if (bufferSource) {
    try {
      bufferSource.onended = null
      if (!skipStop) {
        bufferSource.stop()
      }
      bufferSource.disconnect()
    } catch (err) {
      console.warn('Problem stopping preview source:', err)
    }
    bufferSource = null
  }

  isPlaying.value = false
  progress.value = 0
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
