// lib/AudioEngine.js
import SoundSource from '@/lib/SoundSource';
import { computed, ref, watch, reactive } from 'vue'

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

  getAudioContext() {
    // Lazily create the audio context and master gain node on first use.
    // Subsequent calls return the same context.
    if (!this.#audioContext) {
      this.#audioContext = new (window.AudioContext || window.webkitAudioContext)()

      // Create master gain when context is created
      this.#masterGain = this.#audioContext.createGain()
      this.#masterGain.gain.value = this.masterVolume.value // default volume
      this.#masterGain.connect(this.#audioContext.destination)
    }
    return this.#audioContext
  }

  setupAudioEngine() {
    // Recreate `SoundSource` instances from any previously saved data and
    // register media session handlers so hardware play/pause keys work.
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

  addSoundSource(payload) {
    // Create a new `SoundSource` instance from a library entry and place it
    // into the reactive `soundSources` array.
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

  deleteSoundSource(payload) {
    // Remove a `SoundSource` from the canvas and clean up its audio nodes.
    // The index logic is defensive to handle stale state from undo/redo.

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


  playAll() {
    // Ensure the context is running then start every source. This also updates
    // the Media Session API so system controls display the correct state.
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
  

  pauseAll() {
    // Stop playback on all active sources and update the Media Session state.
    this.soundSources.value.forEach(s => {
      if (s.instance?.playing) {
        s.instance.stop()
      }
    })
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused'
    }
    
  }

  dispose() {
    // Tear down all nodes and close the audio context entirely.
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

  set maxSourceCount(count){
    this.#MAX_SOURCE_COUNT = count
  }
  get maxSourceCount() {
    return this.#MAX_SOURCE_COUNT
  }

  get maxSourceCountReached(){
    return this.soundSourceCount == this.maxSourceCount
  }

  get soundSourceCount() {
    return this.soundSources.value.length
  }
  
  toJSON() {
    // Serialize the minimal state required to recreate the engine and all
    // currently loaded sources. This is used when saving a room layout.
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

  static fromJSON(json) {
    // Rehydrate an AudioEngine instance from data produced by `toJSON`.
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
