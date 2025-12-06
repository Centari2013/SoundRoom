import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Store containing references to the Konva stage and helpers for canvas
 * operations like thumbnail generation.
 */

export const useCanvasStore = defineStore('canvas', () => {
  const stageDivRef = ref(null)
  const vStageRef = ref(null)
  const contextMenuRef = ref(null)

  /**
   * Save a reference to the outer div that hosts the canvas.
   *
   * @param {HTMLElement} stageInstance - DOM element containing the stage
   */
  function setStageDivRef(stageInstance) {
    stageDivRef.value = stageInstance
  }

  /**
   * Save a reference to the context menu component so composables can trigger it.
   *
   * @param {Object} menuRef - Vue ref for the context menu component
   */
  function setContextMenuRef(menuRef) {
    contextMenuRef.value = menuRef
  }

  /**
   * Save a reference to the VueKonva stage component.
   *
   * @param {Object} stageInstance - Konva stage wrapper
   */
  function setVStageRef(stageInstance) {
    vStageRef.value = stageInstance
  }

  /**
   * Return a data URI thumbnail of the current stage.
   *
   * @param {{ pixelRatio?: number, mimeType?: string }} [opts]
   * @returns {string|null} data URI or `null` if unavailable
   */
  function getThumbnailURI({ pixelRatio = 1, mimeType = 'image/jpeg' } = {}) {
    const stage = vStageRef.value?.getNode?.()

    if (!stage) {
      console.warn('Konva stage not ready')
      return null
    }

    try {
      return stage.toDataURL({
        pixelRatio,
        mimeType,
      })
    } catch (err) {
      console.error('Failed to generate thumbnail:', err)
      return null
    }
  }

  return {
    stageDivRef,
    setStageDivRef,
    contextMenuRef,
    setContextMenuRef,
    vStageRef,
    setVStageRef,
    getThumbnailURI
  }
})
