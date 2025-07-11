import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import AudioCacheManager from '@/lib/AudioCacheManager'

/**
 * Store managing in-memory and persistent caching of audio assets.
 */

export const useAudioCacheStore = defineStore('audioCache', () => {
  const soundLibrarySources = ref([])
  const audioCacheManager = shallowRef(new AudioCacheManager())

  /**
   * Remove all cached library sources and revoke their object URLs.
   *
   * @returns {void}
   */
  function clearSoundLibrarySources() {
    soundLibrarySources.value.forEach(src => {
      audioCacheManager.value.remove(src.libraryId)
    })
    soundLibrarySources.value = []
  }

  /**
   * Serialize the library source list for persistence.
   *
   * @returns {Array<Object>} serialized source entries
   */
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
