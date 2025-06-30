import { reactive } from "vue"
import { useRoomStore } from "@/stores/useRoomStore";
import { storeToRefs } from "pinia";  

// useDragDropAudio.js
export function useDragDropAudio({ draggedSource, stageWrapper}) {
  const roomStore = useRoomStore()
  const { actionManager } = storeToRefs(roomStore)
  const handleDragStart = (e, source) => {
    draggedSource.value = source
  }

  function handleDrop(e) {
    if (!draggedSource.value) return
    const wrapperBounds = stageWrapper.value.stageRef.getBoundingClientRect()
    const dropX = e.clientX - wrapperBounds.left
    const dropY = e.clientY - wrapperBounds.top
  
    const src = {
      state: reactive({
        x: dropX,
        y: dropY,
        angle: 0,
        coneInner: draggedSource.value.coneInner ?? 60,
        coneOuter: draggedSource.value.coneOuter ?? 180
      }),
      audioPath: draggedSource.value.audioPath,
      name: draggedSource.value.name,
      libraryId: draggedSource.value.libraryId
    }
  
    actionManager.value.doAction("add_canvas_sound_source", { src: src })
  }
  

  return { handleDragStart, handleDrop }
}
