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
      x: dropX,
      y: dropY,
      angle: 0,
      audioPath: draggedSource.value.audioPath,
      coneInner: draggedSource.value.coneInner,
      coneOuter: draggedSource.value.coneOuter
    }
  
    actionManager.doAction("add_canvas_sound_source", { src })
  }
  

  return { handleDragStart, handleDrop }
}
