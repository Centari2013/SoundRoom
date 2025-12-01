// lib/AudioEngine.js
import SoundSource from '@/lib/SoundSource'
import SoundScheduler from '@/lib/SoundScheduler'
import Room from './Room'
import { computed, ref, watch, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { useAudioCacheStore } from '@/stores/useAudioCacheStore'
import { buildStorageKey } from '@/utils/downloadAudio'

/**
 * Central manager for all Web Audio operations.
 *
 * The engine maintains a single `AudioContext`, a master gain node and a
 * collection of `SoundSource` instances. It exposes helpers for creating the
 * context lazily, playing/pausing all sources and serialising the current
 * state so a room can be saved and rehydrated.
 */

export default class AudioEngine {
  soundSources = ref([])
  #masterGain = null
  #audioContext = null
  masterVolume = ref(null)
  #MAX_SOURCE_COUNT = 30
  #uninitializedSoundSources = null
  #scheduler = null
  #scheduleWatchers = null

  #convolver = null
  #reverbGain = null
  #currentIRName = null

  #room = null
  #audioCacheManagerRef = null


  /**
   * Create a new AudioEngine instance.
   *
   * @param {Array} [uninitializedSoundSources=[]] sound sources to create on setup
   * @param {number} [volume=1] initial master volume
   */
  constructor(uninitializedSoundSources, volume = 1 ) {
    this.#uninitializedSoundSources = uninitializedSoundSources || []
    this.soundSources.value = []  // reactive array of sources
    this.masterVolume.value = volume
    this.#scheduler = new SoundScheduler(this)
    this.#scheduleWatchers = new Map()

    try {
      const cacheStore = useAudioCacheStore()
      if (cacheStore) {
        const { audioCacheManager } = storeToRefs(cacheStore)
        this.#audioCacheManagerRef = audioCacheManager
      }
    } catch (err) {
      console.warn('Audio cache store unavailable during AudioEngine initialisation:', err)
    }

    watch(this.masterVolume, (v) => {
      if (this.#masterGain && this.#audioContext) {
        this.#masterGain.gain.setValueAtTime(v, this.#audioContext.currentTime)
      }
    })

    // Computed: tracks if anything is playing
    this.isPlaying = computed(() =>
      this.soundSources.value.some(s => s.instance?.playing)
    )
  }

  /**
   * Set the room this engine is associated with.
   * @param {Room} room - the room instance to associate with this engine
   */
  setRoom(room) {
    if (room && !(room instanceof Room)) {
      throw new Error("Expected an instance of Room");
    }
    this.#room = room;
  }

  /**
   * Resume the audio context if it is suspended.
   */
  resumeAudioContext() {
    if (this.#audioContext && this.#audioContext.state === 'suspended') {
      this.#audioContext.resume()
    }
  }

  /**
   * Lazily create and return the shared `AudioContext` instance.
   *
   * @returns {AudioContext}
   */
  getAudioContext() {
    // Lazily create the audio context and master gain node on first use.
    // Subsequent calls return the same context.
    if (this.#audioContext) return this.#audioContext;
    this.#audioContext = new (window.AudioContext || window.webkitAudioContext)()

    // Create master gain when context is created
    this.#masterGain = this.#audioContext.createGain()
    this.#masterGain.gain.value = this.masterVolume.value // default volume
    this.#masterGain.connect(this.#audioContext.destination)
    
    // Inside getAudioContext()
    const reverbChainContext = this.#convolver?.context
    const gainContext = this.#reverbGain?.context
    const needsReverbChainReset =
      !this.#convolver ||
      !this.#reverbGain ||
      reverbChainContext !== this.#audioContext ||
      gainContext !== this.#audioContext

    if (needsReverbChainReset) {
      const previousBuffer = this.#convolver?.buffer ?? null
      const previousWetValue = this.#reverbGain?.gain?.value ?? 0.6

      try {
        this.#convolver?.disconnect()
      } catch (err) {
        console.warn('Problem disconnecting old convolver during context reset:', err)
      }
      try {
        this.#reverbGain?.disconnect()
      } catch (err) {
        console.warn('Problem disconnecting old reverb gain during context reset:', err)
      }

      this.#convolver = this.#audioContext.createConvolver()
      this.#reverbGain = this.#audioContext.createGain()
      this.#reverbGain.gain.value = previousWetValue

      if (previousBuffer) {
        try {
          // Reapply the previously loaded impulse response when possible.
          this.#convolver.buffer = previousBuffer
        } catch (err) {
          console.warn('Unable to reapply existing impulse response after context reset:', err)
        }
      }

      this.#convolver.connect(this.#reverbGain)
      this.#reverbGain.connect(this.#masterGain)

      // Ensure any already-created sources are routed through the new convolver
      this.soundSources.value.forEach(s => {
        if (s.instance?.reverbSend) {
          try {
            s.instance.reverbSend.connect(this.#convolver)
          } catch (err) {
            console.warn('Failed to reconnect reverb send after context reset:', err)
          }
        }
      })
    }

    return this.#audioContext
  }

  /**
   * Re-create sound sources and register media session handlers.
   */
  setupAudioEngine() {
    // Recreate `SoundSource` instances from any previously saved data and
    // register media session handlers so hardware play/pause keys work.
    if (this.#uninitializedSoundSources.length > 0) { // add loaded sound sources
      this.#uninitializedSoundSources.forEach(src => {
        this.addSoundSource(src) // saved sound sources already in payload format
      })
    }

    this.#scheduler.start();

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        this.playAll()
      })
    
      navigator.mediaSession.setActionHandler('pause', () => {
        this.pauseAll()
      })
    
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'SoundRoom',
        artist: 'Various',
        album: 'SoundRoom Noise',
        artwork: [
          {
            src: 'SoundRoom.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      })
    }

  }

  /**
   * Create a new `SoundSource` instance from a library entry and insert it
   * into the reactive `soundSources` array.
   *
   * @param {{src:Object, index?:number}} payload
   */
  addSoundSource(payload) {
    if (this.maxSourceCountReached){
      window.alert(`Limit of ${this.#MAX_SOURCE_COUNT} sound${this.#MAX_SOURCE_COUNT == 1 ? '' : 's'} in room reached.`);
      return
    }
    const src = payload.src
    
    src.index = payload.index ?? this.soundSources.value.length // for proper undo and redo
    const base = src.base ?? src.plan_tier ?? 'users'
    const storageKey = src.storageKey ?? (src.bucket && src.path ? buildStorageKey(base, src.bucket, src.path) : null)
    const fileId = src.fileId ?? src.libraryId ?? storageKey ?? src.audioPath ?? null

    const instance = new SoundSource({
      audioContext: this.getAudioContext(),
      masterGain: this.#masterGain,
      file: {
        audioPath: src.audioPath,
        libraryId: src.libraryId,
        bucket: src.bucket,
        path: src.path,
        base,
        storageKey,
        fileId
      },
      state: src.state,
      audioCacheManager: this.#audioCacheManagerRef?.value ?? null
    })
    // Route the new source through the reverb chain
    this.connectToReverb(instance)
    instance.setRoom(this.#room)

    src.instance = instance
    this.soundSources.value.splice(src.index, 0, src)
    // keep the stored indices aligned with the reactive array order
    for (let i = src.index; i < this.soundSources.value.length; i++) {
      this.soundSources.value[i].index = i
    }
    if (this.#audioContext?.state === 'suspended') {
      this.#audioContext.resume()
    }
    
    // Watch schedule changes to hook into the scheduler
    const sched = instance.state.schedule
    const enabledUnwatch = watch(
      () => sched.enabled,
      () => {
        if (!sched.paused) {
          this.#scheduler.updateSchedule(instance)
        }
      }
    )

    const paramsUnwatch = watch(
      () => [sched.gapMin, sched.gapMax, sched.activeStart, sched.activeEnd, sched.count, sched.mode],
      () => {
        if (sched.enabled && !sched.paused) {
          this.#scheduler.updateSchedule(instance)
        }
      }
    )
    this.#scheduleWatchers.set(sched.id, [enabledUnwatch, paramsUnwatch])

    if (!sched.paused) {
      this.#scheduler.scheduleNewSource(instance)
    }

  }

  /**
   * Remove a `SoundSource` from the engine and clean up its audio nodes.
   *
   * @param {{index:number, src:Object}} payload
   * @returns {?Object} serialized source data for undo
   */
  deleteSoundSource(payload) {
    // Remove a `SoundSource` from the canvas and clean up its audio nodes.
    // The index logic is defensive to handle stale state from undo/redo.

    const expectedInstance = payload.src?.instance ?? null

    let index = Number.isInteger(payload.index) ? payload.index : -1
    const hasCandidateAtIndex = index >= 0 && index < this.soundSources.value.length
    if (hasCandidateAtIndex) {
      const candidate = this.soundSources.value[index]
      if (candidate !== payload.src && candidate?.instance !== expectedInstance) {
        index = -1
      }
    } else {
      index = -1
    }

    if (index === -1 && expectedInstance) {
      index = this.soundSources.value.findIndex(s => s.instance === expectedInstance)
    }

    if (index === -1 && payload.src?.state) {
      index = this.soundSources.value.findIndex(s => s.state === payload.src.state)
    }

    if (index === -1 && Number.isInteger(payload.src?.index)) {
      const fallbackIndex = payload.src.index
      if (fallbackIndex >= 0 && fallbackIndex < this.soundSources.value.length) {
        index = fallbackIndex
      }
    }

    const src = this.soundSources.value[index]
    if (!src) {
      console.warn("Tried to delete sound source but index", payload.index, "was invalid.")
      return {}
    }

    const instance = src.instance ?? expectedInstance ?? null

    const currentlyPaused = src?.state?.schedule?.paused ?? instance?.state?.schedule?.paused ?? false
    const finalVolume = instance?.getVolume?.()
    instance?.dispose?.()
    this.soundSources.value.splice(index, 1)
    // reassign indices so downstream consumers always see the current order
    for (let i = index; i < this.soundSources.value.length; i++) {
      this.soundSources.value[i].index = i
    }
    src.index = index
    payload.index = index

    // clean up scheduler watchers and any scheduled loops
    const schedId = src.state.schedule?.id
    const watchers = this.#scheduleWatchers.get(schedId)
    watchers?.forEach(unwatch => unwatch())
    this.#scheduleWatchers.delete(schedId)
    this.#scheduler.cancelSchedule(src)

    src.state.schedule.paused = currentlyPaused // preserve pause state for undo
    return {
      index,
      state: reactive(Object.assign({}, src.state)),
      audioPath: src.audioPath,
      name: src.name,
      libraryId: src.libraryId,
      bucket: src.bucket,
      path: src.path,
      plan_tier: src.plan_tier,
      base: src.base,
      storageKey: src.storageKey,
      fileId: src.fileId,
      volume: finalVolume
    }
  }

  connectToReverb(node) {
    // Ensure the convolver node exists then route the provided node through it
    this.getAudioContext()

    if (!this.#convolver || !node) return

    try {
      if (typeof node.connectReverb === 'function') {
        node.connectReverb(this.#convolver)
      } else if (typeof node.connect === 'function') {
        node.connect(this.#convolver)
      }
    } catch (err) {
      console.warn('Failed to connect node to convolver:', err)
    }
  }


  async loadImpulseResponse(irName, url) {
    // Ensure audio context and convolver are ready
    const audioContext = this.getAudioContext()

    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()

    // The engine might have been disposed while the fetch was in-flight.
    if (
      !this.#audioContext ||
      this.#audioContext.state === 'closed' ||
      this.#audioContext !== audioContext
    ) {
      return
    }

    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    this.#convolver.buffer = audioBuffer
    this.#currentIRName = irName

    // Reconnect all sources to ensure they use the new impulse
    this.soundSources.value.forEach(s => {
      if (s.instance?.connectReverb) {
        s.instance.connectReverb(this.#convolver)
      }
    })


  }

  playSoundSource(src) {
    if (!src || !src.instance) {
      console.warn("Tried to play sound source but it was not valid:", src)
      return
    }

    const schedId = src.instance.state.schedule.id
    if (this.#scheduler.pauseInfo.has(schedId) && this.#scheduler.pauseInfo.get(schedId).isPaused) {
      this.#scheduler.resumeSource(src.instance)
    } else {
      this.#scheduler.updateSchedule(src.instance)
    }
  }

  pauseSoundSource(src) {
    if (!src || !src.instance) {
      console.warn("Tried to pause sound source but it was not valid:", src)
      return
    }
    this.#scheduler.pauseSource(src.instance);
    src.instance.stop();
  }


  /**
   * Start playback of all sound sources and initialise scheduling.
   */
  playAll() {
    // Ensure the context is running then start every source. This also updates
    // the Media Session API so system controls display the correct state.
    if (this.#audioContext?.state === 'suspended') {
      this.#audioContext.resume()
    }
  
    this.soundSources.value.forEach(s => {
      this.playSoundSource(s) // play each source
    })
    if (this.#scheduler.roomStartTime === null) {
      this.#scheduler.start(); // initial start
    } else {
      this.#scheduler.resume(); // resume from pause
    }
  
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing'
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'SoundRoom',
        artist: 'Various',
        album: 'SoundRoom Noise',
        artwork: [
          {
            src: 'SoundRoom.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      })
    }
    
  }
  

  /**
   * Pause all active sound sources and suspend scheduling.
   */
  pauseAll() {
    // Stop playback on all active sources and update the Media Session state.
    this.soundSources.value.forEach(s => {
      this.pauseSoundSource(s) // pause each source
    })
    this.#scheduler.pause();
    
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused'
    }
    
  }

  /**
   * Tear down all audio nodes and close the context.
   */
  dispose() {
    // Tear down all nodes and close the audio context entirely.
    this.pauseAll()
    this.soundSources.value.forEach(s => s.instance.dispose())
    this.soundSources.value.length = 0
 
    if (this.#convolver) {
      try {
        this.#convolver.disconnect()
      } catch (err) {
        console.warn('Problem disconnecting convolver during dispose:', err)
      }
      // Clearing the buffer releases the underlying audio data reference.
      this.#convolver.buffer = null
      this.#convolver = null
    }

    if (this.#reverbGain) {
      try {
        this.#reverbGain.disconnect()
      } catch (err) {
        console.warn('Problem disconnecting reverb gain during dispose:', err)
      }
      this.#reverbGain = null
    }

    if (this.#masterGain) {
      this.#masterGain.disconnect()
      this.#masterGain = null
    }
 
    if (this.#audioContext) {
      this.#audioContext.close()
      this.#audioContext = null
    }

    this.#currentIRName = null
  }

  /**
   * Set the maximum number of sound sources allowed in the room.
   * @param {number} count
   */
  set maxSourceCount(count){
    this.#MAX_SOURCE_COUNT = count
  }
  /** @returns {number} */
  get maxSourceCount() {
    return this.#MAX_SOURCE_COUNT
  }

  /** @returns {boolean} */
  get maxSourceCountReached(){
    return this.soundSourceCount == this.maxSourceCount
  }

  /** @returns {number} */
  get soundSourceCount() {
    return this.soundSources.value.length
  }
  
  /**
   * Serialise the engine state so it can be saved.
   *
   * @returns {Object}
   */
  toJSON() {
    // Serialize the minimal state required to recreate the engine and all
    // currently loaded sources. This is used when saving a room layout.
    return {
      soundSources: this.soundSources.value.map(src => ({
        
        libraryId: src.libraryId,
        bucket: src.bucket,
        path: src.path,
        plan_tier: src.plan_tier,
        base: src.base,
        storageKey: src.storageKey,
        fileId: src.fileId,
        name: src.name,
        audioPath: src.audioPath,
        instance: {
          state:{
            x: src.instance.state.x,
            y: src.instance.state.y,
            angle: src.instance.state.angle,
            coneInner: src.instance.state.coneInner,
            coneOuter: src.instance.state.coneOuter,
            isPlaying: src.instance.playing,
            volume: src.instance?.getVolume?.() ?? 1,
            schedule: src.instance.state.schedule
          }
        },
        state: {
          angle: src.state.angle,
          coneInner: src.state.coneInner,
          coneOuter: src.state.coneOuter,
        },
        index: src.index,
      })),
      masterVolume: this.masterVolume.value,
      reverb: {
        preset: this.#currentIRName ?? null,
      }
    }
  }

  /**
   * Rehydrate an AudioEngine instance from JSON produced by {@link toJSON}.
   *
   * @param {Object} json
   * @returns {AudioEngine}
   */
  static fromJSON(json) {
    // Rehydrate an AudioEngine instance from data produced by `toJSON`.
    let engine = null;

    if (Array.isArray(json.soundSources)) {
     const uninitializedSoundSources = json.soundSources.map(src => {
          const base = src.base ?? src.plan_tier ?? 'users'
          const storageKey = src.storageKey ?? (src.bucket && src.path ? buildStorageKey(base, src.bucket, src.path) : null)
          const fileId = src.fileId ?? src.libraryId ?? storageKey

          return {
            index: src.index,
            src: {
              libraryId: src.libraryId,
              name: src.name,
              state: src.instance.state,
              audioPath: src.audioPath,
              bucket: src.bucket,
              path: src.path,
              plan_tier: src.plan_tier,
              base,
              storageKey,
              fileId,
            }
          }
        })
      engine = new AudioEngine(uninitializedSoundSources, json.masterVolume ?? 1)
      if (json.reverb?.preset) {
        const IR_PRESETS = {
          cathedral: '/impulses/1st_baptist_nashville_far_wide.wav',
          forest: '/impulses/forest.wav',
        }

        const presetName = json.reverb.preset
        const url = IR_PRESETS[presetName]
        if (url) {
          engine.getAudioContext() // ensure nodes exist
          setTimeout(() => {
            engine.loadImpulseResponse(presetName, url)
          }, 0)
        }

      }

      
    } else {
      throw new Error('Invalid JSON format for AudioEngine')
    }

    return engine
  }

}
