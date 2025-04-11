// src/composables/useKeyboardControls.js
export function useKeyboardControls({ 
  listener, 
  selectedIndex, 
  soundSources, 
  draw,
  doAction,
  undoLastAction,
  redoLastAction, 
  room
}){
  const handleKeyDown = async (e) => {
    const speed = 5
    const rotationStep = 5
  
    switch (e.key) {
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
        doAction("delete_canvas_sound_source", { index: selectedIndex.value, src: soundSources.value[selectedIndex.value] })
        break
      case 'u':
        undoLastAction()
        break
      case 'r':
        redoLastAction()
        break
        
    }
    draw()
  }

  return {
    handleKeyDown
  }
}