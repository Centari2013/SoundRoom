// src/composables/useCanvasControls.js

export function useCanvasControls({ canvas, soundSources, selectedIndex, draw, listener, actionManager, contextMenu }) {
  // --- Internal state ---
  let draggingListener = false
  let draggingSourceIndex = null
  let offsetX = 0
  let offsetY = 0
  let moveSourcePayload = null
  let moveListenerPayload = null
  const positionsEqual = (a, b) => a.x === b.x && a.y === b.y
  let hoveringRotationHandleIndex = null
  let draggingRotationHandleIndex = null


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
    const dx = mouseX - listener.x
    const dy = mouseY - listener.y
    if (Math.sqrt(dx * dx + dy * dy) <= 20) {
      offsetX = dx
      offsetY = dy
      draggingListener = true
      moveListenerPayload = {
       from: {
          x: listener.x,
          y: listener.y
        }
      }
      return true
    }
    return false
  }

  const onMouseDown = (e) => {
    if (e.button === 2) return // ignore right-click
    const { x, y } = getMousePos(e)
    if (hoveringRotationHandleIndex !== null) {
      draggingRotationHandleIndex = hoveringRotationHandleIndex
      return
    }
    // prioritize sound sources first
    if (trySelectSoundSource(x, y)) {
      draw()
      return
    }
  
    // only check listener if no source was selected
    if (trySelectListener(x, y)) {
      draw()
      return
    }
  
    // If nothing was selected
    selectedIndex.value = null
    draw()
  }
  

  const onMouseMove = (e) => {
    const { x, y } = getMousePos(e)

    if (draggingListener) {
      listener.x = x - offsetX
      listener.y = y - offsetY
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

    const ROTATION_HANDLE_RADIUS = 8
    hoveringRotationHandleIndex = null

    soundSources.value.forEach((src, i) => {
      if (!src.instance) return
      const { x: rotationX, y: rotationY } = src.instance.getRotationHandlePos()
      const dx = rotationX - x
      const dy = rotationY - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < ROTATION_HANDLE_RADIUS) {
        hoveringRotationHandleIndex = i
      }
    })

    if (draggingRotationHandleIndex !== null) {
      const src = soundSources.value[draggingRotationHandleIndex]
      const center = { x: src.instance.state.x, y: src.instance.state.y }
      const dx = x - center.x
      const dy = y - center.y
      const angle = Math.atan2(dy, dx) * (180 / Math.PI)
      src.instance.state.angle = angle
      src.instance.updateAudio()
      draw()
    }
  }

  const onMouseUpOrLeave = () => {
    draggingSourceIndex = null
    draggingListener = false
  
    if (moveSourcePayload) {
      const src = soundSources.value[moveSourcePayload.index]
      const to = {
        x: src.instance.state.x,
        y: src.instance.state.y
      }
  
      if (!positionsEqual(moveSourcePayload.from, to)) {
        moveSourcePayload.to = to
        actionManager.doAction("move_canvas_sound_source", moveSourcePayload)
      }
  
      moveSourcePayload = null
    }
  
    if (moveListenerPayload) {
      const to = {
        x: listener.x,
        y: listener.y
      }
  
      if (!positionsEqual(moveListenerPayload.from, to)) {
        moveListenerPayload.to = to
        actionManager.doAction("move_listener", moveListenerPayload)
      }
  
      moveListenerPayload = null
    }
    draggingRotationHandleIndex = null
  }
  
  const showContextMenu = (e) => {
    e.preventDefault()
    const { x, y } = getMousePos(e)
    const target = trySelectSoundSource(x, y)
  
    if (!target) return;

    contextMenu.value.show({ x: e.clientX, y: e.clientY })
    
  }

  const setupMouseListeners = () => {
    const el = canvas.value
    el.addEventListener("mousedown", onMouseDown)
    el.addEventListener("mousemove", onMouseMove)
    el.addEventListener("mouseup", onMouseUpOrLeave)
    el.addEventListener("mouseleave", onMouseUpOrLeave)
    el.addEventListener('contextmenu', showContextMenu)
  }

  setupMouseListeners()
}
