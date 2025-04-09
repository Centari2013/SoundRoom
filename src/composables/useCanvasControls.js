// src/composables/useCanvasControls.js

export function useCanvasControls({ canvas, soundSources, selectedIndex, draw, listener, doAction }) {
  let draggingListener = false
  let draggingIndex = null
  let offsetX = 0
  let offsetY = 0

  let movePayload = null

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
    
        if (dist <= 20) { // sound source found
          movePayload = {
            index: i,
            from: { x: sx, y: sy } // original position
          }
          
          selectedIndex.value = i
          offsetX = dx
          offsetY = dy
          draggingIndex = i // ← still enable drag
          found = true
          break
        }
      }

      // Check listener
      const lx = listener.value.x
      const ly = listener.value.y
      const dx = mouseX - lx
      const dy = mouseY - ly
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist <= 20) {
        draggingListener = true
        offsetX = dx
        offsetY = dy
        found = true
      }

    
      // If nothing hit, deselect
      if (!found) {
        selectedIndex.value = null
      }
    
      draw() // reflect updated selection visually
    })
    

    canvasEl.addEventListener('mousemove', (e) => {
      if (draggingListener) {
        const rect = canvasEl.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
      
        listener.value.x = mouseX - offsetX
        listener.value.y = mouseY - offsetY
        draw()
      }
      
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
      draggingListener = false

      if (movePayload) {
        const src = soundSources.value[movePayload.index]
        movePayload.to = {
          x: src.instance.state.x,
          y: src.instance.state.y
        }
        doAction("move_canvas_sound_source", movePayload)
        movePayload = null
      }
      

    })

    canvasEl.addEventListener('mouseleave', () => {
      draggingIndex = null
      draggingListener = false
      
    })
  }

  setupMouseListeners()
} 
