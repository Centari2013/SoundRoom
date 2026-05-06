import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

/**
 * Store containing references to the Konva stage and helpers for canvas
 * operations like thumbnail generation.
 */

export const useCanvasStore = defineStore('canvas', () => {
  const stageDivRef = ref(null)
  const vStageRef = ref(null)
  const contextMenuRef = ref({ show: () => {} }) // default noop to avoid runtime errors
  const renderedSoundSourceCount = ref(0)

  /**
   * Save a reference to the outer div that hosts the canvas.
   *
   * @param {HTMLElement} stageInstance - DOM element containing the stage
   */
  function setStageDivRef(stageInstance) {
    stageDivRef.value = stageInstance
  }

  /**
   * Save a reference to the context menu component so it can be shown safely.
   *
   * @param {Object|null} menuInstance - context menu component instance
   */
  function setContextMenuRef(menuInstance) {
    contextMenuRef.value = menuInstance || { show: () => {} }
  }

  /**
   * Save a reference to the VueKonva stage component.
   *
   * @param {Object} stageInstance - Konva stage wrapper
   */
  function setVStageRef(stageInstance) {
    vStageRef.value = stageInstance
  }

  function setRenderedSoundSourceCount(count) {
    renderedSoundSourceCount.value = Number.isFinite(count) ? Math.max(0, count) : 0
  }

  function resetRenderedSoundSourceCount() {
    renderedSoundSourceCount.value = 0
  }

  function waitForRenderedSoundSources(expectedCount, { timeoutMs = null } = {}) {
    const target = Number.isFinite(expectedCount) ? Math.max(0, expectedCount) : 0
    if (target === 0) return Promise.resolve(true)

    const isReady = () =>
      Boolean(stageDivRef.value && vStageRef.value) &&
      renderedSoundSourceCount.value >= target

    if (isReady()) return waitForCanvasPaint().then(() => true)

    return new Promise(resolve => {
      let settled = false
      let timeoutId = null
      let stop = null

      const finish = async (ready) => {
        if (settled) return
        settled = true
        if (timeoutId !== null) {
          clearTimeout(timeoutId)
        }
        stop?.()
        if (ready) {
          await waitForCanvasPaint()
        }
        resolve(ready)
      }

      stop = watch(
        [stageDivRef, vStageRef, renderedSoundSourceCount],
        () => {
          if (isReady()) {
            finish(true)
          }
        },
        { immediate: true }
      )

      if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
        timeoutId = setTimeout(() => finish(false), timeoutMs)
      }
    })
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
    contextMenuRef,
    setStageDivRef,
    setContextMenuRef,
    vStageRef,
    setVStageRef,
    renderedSoundSourceCount,
    setRenderedSoundSourceCount,
    resetRenderedSoundSourceCount,
    waitForRenderedSoundSources,
    getThumbnailURI
  }
})

function waitForCanvasPaint() {
  return new Promise(resolve => {
    const schedule = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (cb) => setTimeout(cb, 0)

    schedule(() => {
      schedule(() => resolve())
    })
  })
}
