// src/composables/useKeyboardControls.js
import { createSoundSource } from '@/audio/createSoundSource'
export function useKeyboardControls({ 
  listener, 
  selectedIndex, 
  soundSources, 
  draw, 
  deleteSoundSource,
  undoDeleteSoundSource,
  updateListener,
  clamp, 
  room
}){
  const handleKeyDown = async (e) => {
    const speed = 5
    const rotationStep = 5
  
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
        listener.value.y = clamp(listener.value.y - speed, 0, room.height)
        break
      case 'ArrowDown':
      case 's':
        listener.value.y = clamp(listener.value.y + speed, 0, room.height)
        break
      case 'ArrowLeft':
      case 'a':
        listener.value.x = clamp(listener.value.x - speed, 0, room.width)
        break
      case 'ArrowRight':
      case 'd':
        listener.value.x = clamp(listener.value.x + speed, 0, room.width)
        break
      case 'q':
        listener.value.angle += rotationStep
        break
      case 'e':
        listener.value.angle -= rotationStep
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
        draw()
        break
      case 'Delete':
      case 'Backspace':
        deleteSoundSource()
        draw()
        break
      case 'u':
        undoDeleteSoundSource()
        draw()
        break
        
    }
  
    updateListener()
    draw()
  }

  return {
    handleKeyDown
  }
}