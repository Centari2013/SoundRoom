// composables/useListener.js
import { reactive } from 'vue'

export function createListenerTools() {
  let _angle = 90 // private-ish var

  const listener = reactive({
    x: 300,
    y: 200,

    get angle() {
      return _angle
    },

    updateAngle(newAngle) {
      _angle = newAngle
      updateListener()
    }
  })

  Object.defineProperty(listener, 'angle', {
    configurable: false,
    enumerable: true,
    get() {
      return _angle
    },
    set() {
      console.warn('Don’t touch angle directly. Use updateAngle().')
    }
  })

  let audioContextRef = null

  const setAudioContext = (ctx) => {
    audioContextRef = ctx
  }

  const updateListener = () => {
    if (!audioContextRef) return
    const scale = 0.01
    const angleRad = (_angle * Math.PI) / 180

    audioContextRef.listener.setPosition(
      listener.x * scale,
      listener.y * scale,
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
    ctx.value.arc(listener.x, listener.y, 10, 0, Math.PI * 2)
    ctx.value.fillStyle = '#00f'
    ctx.value.fill()

    const angleRad = (_angle * Math.PI) / 180
    const dx = Math.cos(angleRad) * 20
    const dy = Math.sin(angleRad) * 20
    ctx.value.beginPath()
    ctx.value.moveTo(listener.x, listener.y)
    ctx.value.lineTo(listener.x - dx, listener.y - dy)
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
