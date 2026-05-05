import { defineStore, storeToRefs } from 'pinia'
import { computed } from 'vue'
import AudioEngine from '@/lib/AudioEngine'
import { useRoomStore } from './useRoomStore'
import { useListenerStore } from './useListenerStore'
import { useAudioCacheStore } from './useAudioCacheStore'

/**
 * Store wrapper around {@link AudioEngine} exposing helpers for loading,
 * serializing and setting up the audio context.
 */

export const useAudioEngineStore = defineStore('audioEngine', () => {
  const roomStore = useRoomStore()
  const { room } = storeToRefs(roomStore)
  const audioEngine = computed({
    get: () => room.value.audioEngine.value,
    set: (val) => { room.value.audioEngine.value = val }
  })

  /**
   * Load a serialized audio engine configuration.
   *
   * @param {Object} data - data produced by `AudioEngine.toJSON()`
   * @returns {void}
   */
  function loadAudioEngine(data) {
    room.value.setAudioEngine(AudioEngine.fromJSON(data))
  }

  /**
   * Resume the audio context if it is suspended.
   *
   * @returns {void}
   */
  function resumeAudioContext() {
    audioEngine.value.resumeAudioContext()
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
   * Reset the audio engine to its initial state.
   */
  function resetAudioEngine() {
    if (audioEngine.value) audioEngine.value.dispose()
    room.value.setAudioEngine()
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

  /**
   * Plays sound source.
   * @param {SoundSource} src - The sound source to play.
   * @returns {void}
   */
  function playSoundSource(src) {
    audioEngine.value.playSoundSource(src)
  }
  /**
   * Pauses sound source.
   * @param {SoundSource} src - The sound source to pause.
   * @returns {void}
   */
  function pauseSoundSource(src) {
    audioEngine.value.pauseSoundSource(src)
  }

  function addTimelineClip(sourceId, startTime, duration) {
    return audioEngine.value.addTimelineClip(sourceId, startTime, duration)
  }

  function removeTimelineClip(clipId) {
    audioEngine.value.removeTimelineClip(clipId)
  }

  function removeSourceFromTimeline(sourceId) {
    audioEngine.value.removeSourceFromTimeline(sourceId)
  }

  function updateTimelineClip(clipId, patch) {
    audioEngine.value.updateTimelineClip(clipId, patch)
  }

  function setTimelineDuration(seconds) {
    audioEngine.value.setTimelineDuration(seconds)
  }

  function setTimelineLoop(loop) {
    audioEngine.value.setTimelineLoop(loop)
  }

  function playTimeline(fromSeconds) {
    audioEngine.value.playTimeline(fromSeconds)
  }

  function pauseTimeline() {
    audioEngine.value.pauseTimeline()
  }

  function stopTimeline() {
    audioEngine.value.stopTimeline()
  }

  function seekTimeline(seconds) {
    audioEngine.value.seekTimeline(seconds)
  }

  const allSourcesOnTimeline = computed(() => audioEngine.value.allSourcesOnTimeline)

  const isPlaying = computed(() => {
    if (allSourcesOnTimeline.value) {
      return audioEngine.value.timelineScheduler?.isRunning.value ?? false
    }
    return audioEngine.value.soundSources.value.some(w => w.instance.playing)
  })

  const MAX_CANVAS_SOURCES = computed(() => audioEngine.value.maxSourceCount)

  return {
    audioEngine,
    loadAudioEngine,
    audioEngineToJSON,
    resumeAudioContext,
    setMaxCanvasSources,
    setupAudioContext,
    resetAudioEngine,
    loadIR,
    playSoundSource,
    pauseSoundSource,
    addTimelineClip,
    removeTimelineClip,
    removeSourceFromTimeline,
    updateTimelineClip,
    setTimelineDuration,
    setTimelineLoop,
    playTimeline,
    pauseTimeline,
    stopTimeline,
    seekTimeline,
    allSourcesOnTimeline,
    isPlaying,
    MAX_CANVAS_SOURCES
  }
})
