import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import AudioCacheManager from '@/lib/AudioCacheManager'

export const useAudioCacheStore = defineStore('audioCache', () => {
  const soundLibrarySources = ref([])
  const audioCacheManager = shallowRef(new AudioCacheManager())

  function clearSoundLibrarySources() {
    soundLibrarySources.value.forEach(src => {
      audioCacheManager.value.remove(src.libraryId)
    })
    soundLibrarySources.value = []
  }

  function soundLibrarySourcesToJSON() {
    return soundLibrarySources.value.map(src => ({
      libraryId: src.libraryId,
      coneInner: src.coneInner,
      coneOuter: src.coneOuter,
      name: src.name
    }))
  }

  return {
    soundLibrarySources,
    audioCacheManager,
    clearSoundLibrarySources,
    soundLibrarySourcesToJSON
  }
})
