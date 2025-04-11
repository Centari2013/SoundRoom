// lib/AudioEngine.js
import { useSoundSource } from '@/composables/useSoundSource'
import { computed, ref } from 'vue'

export default class AudioEngine {
  soundSources = ref([])

  constructor( soundSources, ctxRef ) {
    this.soundSources.value = soundSources  // reactive array of sources
    this._ctxRef = ctxRef                 // reactive canvas or drawing context
    this._audioContext = null

    // Computed: tracks if anything is playing
    this.isPlaying = computed(() =>
      this.soundSources.value.some(s => s.instance?.playing)
    )
  }

  getAudioContext() {
    if (!this._audioContext) {
      this._audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    return this._audioContext
  }

  setupAudioEngine() {
    for (const src of this.soundSources.value) {
      const instance = useSoundSource({
        audioContext: this.getAudioContext(),
        file: src.audioPath,
        position: [src.x, src.y, 0],
        angle: src.angle,
        coneInner: src.coneInner ?? 60,
        coneOuter: src.coneOuter ?? 180,
        volume: src.instance?.getVolume?.() ?? 1,
        loop: true,
        ctx: this._ctxRef?.value
      })

      src.instance = instance
    }
  }

  addSoundSource(payload) {
    const src = payload.src
    src.index = payload.index ?? this.soundSources.value.length

    const instance = useSoundSource({
      audioContext: this.getAudioContext(),
      file: src.audioPath,
      position: [src.x, src.y, 0],
      angle: src.angle ?? 0,
      coneInner: src.coneInner ?? 60,
      coneOuter: src.coneOuter ?? 180,
      volume: src.instance?.getVolume?.() ?? 1,
      loop: true,
      ctx: this._ctxRef?.value
    })

    src.instance = instance
    this.soundSources.value.push(src)
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
    if (this._audioContext?.state === 'suspended') {
      this._audioContext.resume()
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
