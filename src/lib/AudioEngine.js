// lib/AudioEngine.js
import SoundSource from '@/lib/SoundSource';
import { computed, ref, watch, reactive } from 'vue'

/**
 * High level wrapper around the Web Audio API that manages audio sources
 * and provides convenience methods for playing, pausing and serialising
 * the audio state.
 */

/**
 * Manages a collection of {@link SoundSource} instances and the underlying
 * Web Audio context.
 */
export default class AudioEngine {
  soundSources = ref([])
  #masterGain = null
  #audioContext = null
  masterVolume = ref(null)
  #MAX_SOURCE_COUNT = 30
  #uninitializedSoundSources = null

  /**
   * @param {Array<Object>} [uninitializedSoundSources] - Raw sound source data
   *   that will be instantiated when the engine is set up.
   * @param {number} [volume=1] - Initial master volume level.
   */
  constructor(uninitializedSoundSources, volume = 1 ) {
    this.#uninitializedSoundSources = uninitializedSoundSources || []
    this.soundSources.value = []  // reactive array of sources
    this.masterVolume.value = volume

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
   * Lazily creates and returns the {@link AudioContext} used by the engine.
   * Also sets up a master gain node connected to the destination.
   *
   * @returns {AudioContext}
   */
  getAudioContext() {
    if (!this.#audioContext) {
      this.#audioContext = new (window.AudioContext || window.webkitAudioContext)()

      // Create master gain when context is created
      this.#masterGain = this.#audioContext.createGain()
      this.#masterGain.gain.value = this.masterVolume.value // default volume
      this.#masterGain.connect(this.#audioContext.destination)
    }
    return this.#audioContext
  }

  /**
   * Finalizes initialization by creating {@link SoundSource} instances from any
   * preloaded data and wiring up MediaSession handlers when supported.
   */
  setupAudioEngine() {
    if (this.#uninitializedSoundSources.length > 0) { // add loaded sound sources
      this.#uninitializedSoundSources.forEach(src => {
        this.addSoundSource(src) // saved sound sources already in payload format
      })
    }

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
   * Adds a sound source to the engine and begins playback.
   *
   * @param {{src: Object, index?: number}} payload - Data describing the sound
   *   source to add.
   */
  addSoundSource(payload) {
    if (this.maxSourceCountReached){
      window.alert(`Limit of ${this.#MAX_SOURCE_COUNT} sound${this.#MAX_SOURCE_COUNT == 1 ? '' : 's'} in room reached.`); 
      return
    }
    const src = payload.src
    
    src.index = payload.index ?? this.soundSources.value.length // for proper undo and redo
    const instance = new SoundSource({
      audioContext: this.getAudioContext(),
      masterGain: this.#masterGain,
      file: src.audioPath,
      state: src.state,
      loop: true,
    })

    src.instance = instance
    this.soundSources.value.splice(src.index, 0, src)
    if (this.#audioContext?.state === 'suspended') {
      this.#audioContext.resume()
    }
    instance.play()
  }

  /**
   * Removes a sound source from the engine and cleans up associated audio
   * nodes.
   *
   * @param {{index: number, src: Object}} payload - Target source information.
   * @returns {Object} Serializable representation of the removed source.
   */
  deleteSoundSource(payload) {

    // crappy fix but it works! (stale state)
    const index = this.soundSources.value[payload.index] ? payload.index : payload.src.index
    const src = this.soundSources.value[index]
    const instance = src?.instance

    const finalVolume = instance?.getVolume()
    instance?.dispose()
    this.soundSources.value.splice(index, 1)

    if (!src) {
      console.warn("Tried to delete sound source but index", index, "was invalid.")
      return {}
    }

    return {
      state: reactive(Object.assign({}, src.state)),
      audioPath: src.audioPath,
      name: src.name,
      libraryId: src.libraryId,
      volume: finalVolume
    }
  }


  /**
   * Starts playback of all sound sources managed by the engine.
   * Resumes the audio context if it was suspended.
   */
  playAll() {
    if (this.#audioContext?.state === 'suspended') {
      this.#audioContext.resume()
    }
  
    this.soundSources.value.forEach(s => {
      s.instance?.play?.()
    })
  
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
  
    this.isPlaying.value = true
  }
  

  /**
   * Stops playback of all currently playing sound sources.
   */
  pauseAll() {
    this.soundSources.value.forEach(s => {
      if (s.instance?.playing) {
        s.instance.stop()
      }
    })
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused'
    }
    
  }

  /**
   * Stops all playback and disconnects any nodes so resources are released.
   */
  dispose() {
    this.pauseAll()
    this.soundSources.value.forEach(s => s.instance.dispose())
    this.soundSources.value.length = 0
  
    if (this.#masterGain) {
      this.#masterGain.disconnect()
      this.#masterGain = null
    }
  
    if (this.#audioContext) {
      this.#audioContext.close()
      this.#audioContext = null
    }
  }

  /** @param {number} count */
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
   * Serializes the current engine state so it can be stored.
   *
   * @returns {Object}
   */
  toJSON() {
    return {
      soundSources: this.soundSources.value.map(src => ({
        libraryId: src.libraryId,
        instance: {
          state:{
            x: src.instance.state.x,
            y: src.instance.state.y,
            angle: src.instance.state.angle,
            coneInner: src.instance.state.coneInner,
            coneOuter: src.instance.state.coneOuter,
            isPlaying: src.instance.playing,
            volume: src.instance?.getVolume?.() ?? 1,
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
    }
  }

  /**
   * Creates an AudioEngine instance from a serialized representation.
   *
   * @param {Object} json - Serialized data produced by {@link toJSON}.
   * @returns {AudioEngine}
   */
  static fromJSON(json) {
    let engine = null; 

    if (Array.isArray(json.soundSources)) {
      const uninitializedSoundSources = json.soundSources.map(src => ({
          index: src.index,
          src: {
            libraryId: src.libraryId,
            name: src.name,  
            state: src.instance.state,
            audioPath: src.audioPath, 
          }
        }))
      engine = new AudioEngine(uninitializedSoundSources, json.masterVolume ?? 1)
      
    } else {
      throw new Error('Invalid JSON format for AudioEngine')
    }

    return engine
  }

}
