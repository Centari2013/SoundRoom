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
    
      let found = false
    
      // Loop top-down for overlap priority
      for (let i = soundSources.value.length - 1; i >= 0; i--) {
        const src = soundSources.value[i]
        if (!src.instance) continue
    
        const sx = src.instance.state.x
        const sy = src.instance.state.y
        const dx = mouseX - sx
        const dy = mouseY - sy
        const dist = Math.sqrt(dx * dx + dy * dy)
    
        if (dist <= 20) {
          selectedIndex.value = i
          offsetX = dx
          offsetY = dy
          draggingIndex = i // ← still enable drag
          found = true
          break
        }
      }
    
      // If nothing hit, deselect
      if (!found) {
        selectedIndex.value = null
      }
    
      draw() // reflect updated selection visually
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
