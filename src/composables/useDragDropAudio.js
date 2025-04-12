// useDragDropAudio.js
export function useDragDropAudio({ draggedSource, canvasRef, actionManager, draw }) {
  const handleDragStart = (e, source) => {
    draggedSource.value = source
  }

  const handleDrop = (e) => {
    if (!draggedSource.value) return

    const canvasBounds = canvasRef.value.getBoundingClientRect()
    const dropX = e.clientX - canvasBounds.left
    const dropY = e.clientY - canvasBounds.top
    const src = {
      x: dropX,
      y: dropY,
      angle: 0,
      audioPath: draggedSource.value.audioPath,
      coneInner: draggedSource.value.coneInner,
      coneOuter: draggedSource.value.coneOuter
    }
    actionManager.doAction("add_canvas_sound_source", { src })

    draw()
  }

  return { handleDragStart, handleDrop }
}
