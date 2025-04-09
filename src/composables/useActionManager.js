import { ref, computed } from 'vue'

export function useActionManager() {
  const MAX_STACK = 100
  const actionMap = ref({})
  const actionStack = ref([]) // [{ name, payload }]
  const redoStack = ref([])   // [{ name, payload }]

  const actionStackEmpty = computed(() => actionStack.value.length === 0)
  const redoStackEmpty = computed(() => redoStack.value.length === 0)

  const registerActionHandlers = (actionName, doAction, undoAction) => {
    actionMap.value[actionName] = { undoAction, doAction }
  }

  const doAction = (actionName, payload = null) => {
    const action = actionMap.value[actionName]
    if (!action) {
      console.warn(`No registered action for "${actionName}"`)
      return
    }

    action.doAction?.(payload)
    actionStack.value.push({ name: actionName, payload })
    if (actionStack.value.length > MAX_STACK) {
      actionStack.value.shift() // remove oldest
    }
    redoStack.value.length = 0 // clear redo on new action
  }

  const undoLastAction = () => {
    if (actionStackEmpty.value) return
    const { name, payload } = actionStack.value.pop()
    const action = actionMap.value[name]
    if (!action) {
      console.warn(`No undo handler for "${name}"`)
      return
    }
    
    action.undoAction?.(payload)
    redoStack.value.push({ name, payload })
    if (redoStack.value.length > MAX_STACK) {
      redoStack.value.shift()
    }
  }

  const redoLastAction = () => {
    if (redoStackEmpty.value) return

    const { name, payload } = redoStack.value.pop()
    const action = actionMap.value[name]
    if (!action) {
      console.warn(`No redo handler for "${name}"`)
      return
    }

    action.doAction?.(payload)
    actionStack.value.push({ name, payload })
  }

  return {
    actionStackEmpty,
    redoStackEmpty,
    registerActionHandlers,
    doAction,
    undoLastAction,
    redoLastAction
  }
}
