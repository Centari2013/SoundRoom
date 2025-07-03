import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import ActionManager from '@/lib/ActionManager'

export const useActionManagerStore = defineStore('actionManager', () => {
  const actionManager = ref(new ActionManager())

  const actionStackEmpty = computed(() => actionManager.value.actionStackEmpty)
  const redoStackEmpty = computed(() => actionManager.value.redoStackEmpty)
  const waiting = computed(() => actionManager.value.waiting) // Indicates if an action is currently being processed

  async function addLibrarySoundSource(src) {
    await actionManager.value.doAction('add_draggable_sound_source', { src })
  }

  async function deleteLibrarySoundSource(src) {
    await actionManager.value.doAction('delete_draggable_sound_source', { src })
  }

  return {
    actionManager,
    actionStackEmpty,
    redoStackEmpty,
    waiting,
    addLibrarySoundSource,
    deleteLibrarySoundSource
  }
})
