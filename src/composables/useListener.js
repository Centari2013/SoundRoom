// composables/useListener.js
import { ref } from 'vue'

export const listener = ref({ x: 300, y: 200, angle: 0 })

export function createListenerTools() {
  let audioContextRef = null

  const setAudioContext = (ctx) => {
    audioContextRef = ctx
  }

  const updateListener = () => {
    if (!audioContextRef) return
    const scale = 0.01
    const angleRad = (listener.value.angle * Math.PI) / 180

    audioContextRef.listener.setPosition(
      listener.value.x * scale,
      listener.value.y * scale,
      0
    )
    audioContextRef.listener.setOrientation(
      Math.cos(angleRad),
      Math.sin(angleRad),
      0,
      0,
      0,
      1
    )
  }

  return {
    listener,
    updateListener,
    setAudioContext
  }
}
