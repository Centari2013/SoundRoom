import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCanvasStore = defineStore('canvas', () => {
  const stageDivRef = ref(null)
  const vStageRef = ref(null)

  function setStageDivRef(stageInstance) {
    stageDivRef.value = stageInstance
  }
  function setVStageRef(stageInstance) {
    vStageRef.value = stageInstance
  }

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
    vStageRef,
    setVStageRef,
    getThumbnailURI
  }
})
