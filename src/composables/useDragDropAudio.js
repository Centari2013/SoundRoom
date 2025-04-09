// useDragDropAudio.js
export function useDragDropAudio({ draggedSource, canvasRef, addSoundSource, draw }) {
  const handleDragStart = (e, source) => {
    draggedSource.value = source
  }

  const handleDrop = (e) => {
    if (!draggedSource.value) return

    const canvasBounds = canvasRef.value.getBoundingClientRect()
    const dropX = e.clientX - canvasBounds.left
    const dropY = e.clientY - canvasBounds.top

    addSoundSource({
      x: dropX,
      y: dropY,
      angle: 0,
      audioPath: draggedSource.value.audioPath,
      coneInner: 360,
      coneOuter: 360
    })

    draw()
  }

  return { handleDragStart, handleDrop }
}
