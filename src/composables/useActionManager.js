// src/composables/useActionManager.js

import { ref, computed } from 'vue'

export function useActionManager() {
  const actionMap = ref({})
  const actionStack = ref([])
  const actionStackEmpty = computed(() => actionStack.value.length === 0)

  const registerActionHandlers = (actionName, undoAction, doAction) => {
    actionMap.value[actionName] = { undoAction, doAction }
  }

  const doAction = (actionName) => {
    const action = actionMap.value[actionName]
    if (!action) {
      console.warn(`No registered action for "${actionName}"`)
      return
    }
    action.doAction()
    actionStack.value.push(actionName)
  }

  const undoLastAction = () => {
    if (actionStackEmpty.value) return

    const actionName = actionStack.value.pop()
    const action = actionMap.value[actionName]
    if (!action) {
      console.warn(`No undo handler for "${actionName}"`)
      return
    }
    action.undoAction()
  }

  return {
    actionStackEmpty,
    registerActionHandlers,
    doAction,
    undoLastAction
  }
}
