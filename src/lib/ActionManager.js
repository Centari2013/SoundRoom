// lib/ActionManager.js
import { ref, computed } from 'vue'

/**
 * Simple undo/redo stack used throughout the app.
 *
 * Actions are registered with a name and a pair of callbacks. `doAction`
 * executes the callback and stores the payload on a stack so that
 * `undoLastAction` and `redoLastAction` can replay or revert it later.
 * Only the most recent `#MAX_STACK` actions are kept in memory.
 */

export default class ActionManager {
  #MAX_STACK = 100

  constructor() {
    this._actionMap = {}
    this._actionStack = ref([])
    this._redoStack = ref([])
  
    this.actionStackEmpty = computed(() => this._actionStack.value.length === 0)
    this.redoStackEmpty = computed(() => this._redoStack.value.length === 0)
    
    this.waiting = ref(false)

    // bind methods so "this" is always correct
    this.doAction = this.doAction.bind(this)
    this.undoLastAction = this.undoLastAction.bind(this)
    this.redoLastAction = this.redoLastAction.bind(this)
  }
  

  registerActionHandlers(actionName, doAction, undoAction) {
    // Store callbacks for a named action. The object contains the
    // "do" and "undo" handlers which will later be invoked by
    // `doAction`, `undoLastAction` and `redoLastAction`.
    this._actionMap[actionName] = { doAction, undoAction }
  }

  unregisterActionHandlers(actionNames) {
    // Accept a single name or an array of names. Each registered
    // handler is simply removed from the map.
    if (!Array.isArray(actionNames)) actionNames = [actionNames]
    for (const name of actionNames) {
      delete this._actionMap[name]
    }
  }

  async doAction(actionName, payload = null) {
    this.waiting.value = true
    // Execute the "do" handler and push the payload onto the stack
    // so that it can be undone or redone later.
    const action = this._actionMap[actionName]
    if (!action) {
      console.warn(`No registered action for "${actionName}"`)
      this.waiting.value = false
      return
    }

    await action.doAction?.(payload)
    this._actionStack.value.push({ name: actionName, payload })

    if (this._actionStack.value.length > this.#MAX_STACK) {
      this._actionStack.value.shift()
    }

    this._redoStack.value.length = 0
    this.waiting.value = false
  }

  async undoLastAction() {
    this.waiting.value = true
    // Pop the last action from the stack and call its "undo" handler.
    if (this.actionStackEmpty.value) {
      this.waiting.value = false
      return
    }

    const { name, payload } = this._actionStack.value.pop()
    const action = this._actionMap[name]

    if (!action) {
      console.warn(`No undo handler for "${name}"`)
      this.waiting.value = false
      return
    }

    await action.undoAction?.(payload)
    this._redoStack.value.push({ name, payload })

    if (this._redoStack.value.length > this.#MAX_STACK) {
      this._redoStack.value.shift()
    }
    this.waiting.value = false
  }

  async redoLastAction() {
    this.waiting.value = true
    // Reapply the last undone action.
    if (this.redoStackEmpty.value) {
      this.waiting.value = false
      return
    }

    const { name, payload } = this._redoStack.value.pop()
    const action = this._actionMap[name]

    if (!action) {
      console.warn(`No redo handler for "${name}"`)
      this.waiting.value = false
      return
    }

    await action.doAction?.(payload)
    this._actionStack.value.push({ name, payload })
    this.waiting.value = false
  }

  clearHistory() {
    // Completely reset both stacks. Useful when loading a new room
    // or discarding all previous actions.
    this._actionStack.value = []
    this._redoStack.value = []
  }

  // Optional: expose history for UI/debugging
  /* get actionHistory() {
    return this._actionStack.value
  }

  get redoHistory() {
    return this._redoStack.value
  } */
}
