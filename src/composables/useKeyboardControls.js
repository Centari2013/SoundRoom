// src/composables/useKeyboardControls.js
export function useKeyboardControls({ 
  listener, 
  selectedIndex, 
  soundSources,
  selectedSource,
  actionManager,
  room
}){

  const rotationKeys = new Set()
  let listenerAngleStart = null
  let sourceAngleStart = null
  

  actionManager.registerActionHandlers(
    "move_listener",
    (payload) => {
      listener.x = payload.to.x
      listener.y = payload.to.y
    },
    (payload) => {
      listener.x = payload.from.x
      listener.y = payload.from.y
    }
  )

  actionManager.registerActionHandlers(
    "rotate_listener_angle",
    (payload) => {
      listener.updateAngle(payload.to)
      listener.updateAudio()
    },
    (payload) => {
      listener.updateAngle(payload.from)
      listener.updateAudio()
    }
  )

  actionManager.registerActionHandlers(
    "rotate_source_angle",
    (payload) => {
      if (selectedSource.value !== null) {
        selectedSource.value.instance.state.angle = payload.to
        selectedSource.value.instance.updateAudio()
        listener.updateAudio()
      }
    },
    (payload) => {
      if (selectedSource.value !== null) {
        selectedSource.value.instance.state.angle = payload.from
        selectedSource.value.instance.updateAudio()
        listener.updateAudio()
      }
    }
  )

  const onKeyDown = async (e) => {
    const key = e.key
    const speed = 5
    const rotationStep = 5
    
    if ((key == 'q' || key == 'e') && !rotationKeys.has(key)) {
      rotationKeys.add(key)
      listenerAngleStart = listener.angle;
    }

    if ((key == 'z' || key == 'c') && !rotationKeys.has(key)) {
      rotationKeys.add(key)
      sourceAngleStart = selectedSource.value.instance.state.angle;
    }
  
    switch (key) {
      case 'ArrowUp':
      case 'w':
        listener.y = room.clamp(listener.y - speed, 0, room.height)
        break
      case 'ArrowDown':
      case 's':
        listener.y = room.clamp(listener.y + speed, 0, room.height)
        break
      case 'ArrowLeft':
      case 'a':
        listener.x = room.clamp(listener.x - speed, 0, room.width)
        break
      case 'ArrowRight':
      case 'd':
        listener.x = room.clamp(listener.x + speed, 0, room.width)
        break
      case 'q':
        listener.updateAngle(listener.angle - rotationStep)
        break
      case 'e':
        listener.updateAngle(listener.angle + rotationStep)
        break
      case 'z':
        if (selectedSource.value !== null) {
          selectedSource.value.instance.state.angle -= rotationStep
          selectedSource.value.instance.updateAudio()
        }
        break
      case 'c':
        if (selectedSource.value !== null) {
          selectedSource.value.instance.state.angle += rotationStep
          selectedSource.value.instance.updateAudio()
        }
        break
      case 'Tab':
        e.preventDefault()
        if (soundSources.value.length === 0) break
        if (selectedIndex.value === null) {
          selectedIndex.value = 0
        } else {
          selectedIndex.value = (selectedIndex.value + 1) % soundSources.value.length
        }
        
        break
      case 'Delete':
      case 'Backspace':
        actionManager.doAction("delete_canvas_sound_source", { index: selectedSource.value.index, src: selectedSource.value })
        break
      case 'u':
        actionManager.undoLastAction()
        break
      case 'r':
        actionManager.redoLastAction()
        break
      
    }

    listener.updateAudio()
  }

  const onKeyUp = (event) => {
    const key = event.key.toLowerCase()
  
    if ((key === 'q' || key === 'e') && rotationKeys.has(key)) {
      rotationKeys.delete(key)
      const listenerAngleEnd = listener.angle
  
      if (listenerAngleStart !== null && listenerAngleStart !== listenerAngleEnd) {
        actionManager.doAction("rotate_listener_angle", {
          from: listenerAngleStart,
          to: listenerAngleEnd
        })
      }
  
      listenerAngleStart = null
    }
  
    if ((key === 'c' || key === 'z') && rotationKeys.has(key)) {
      rotationKeys.delete(key)
  
      if (selectedSource.value !== null) {
        const sourceAngleEnd = selectedSource.value.instance.state.angle
  
        if (sourceAngleStart !== null && sourceAngleStart !== sourceAngleEnd) {
          actionManager.doAction("rotate_source_angle", {
            from: sourceAngleStart,
            to: sourceAngleEnd
          })
        }
      }
  
      sourceAngleStart = null
    }
  }
  
  

  return {
    onKeyDown,
    onKeyUp
  }
}