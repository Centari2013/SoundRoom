import { reactive } from "vue"

// useDragDropAudio.js
export function useDragDropAudio({ draggedSource, actionManager, stageWrapper}) {
  const handleDragStart = (e, source) => {
    draggedSource.value = source
  }

  function handleDrop(e) {
    if (!draggedSource.value) return
  
    const wrapperBounds = stageWrapper.value.getBoundingClientRect()
    const dropX = e.clientX - wrapperBounds.left
    const dropY = e.clientY - wrapperBounds.top
  
    const src = {
      state: reactive({
        x: dropX,
        y: dropY,
        angle: 0,
        coneInner: draggedSource.value.coneInner,
        coneOuter: draggedSource.value.coneOuter
      }),
      audioPath: draggedSource.value.audioPath,
    }
  
    actionManager.doAction("add_canvas_sound_source", { src: src })
  }
  

  return { handleDragStart, handleDrop }
}
