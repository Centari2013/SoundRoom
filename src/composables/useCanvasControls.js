// src/composables/useCanvasControls.js

export function useCanvasControls({ canvas, soundSources, selectedIndex, draw }) {
  let draggingIndex = null
  let offsetX = 0
  let offsetY = 0

  const setupMouseListeners = () => {
    const canvasEl = canvas.value

    canvasEl.addEventListener('mousedown', (e) => {
      const rect = canvasEl.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      for (let i = 0; i < soundSources.value.length; i++) {
        const src = soundSources.value[i]
        if (!src.instance) continue

        const sx = src.instance.state.x
        const sy = src.instance.state.y
        const dx = mouseX - sx
        const dy = mouseY - sy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 10) {
          draggingIndex = i
          selectedIndex.value = i
          offsetX = dx
          offsetY = dy
          break
        }
      }
    })

    canvasEl.addEventListener('mousemove', (e) => {
      if (draggingIndex === null) return

      const rect = canvasEl.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const src = soundSources.value[draggingIndex]
      const state = src.instance.state
      state.x = mouseX - offsetX
      state.y = mouseY - offsetY
      src.instance.updateAudio()

      draw()
    })

    canvasEl.addEventListener('mouseup', () => {
      draggingIndex = null
    })

    canvasEl.addEventListener('mouseleave', () => {
      draggingIndex = null
    })
  }

  setupMouseListeners()
} 
