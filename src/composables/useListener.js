// composables/useListener.js
import { ref } from 'vue'

export const listener = ref({ x: 300, y: 200, angle: 90 })

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

  const draw = (ctx) => {
    ctx.value.beginPath()
    ctx.value.arc(listener.value.x, listener.value.y, 10, 0, Math.PI * 2)
    ctx.value.fillStyle = '#00f'
    ctx.value.fill()

    const angleRad = (listener.value.angle * Math.PI) / 180
    const dx = Math.cos(angleRad) * 20
    const dy = Math.sin(angleRad) * 20
    ctx.value.beginPath()
    ctx.value.moveTo(listener.value.x, listener.value.y)
    ctx.value.lineTo(listener.value.x - dx, listener.value.y - dy)
    ctx.value.strokeStyle = '#fff'
    ctx.value.stroke()

    updateListener()
  }

  return {
    draw,
    listener,
    setAudioContext
  }
}
