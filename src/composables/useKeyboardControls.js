// src/composables/useKeyboardControls.js
export function useKeyboardControls({ 
  listener, 
  selectedIndex, 
  soundSources, 
  draw,
  actionManager,
  room
}){

  const rotationKeys = new Set()
  let angleStart = null
  actionManager.registerActionHandlers(
    "rotate_listener_angle",
    (payload) => {
      listener.updateAngle(payload.to)
      draw()
    },
    (payload) => {
      listener.updateAngle(payload.from)
      draw()
    }
  )

  const handleKeyDown = async (e) => {
    const key = e.key
    const speed = 5
    const rotationStep = 5
    
    if ((key == 'q' || key == 'e') && !rotationKeys.has(key)) {
      rotationKeys.add(key)
      angleStart = listener.angle;
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
        //TODO: integrate action manager into angle changes
        listener.updateAngle(listener.angle - rotationStep)
        break
      case 'e':
        listener.updateAngle(listener.angle + rotationStep)
        break
      case 'z':
        if (selectedIndex.value !== null) {
          soundSources.value[selectedIndex.value].instance.state.angle -= rotationStep
          soundSources.value[selectedIndex.value].instance.updateAudio()
        }
        break
      case 'c':
        if (selectedIndex.value !== null) {
          soundSources.value[selectedIndex.value].instance.state.angle += rotationStep
          soundSources.value[selectedIndex.value].instance.updateAudio()
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
        actionManager.doAction("delete_canvas_sound_source", { index: selectedIndex.value, src: soundSources.value[selectedIndex.value] })
        break
      case 'u':
        actionManager.undoLastAction()
        break
      case 'r':
        actionManager.redoLastAction()
        break
        
    }
    draw()
  }

  const handleKeyUp = (event) => {
    const key = event.key.toLowerCase()
  
    if ((key === 'q' || key === 'e') && rotationKeys.has(key)) {
      rotationKeys.delete(key)
  
      const angleEnd = listener.angle
  
      if (angleStart !== null && angleStart !== angleEnd) {
        actionManager.doAction("rotate_listener_angle", {
          from: angleStart,
          to: angleEnd
        })
      }
  
      angleStart = null
    }
  }

  return {
    handleKeyDown,
    handleKeyUp
  }
}