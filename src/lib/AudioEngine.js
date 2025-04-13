// lib/AudioEngine.js
import SoundSource from '@/lib/SoundSource';
import { computed, ref, watch } from 'vue'

export default class AudioEngine {
  soundSources = ref([])
  #masterGain = null
  #ctxRef = null
  #audioContext = null
  masterVolume = ref(null)

  constructor( soundSources, ctxRef, volume = 1 ) {
    this.soundSources.value = soundSources  // reactive array of sources
    this.#ctxRef = ctxRef                 // reactive canvas or drawing context
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
    for (const src of this.soundSources.value) {
      const instance = new SoundSource({
        audioContext: this.getAudioContext(),
        masterGain: this.#masterGain,
        file: src.audioPath,
        position: [src.x, src.y, 0],
        angle: src.angle,
        coneInner: src.coneInner ?? 60,
        coneOuter: src.coneOuter ?? 180,
        volume: src.instance?.getVolume?.() ?? 1,
        loop: true,
        canvasContext: this.#ctxRef?.value
      })

      src.instance = instance
    }
  }

  addSoundSource(payload) {
    const src = payload.src

    src.index = payload.index ?? this.soundSources.value.length

    const instance = new SoundSource({
      audioContext: this.getAudioContext(),
      masterGain: this.#masterGain,
      file: src.audioPath,
      position: [src.x, src.y, 0],
      angle: src.angle ?? 0,
      coneInner: src.coneInner ?? 60,
      coneOuter: src.coneOuter ?? 180,
      volume: src.instance?.getVolume?.() ?? 1,
      loop: true,
      canvasContext: this.#ctxRef?.value
    })

    src.instance = instance
    this.soundSources.value.push(src)

    if (this.#audioContext?.state === 'suspended') {
      this.#audioContext.resume()
    }
    instance.play()

  }

  deleteSoundSource(payload) {
    const index = payload.src.index
    const src = this.soundSources.value[index]
    const instance = src?.instance

    instance?.stop?.()
    instance?.dispose?.()

    this.soundSources.value.splice(index, 1)
  }

  playAll() {
    if (this.#audioContext?.state === 'suspended') {
      this.#audioContext.resume()
    }

    this.soundSources.value.forEach(s => {
      s.instance?.play?.()
    })
  }

  pauseAll() {
    this.soundSources.value.forEach(s => {
      if (s.instance?.playing) {
        s.instance.stop()
      }
    })
  }
}
