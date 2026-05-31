import { reactive } from "vue"
import { useActionManagerStore } from "@/stores/useActionManagerStore";
import { useCanvasStore } from "@/stores/useCanvasStore";
import { useRoomStore } from "@/stores/useRoomStore";
import { registerSoundRoomActions } from "@/composables/useSoundRoomActions";
import { storeToRefs } from "pinia";
import { buildStorageKey } from "@/utils/downloadAudio";

// useDragDropAudio.js
/**
 * Setup drag and drop handlers for the sound room canvas.
 *
 * @param {{ draggedSource: import('vue').Ref<Object|null> }} param0 - reactive ref holding the currently dragged source
 * @returns {{ handleDragStart: Function, handleDrop: Function }} handlers for drag start and drop events
 */
export function useDragDropAudio({ draggedSource }) {
  const actionStore = useActionManagerStore()
  const { actionManager } = storeToRefs(actionStore)
  const { room } = storeToRefs(useRoomStore())

  // Ensure the SoundRoom action set is registered on the active ActionManager instance.
  registerSoundRoomActions()
  /**
   * Store the source that is being dragged.
   * @param {DragEvent} e - drag event
   * @param {Object} source - the source being dragged
   */
  const handleDragStart = (e, source) => {
    draggedSource.value = source
  }

  /**
   * Drop handler for the canvas. Converts the drop coordinates into a new
   * sound source and registers the action with the action manager.
   *
   * @param {DragEvent} e - drop event
   */
  function handleDrop(e) {
    if (!draggedSource.value) return
    const canvasStore = useCanvasStore()
    const stageBounds = canvasStore.stageDivRef.getBoundingClientRect()
    const dropX = e.clientX - stageBounds.left
    const dropY = e.clientY - stageBounds.top
  
    const base = draggedSource.value?.base ?? draggedSource.value?.plan_tier ?? 'users'
    const storageKey = draggedSource.value?.bucket && draggedSource.value?.path
      ? buildStorageKey(base, draggedSource.value.bucket, draggedSource.value.path)
      : null

    const src = {
      state: reactive({
        x: dropX,
        y: dropY,
        angle: 0,
        coneInner: draggedSource.value.coneInner ?? 60,
        coneOuter: draggedSource.value.coneOuter ?? 180,
        surround: false
      }),
      audioPath: draggedSource.value.audioPath,
      name: draggedSource.value.name,
      libraryId: draggedSource.value.libraryId,
      bucket: draggedSource.value.bucket,
      path: draggedSource.value.path,
      base,
      plan_tier: draggedSource.value.plan_tier,
      storageKey,
      fileId: draggedSource.value.libraryId ?? storageKey ?? draggedSource.value.audioPath ?? null
    }
  
    // Re-register handlers in case the ActionManager was reset while the view remained active.
    registerSoundRoomActions()

    actionManager.value.doAction("add_canvas_sound_source", { src: src, autoplay: true })
  }
  

  /**
   * Mobile tap-to-place: adds a source at the canvas center.
   * Used when HTML5 drag-and-drop is unavailable (iOS Safari).
   *
   * @param {Object} source - the library source to place
   */
  function handleTap(source) {
    if (!source || source.locked) return

    const base = source?.base ?? source?.plan_tier ?? 'users'
    const storageKey = source?.bucket && source?.path
      ? buildStorageKey(base, source.bucket, source.path)
      : null

    const src = {
      state: reactive({
        x: room.value.width / 2,
        y: room.value.height / 2,
        angle: 0,
        coneInner: source.coneInner ?? 60,
        coneOuter: source.coneOuter ?? 180,
        surround: false,
      }),
      audioPath: source.audioPath,
      name: source.name,
      libraryId: source.libraryId,
      bucket: source.bucket,
      path: source.path,
      base,
      plan_tier: source.plan_tier,
      storageKey,
      fileId: source.libraryId ?? storageKey ?? source.audioPath ?? null,
    }

    registerSoundRoomActions()
    actionManager.value.doAction("add_canvas_sound_source", { src, autoplay: true })
  }

  return { handleDragStart, handleDrop, handleTap }
}
