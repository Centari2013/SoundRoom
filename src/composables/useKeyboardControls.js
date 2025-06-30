import { useRoomStore } from "@/stores/useRoomStore"
import { storeToRefs } from "pinia"

export function useKeyboardControls(){
  const store = useRoomStore()
  const { room, listener, actionManager, audioEngine } = storeToRefs(store)
  const rotationKeys = new Set()
  let listenerAngleStart = null
  let sourceAngleStart = null
  

  actionManager.value.registerActionHandlers(
    "move_listener",
    (payload) => {
      listener.value.x = payload.to.x
      listener.value.y = payload.to.y
    },
    (payload) => {
      listener.value.x = payload.from.x
      listener.value.y = payload.from.y
    }
  )

  actionManager.value.registerActionHandlers(
    "rotate_listener_angle",
    (payload) => {
      listener.value.updateAngle(payload.to)
      listener.value.updateAudio()
    },
    (payload) => {
      listener.value.updateAngle(payload.from)
      listener.value.updateAudio()
    }
  )

  actionManager.value.registerActionHandlers(
    "rotate_source_angle",
    (payload) => {
      if (selectedSource.value !== null) {
        selectedSource.value.instance.state.angle = payload.to
        selectedSource.value.instance.updateAudio()
        listener.value.updateAudio()
      }
    },
    (payload) => {
      if (selectedSource.value !== null) {
        selectedSource.value.instance.state.angle = payload.from
        selectedSource.value.instance.updateAudio()
        listener.value.updateAudio()
      }
    }
  )

  const onKeyDown = async (e) => {
    const key = e.key
    const speed = 5
    const rotationStep = 5
    
    if ((key == 'q' || key == 'e') && !rotationKeys.has(key)) {
      rotationKeys.add(key)
      listenerAngleStart = listener.value.angle;
    }

    if ((key == 'z' || key == 'c') && !rotationKeys.has(key)) {
      rotationKeys.add(key)
      sourceAngleStart = selectedSource.value.instance.state.angle;
    }
  
    switch (key) {
      case 'ArrowUp':
      case 'w':
        listener.value.y = room.value.clamp(listener.value.y - speed, 0, room.value.height)
        break
      case 'ArrowDown':
      case 's':
        listener.value.y = room.value.clamp(listener.value.y + speed, 0, room.value.height)
        break
      case 'ArrowLeft':
      case 'a':
        listener.value.x = room.value.clamp(listener.value.x - speed, 0, room.value.width)
        break
      case 'ArrowRight':
      case 'd':
        listener.value.x = room.value.clamp(listener.value.x + speed, 0, room.value.width)
        break
      case 'q':
        listener.value.updateAngle(listener.value.angle - rotationStep)
        break
      case 'e':
        listener.value.updateAngle(listener.value.angle + rotationStep)
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
        if (audioEngine.value.soundSources.value.length === 0) break
        if (selectedIndex.value === null) {
          selectedIndex.value = 0
        } else {
          selectedIndex.value = (selectedIndex.value + 1) % audioEngine.value.soundSources.value.length
        }
        
        break
      case 'Delete':
      case 'Backspace':
        actionManager.value.doAction("delete_canvas_sound_source", { index: selectedSource.value.index, src: selectedSource.value })
        break
      case 'u':
        actionManager.value.undoLastAction()
        break
      case 'r':
        actionManager.value.redoLastAction()
        break
      
    }

    listener.value.updateAudio()
  }

  const onKeyUp = (event) => {
    const key = event.key.toLowerCase()
  
    if ((key === 'q' || key === 'e') && rotationKeys.has(key)) {
      rotationKeys.delete(key)
      const listenerAngleEnd = listener.value.angle
  
      if (listenerAngleStart !== null && listenerAngleStart !== listenerAngleEnd) {
        actionManager.value.doAction("rotate_listener_angle", {
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
          actionManager.value.doAction("rotate_source_angle", {
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