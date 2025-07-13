import { defineStore } from 'pinia'
import { shallowRef, computed } from 'vue'
import AudioEngine from '@/lib/AudioEngine'
import { useListenerStore } from './useListenerStore'
import { useAudioCacheStore } from './useAudioCacheStore'

/**
 * Store wrapper around {@link AudioEngine} exposing helpers for loading,
 * serializing and setting up the audio context.
 */

export const useAudioEngineStore = defineStore('audioEngine', () => {
  const audioEngine = shallowRef(new AudioEngine([]))

  /**
   * Load a serialized audio engine configuration.
   *
   * @param {Object} data - data produced by `AudioEngine.toJSON()`
   * @returns {void}
   */
  function loadAudioEngine(data) {
    audioEngine.value = AudioEngine.fromJSON(data)
  }

  /**
   * Serialize the current audio engine state.
   *
   * @returns {Object}
   */
  function audioEngineToJSON() {
    return audioEngine.value.toJSON()
  }

  /**
   * Limit how many sound sources can exist on the canvas.
   *
   * @param {number} max - maximum number of sources
   * @returns {void}
   */
  function setMaxCanvasSources(max) {
    if (audioEngine.value) {
      audioEngine.value.maxSourceCount = max
    }
  }

  /**
   * Instantiate the Web Audio context and wire up related stores.
   *
   * @returns {void}
   */
  function setupAudioContext() {
    const listenerStore = useListenerStore()
    const cacheStore = useAudioCacheStore()
    const audioContext = audioEngine.value.getAudioContext()

    listenerStore.listener.setAudioContext(audioContext)
    cacheStore.audioCacheManager.setAudioContext(audioContext)
    audioEngine.value.setupAudioEngine()
    listenerStore.listener.updateAudio()
  }

  /**
   * Loads an impulse response (IR) into the audio engine.
   *
   * @async
   * @param {string} irName - The name of the impulse response.
   * @param {string} URL - The URL from which to fetch the impulse response audio file.
   * @returns {Promise<void>} Resolves when the impulse response has been loaded.
   */
  async function loadIR(irName, URL) {
    await audioEngine.value.loadImpulseResponse(irName, URL)
  }

  const isPlaying = computed(() => audioEngine.value.isPlaying.value)
  const MAX_CANVAS_SOURCES = computed(() => audioEngine.value.maxSourceCount)

  return {
    audioEngine,
    loadAudioEngine,
    audioEngineToJSON,
    setMaxCanvasSources,
    setupAudioContext,
    loadIR,
    isPlaying,
    MAX_CANVAS_SOURCES
  }
})
