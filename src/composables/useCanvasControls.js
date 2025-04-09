// src/composables/useCanvasControls.js

export function useCanvasControls({ canvas, soundSources, selectedIndex, draw, listener, doAction }) {
  // --- Internal state ---
  let draggingListener = false
  let draggingSourceIndex = null
  let offsetX = 0
  let offsetY = 0
  let moveSourcePayload = null
  let moveListenerPayload = null

  const getMousePos = (e) => {
    const rect = canvas.value.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const trySelectSoundSource = (mouseX, mouseY) => {
    for (let i = soundSources.value.length - 1; i >= 0; i--) {
      const src = soundSources.value[i]
      if (!src.instance) continue

      const sx = src.instance.state.x
      const sy = src.instance.state.y
      const dx = mouseX - sx
      const dy = mouseY - sy

      if (Math.sqrt(dx * dx + dy * dy) <= 20) {
        selectedIndex.value = i
        offsetX = dx
        offsetY = dy
        draggingSourceIndex = i
        moveSourcePayload = {
          index: i,
          from: { x: sx, y: sy }
        }
        return true
      }
    }

    return false
  }

  const trySelectListener = (mouseX, mouseY) => {
    const dx = mouseX - listener.value.x
    const dy = mouseY - listener.value.y
    if (Math.sqrt(dx * dx + dy * dy) <= 20) {
      offsetX = dx
      offsetY = dy
      draggingListener = true
      moveListenerPayload = {
       from: {
          x: listener.value.x,
          y: listener.value.y
        }
      }
      return true
    }
    return false
  }

  const onMouseDown = (e) => {
    const { x, y } = getMousePos(e)

    const hitSource = trySelectSoundSource(x, y)
    const hitListener = trySelectListener(x, y)

    if (!hitSource && !hitListener) selectedIndex.value = null

    draw()
  }

  const onMouseMove = (e) => {
    const { x, y } = getMousePos(e)

    if (draggingListener) {
      listener.value.x = x - offsetX
      listener.value.y = y - offsetY
      draw()
    }

    if (draggingSourceIndex !== null) {
      const src = soundSources.value[draggingSourceIndex]
      const state = src.instance.state
      state.x = x - offsetX
      state.y = y - offsetY
      src.instance.updateAudio()
      draw()
    }
  }

  const onMouseUpOrLeave = () => {
    draggingSourceIndex = null
    draggingListener = false

    if (moveSourcePayload) {
      const src = soundSources.value[moveSourcePayload.index]
      moveSourcePayload.to = {
        x: src.instance.state.x,
        y: src.instance.state.y
      }
      doAction("move_canvas_sound_source", moveSourcePayload)
      moveSourcePayload = null
    }

    if (moveListenerPayload){
      moveListenerPayload.to = {
        x: listener.value.x,
        y: listener.value.y
      }
      doAction("move_listener", moveListenerPayload)
      moveListenerPayload = null
    }
  }

  const setupMouseListeners = () => {
    const el = canvas.value
    el.addEventListener("mousedown", onMouseDown)
    el.addEventListener("mousemove", onMouseMove)
    el.addEventListener("mouseup", onMouseUpOrLeave)
    el.addEventListener("mouseleave", onMouseUpOrLeave)
  }

  setupMouseListeners()
}
