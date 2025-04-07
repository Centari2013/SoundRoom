import { createSoundSource } from '@/audio/createSoundSource'

export function useAudioEngine({ soundSources, ctxRef, selectedIndex, deletedSources }) {
  let audioContext = null

  const getAudioContext = () => audioContext

  const ensureAudioContext = () => {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    return audioContext
  }

  const setupAudioEngine = () => {
    for (const src of soundSources.value) {

      const instance = createSoundSource({
        audioContext: ensureAudioContext(),
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
    //console.log(soundSources)
  }
  const addSoundSource = () => {
    if (soundSources.value.length >= 30) {
      console.warn('Sound source limit reached (30 max).');
      return; // silently fail or show a toast if you want
    }
  }

  const deleteSoundSource = () => {
    if (selectedIndex.value !== null) {
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
        audioContext: ensureAudioContext(),
        file: src.audioPath,
        position: [src.x, src.y, 0],
        angle: src.angle,
        coneInner: src.coneInner ?? 60,
        coneOuter: src.coneOuter ?? 180,
        loop: true,
        ctx: ctxRef.value
      })
      
      src.instance = instance
  
      selectedIndex.value = soundSources.value.length - 1
      
    }
  }

  return {
    setupAudioEngine,
    deleteSoundSource,
    getAudioContext,
    undoDeleteSoundSource
  }
}