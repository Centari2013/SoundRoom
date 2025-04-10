import { useSoundSource } from '@/composables/useSoundSource'
import { computed } from 'vue'

export function useAudioEngine({ soundSources, ctxRef}) {
  let audioContext = null
  const playingAudio = computed(() => { return soundSources.value.some((s)=> s.instance.playing)})

  const getAudioContext = () => {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    return audioContext
  }

  const setupAudioEngine = () => {
    for (const src of soundSources.value) {

      const instance = useSoundSource({
        audioContext: getAudioContext(),
        file: src.audioPath,
        position: [src.x, src.y, 0],
        angle: src.angle,
        coneInner: src.coneInner ?? 60,
        coneOuter: src.coneOuter ?? 180,
        volume: src.volume ?? 1,
        loop: true,
        ctx: ctxRef.value
      })

      src.instance = instance
    }
  }
  const addSoundSource = (payload) => {
    const src = payload.src
    src.index = payload.index ?? soundSources.value.length
     
    const instance = useSoundSource({
      audioContext: getAudioContext(),
      file: src.audioPath,
      position: [src.x, src.y, 0],
      angle: src.angle ?? 0,
      coneInner: src.coneInner ?? 60,
      coneOuter: src.coneOuter ?? 180,
      volume: src.instance?.volume ?? 1,
      loop: true,
      ctx: ctxRef.value
    })
  
    src.instance = instance
    soundSources.value.push(src)
    instance.play()
  }
  
  const deleteSoundSource = (payload) => {
    const index = payload.src.index
    const src = soundSources.value[index]
    const instance = src?.instance
  
    instance?.stop?.()
    instance?.dispose?.()
  
    soundSources.value.splice(index, 1)
  }
  

  const playAll = () => {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    soundSources.value.forEach(s => {
      s.instance.play()
    });
    
  }
  const pauseAll = () => {
    soundSources.value.forEach(s => {
      if (s.instance.playing){
        s.instance.stop()
      }
    });

  }

  return {
    setupAudioEngine,
    addSoundSource,
    deleteSoundSource,
    getAudioContext,
    playAll,
    pauseAll,
    playingAudio
  }
}