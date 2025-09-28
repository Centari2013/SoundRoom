import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import ActionManager from '@/lib/ActionManager'

/**
 * Store providing a single {@link ActionManager} instance and helpers for
 * undoable actions used across the application.
 */

export const useActionManagerStore = defineStore('actionManager', () => {
  const actionManager = ref(new ActionManager())

  const actionStackEmpty = computed(() => actionManager.value.actionStackEmpty)
  const redoStackEmpty = computed(() => actionManager.value.redoStackEmpty)
  const waiting = computed(() => actionManager.value.waiting.value) // True while an undoable action is running

  /**
   * Add a sound source to the library via the {@link ActionManager}.
   *
   * @param {Object} src - source metadata to register
   * @returns {Promise<void>}
   */
  async function addLibrarySoundSource(src) {
    await actionManager.value.doAction('add_draggable_sound_source', { src })
  }

  /**
   * Remove a sound source from the library via the {@link ActionManager}.
   *
   * @param {Object} src - source metadata to remove
   * @returns {Promise<void>}
   */
  async function deleteLibrarySoundSource(src) {
    await actionManager.value.doAction('delete_draggable_sound_source', { src })
  }

  /**
   * Reset the action manager's history and state.
   */
  function resetActionManager() {
    actionManager.value.clearHistory()
    actionManager.value = new ActionManager()
    
  }
  return {
    actionManager,
    actionStackEmpty,
    redoStackEmpty,
    resetActionManager,
    waiting,
    addLibrarySoundSource,
    deleteLibrarySoundSource
  }
})
