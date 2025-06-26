// lib/ActionManager.js
import { ref, computed } from 'vue'

export default class ActionManager {
  #MAX_STACK = 100

  constructor() {
    this._actionMap = {}
    this._actionStack = ref([])
    this._redoStack = ref([])
  
    this.actionStackEmpty = computed(() => this._actionStack.value.length === 0)
    this.redoStackEmpty = computed(() => this._redoStack.value.length === 0)
  
    // bind methods so "this" is always correct
    this.doAction = this.doAction.bind(this)
    this.undoLastAction = this.undoLastAction.bind(this)
    this.redoLastAction = this.redoLastAction.bind(this)
  }
  

  registerActionHandlers(actionName, doAction, undoAction) {
    this._actionMap[actionName] = { doAction, undoAction }
  }

  async doAction(actionName, payload = null) {
    const action = this._actionMap[actionName]
    if (!action) {
      console.warn(`No registered action for "${actionName}"`)
      return
    }

    await action.doAction?.(payload)
    this._actionStack.value.push({ name: actionName, payload })

    if (this._actionStack.value.length > this.#MAX_STACK) {
      this._actionStack.value.shift()
    }

    this._redoStack.value.length = 0
  }

  async undoLastAction() {
    if (this.actionStackEmpty.value) return

    const { name, payload } = this._actionStack.value.pop()
    const action = this._actionMap[name]

    if (!action) {
      console.warn(`No undo handler for "${name}"`)
      return
    }

    await action.undoAction?.(payload)
    this._redoStack.value.push({ name, payload })

    if (this._redoStack.value.length > this.#MAX_STACK) {
      this._redoStack.value.shift()
    }
  }

  async redoLastAction() {
    if (this.redoStackEmpty.value) return

    const { name, payload } = this._redoStack.value.pop()
    const action = this._actionMap[name]

    if (!action) {
      console.warn(`No redo handler for "${name}"`)
      return
    }

    await action.doAction?.(payload)
    this._actionStack.value.push({ name, payload })
  }

  // Optional: expose history for UI/debugging
  /* get actionHistory() {
    return this._actionStack.value
  }

  get redoHistory() {
    return this._redoStack.value
  } */
}
