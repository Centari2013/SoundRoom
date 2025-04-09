import { createSoundSource } from '@/audio/createSoundSource'
import { ref } from 'vue'

export function useAudioEngine({ soundSources, ctxRef, selectedIndex, deletedSources }) {
  let audioContext = null
  const playingAudio = ref(false)

  const getAudioContext = () => {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    return audioContext
  }

  const setupAudioEngine = () => {
    for (const src of soundSources.value) {

      const instance = createSoundSource({
        audioContext: getAudioContext(),
        file: src.audioPath,
        position: [src.x, src.y, 0],
        angle: src.angle,
        coneInner: src.coneInner ?? 60,
        coneOuter: src.coneOuter ?? 180,
        loop: true,
        ctx: ctxRef.value
      })

      src.instance = instance
    }
  }
  const addSoundSource = (src) => {
    const instance = createSoundSource({
      audioContext: getAudioContext(),
      file: src.audioPath,
      position: [src.x, src.y, 0],
      angle: src.angle ?? 0,
      coneInner: src.coneInner ?? 60,
      coneOuter: src.coneOuter ?? 180,
      loop: true,
      ctx: ctxRef.value
    })
  
    src.instance = instance
    soundSources.value.push(src)
    instance.play()
  }
  

  const deleteSoundSource = () => {
    if (selectedIndex.value >= 0) {
      const src = soundSources.value[selectedIndex.value]
      const instance = src.instance

      instance?.stop?.()
      instance?.dispose?.()

      deletedSources.value.push(src)
      soundSources.value.splice(selectedIndex.value, 1)
      selectedIndex.value = Math.min(selectedIndex.value, soundSources.value.length - 1)
    }
  }

  const undoDeleteSoundSource = () => {
    if (deletedSources.value.length > 0) {
      const src = deletedSources.value.pop()
      soundSources.value.push(src)
  
      const instance = createSoundSource({
        audioContext: getAudioContext(),
        file: src.audioPath,
        position: [src.x, src.y, 0],
        angle: src.angle,
        coneInner: src.coneInner ?? 60,
        coneOuter: src.coneOuter ?? 180,
        loop: true,
        ctx: ctxRef.value
      })
      instance.play()
      src.instance = instance
      selectedIndex.value = soundSources.value.length - 1
      
    }
  }
  const playAll = () => {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    soundSources.value.forEach(s => {
      s.instance.play()
    });

    if (soundSources.value.length > 0){
      playingAudio.value = true
    }
    
  }
  const pauseAll = () => {
    soundSources.value.forEach(s => {
      if (s.instance.playing){
        s.instance.stop()
      }
    });
    playingAudio.value = false
  }

  return {
    setupAudioEngine,
    addSoundSource,
    deleteSoundSource,
    getAudioContext,
    undoDeleteSoundSource,
    playAll,
    pauseAll,
    playingAudio
  }
}