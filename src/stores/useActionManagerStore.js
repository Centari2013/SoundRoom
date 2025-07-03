import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import ActionManager from '@/lib/ActionManager'

export const useActionManagerStore = defineStore('actionManager', () => {
  const actionManager = ref(new ActionManager())

  const actionStackEmpty = computed(() => actionManager.value.actionStackEmpty.value)
  const redoStackEmpty = computed(() => actionManager.value.redoStackEmpty.value)

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
    addLibrarySoundSource,
    deleteLibrarySoundSource
  }
})
