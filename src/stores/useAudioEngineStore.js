import { defineStore } from 'pinia'
import { shallowRef, computed } from 'vue'
import AudioEngine from '@/lib/AudioEngine'
import { useListenerStore } from './useListenerStore'
import { useAudioCacheStore } from './useAudioCacheStore'

export const useAudioEngineStore = defineStore('audioEngine', () => {
  const audioEngine = shallowRef(new AudioEngine([]))

  function loadAudioEngine(data) {
    audioEngine.value = AudioEngine.fromJSON(data)
  }

  function audioEngineToJSON() {
    return audioEngine.value.toJSON()
  }

  function setMaxCanvasSources(max) {
    if (audioEngine.value) {
      audioEngine.value.maxSourceCount = max
    }
  }

  function setupAudioContext() {
    const listenerStore = useListenerStore()
    const cacheStore = useAudioCacheStore()
    const audioContext = audioEngine.value.getAudioContext()
    listenerStore.listener.setAudioContext(audioContext)
    cacheStore.audioCacheManager.setAudioContext(audioContext)
    audioEngine.value.setupAudioEngine()
    listenerStore.listener.updateAudio()
  }

  const isPlaying = computed(() => audioEngine.value.isPlaying.value)
  const MAX_CANVAS_SOURCES = computed(() => audioEngine.value.maxSourceCount)

  return {
    audioEngine,
    loadAudioEngine,
    audioEngineToJSON,
    setMaxCanvasSources,
    setupAudioContext,
    isPlaying,
    MAX_CANVAS_SOURCES
  }
})
