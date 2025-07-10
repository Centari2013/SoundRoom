// lib/ActionManager.js
import { ref, computed } from 'vue'

/**
 * Manages a history stack of named actions so they can be undone or redone.
 * Handlers for performing and undoing an action are registered with an action
 * name. Each performed action is stored so it can later be undone or redone.
 */
export default class ActionManager {
  #MAX_STACK = 100

  /**
   * Creates a new ActionManager instance.
   * Stacks are stored as reactive arrays so UI components can
   * react to changes.
   */
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
  

  /**
   * Registers handlers for a given action name.
   *
   * @param {string} actionName - Identifier for the action.
   * @param {Function} doAction - Function that performs the action.
   * @param {Function} undoAction - Function that undoes the action.
   */
  registerActionHandlers(actionName, doAction, undoAction) {
    this._actionMap[actionName] = { doAction, undoAction }
  }

  /**
   * Executes an action and records it on the undo stack.
   *
   * @param {string} actionName - Name of the registered action to run.
   * @param {*} [payload=null] - Optional payload passed to the action handler.
   */
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

  /**
   * Undoes the most recently executed action if one exists.
   */
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

  /**
   * Re-executes the most recently undone action if one exists.
   */
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

  /**
   * Empties both the undo and redo stacks.
   */
  clearHistory() {
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
