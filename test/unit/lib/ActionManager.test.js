import { describe, it, expect, vi, beforeEach } from 'vitest'
import ActionManager from '@/lib/ActionManager'

describe('ActionManager', () => {
  let manager

  beforeEach(() => {
    manager = new ActionManager()
  })

  // ─── Constructor ────────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('starts with empty action stack', () => {
      expect(manager._actionStack.value).toEqual([])
    })

    it('starts with empty redo stack', () => {
      expect(manager._redoStack.value).toEqual([])
    })

    it('actionStackEmpty is true initially', () => {
      expect(manager.actionStackEmpty.value).toBe(true)
    })

    it('redoStackEmpty is true initially', () => {
      expect(manager.redoStackEmpty.value).toBe(true)
    })

    it('waiting is false initially', () => {
      expect(manager.waiting.value).toBe(false)
    })
  })

  // ─── registerActionHandlers ──────────────────────────────────────────────────

  describe('registerActionHandlers', () => {
    it('stores handler under the given name', () => {
      const doFn = vi.fn()
      const undoFn = vi.fn()
      manager.registerActionHandlers('test_action', doFn, undoFn)
      expect(manager._actionMap['test_action']).toBeDefined()
      expect(manager._actionMap['test_action'].doAction).toBe(doFn)
      expect(manager._actionMap['test_action'].undoAction).toBe(undoFn)
    })

    it('overwrites an existing handler with the same name', () => {
      const first = vi.fn()
      const second = vi.fn()
      manager.registerActionHandlers('action', first, vi.fn())
      manager.registerActionHandlers('action', second, vi.fn())
      expect(manager._actionMap['action'].doAction).toBe(second)
    })
  })

  // ─── unregisterActionHandlers ────────────────────────────────────────────────

  describe('unregisterActionHandlers', () => {
    it('removes a single handler by name', () => {
      manager.registerActionHandlers('to_remove', vi.fn(), vi.fn())
      manager.unregisterActionHandlers('to_remove')
      expect(manager._actionMap['to_remove']).toBeUndefined()
    })

    it('removes multiple handlers given an array', () => {
      manager.registerActionHandlers('a', vi.fn(), vi.fn())
      manager.registerActionHandlers('b', vi.fn(), vi.fn())
      manager.unregisterActionHandlers(['a', 'b'])
      expect(manager._actionMap['a']).toBeUndefined()
      expect(manager._actionMap['b']).toBeUndefined()
    })

    it('does not throw when removing a non-existent handler', () => {
      expect(() => manager.unregisterActionHandlers('ghost')).not.toThrow()
    })
  })

  // ─── doAction ───────────────────────────────────────────────────────────────

  describe('doAction', () => {
    it('calls the registered doFn with the payload', async () => {
      const doFn = vi.fn()
      manager.registerActionHandlers('paint', doFn, vi.fn())
      await manager.doAction('paint', { color: 'red' })
      expect(doFn).toHaveBeenCalledWith({ color: 'red' })
    })

    it('pushes the action onto the action stack', async () => {
      manager.registerActionHandlers('draw', vi.fn(), vi.fn())
      await manager.doAction('draw', 42)
      expect(manager._actionStack.value).toHaveLength(1)
      expect(manager._actionStack.value[0]).toEqual({ name: 'draw', payload: 42 })
    })

    it('clears the redo stack after a new action', async () => {
      const doFn = vi.fn()
      const undoFn = vi.fn()
      manager.registerActionHandlers('act', doFn, undoFn)
      await manager.doAction('act', 1)
      await manager.undoLastAction()
      expect(manager._redoStack.value).toHaveLength(1)
      await manager.doAction('act', 2)
      expect(manager._redoStack.value).toHaveLength(0)
    })

    it('warns and returns early for an unregistered action', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      await manager.doAction('mystery_action')
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('mystery_action'))
      expect(manager._actionStack.value).toHaveLength(0)
      warn.mockRestore()
    })

    it('actionStackEmpty becomes false after an action', async () => {
      manager.registerActionHandlers('step', vi.fn(), vi.fn())
      await manager.doAction('step')
      expect(manager.actionStackEmpty.value).toBe(false)
    })

    it('waiting is false after completion', async () => {
      manager.registerActionHandlers('quick', vi.fn(), vi.fn())
      await manager.doAction('quick')
      expect(manager.waiting.value).toBe(false)
    })

    it('caps the action stack at 100 entries and drops the oldest', async () => {
      manager.registerActionHandlers('tick', vi.fn(), vi.fn())
      for (let i = 0; i < 105; i++) {
        await manager.doAction('tick', i)
      }
      expect(manager._actionStack.value).toHaveLength(100)
      expect(manager._actionStack.value[0].payload).toBe(5)
    })
  })

  // ─── undoLastAction ──────────────────────────────────────────────────────────

  describe('undoLastAction', () => {
    it('calls the undoFn with the original payload', async () => {
      const undoFn = vi.fn()
      manager.registerActionHandlers('move', vi.fn(), undoFn)
      await manager.doAction('move', { x: 10 })
      await manager.undoLastAction()
      expect(undoFn).toHaveBeenCalledWith({ x: 10 })
    })

    it('moves the action from action stack to redo stack', async () => {
      manager.registerActionHandlers('place', vi.fn(), vi.fn())
      await manager.doAction('place', 'A')
      await manager.undoLastAction()
      expect(manager._actionStack.value).toHaveLength(0)
      expect(manager._redoStack.value).toHaveLength(1)
      expect(manager._redoStack.value[0]).toEqual({ name: 'place', payload: 'A' })
    })

    it('does nothing when the action stack is empty', async () => {
      await expect(manager.undoLastAction()).resolves.toBeUndefined()
      expect(manager._redoStack.value).toHaveLength(0)
    })

    it('warns if the handler for the action was unregistered before undo', async () => {
      manager.registerActionHandlers('tmp', vi.fn(), vi.fn())
      await manager.doAction('tmp')
      manager.unregisterActionHandlers('tmp')
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      await manager.undoLastAction()
      expect(warn).toHaveBeenCalled()
      warn.mockRestore()
    })

    it('redoStackEmpty becomes false after undo', async () => {
      manager.registerActionHandlers('x', vi.fn(), vi.fn())
      await manager.doAction('x')
      await manager.undoLastAction()
      expect(manager.redoStackEmpty.value).toBe(false)
    })
  })

  // ─── redoLastAction ──────────────────────────────────────────────────────────

  describe('redoLastAction', () => {
    it('re-executes the undone action', async () => {
      const doFn = vi.fn()
      manager.registerActionHandlers('resize', doFn, vi.fn())
      await manager.doAction('resize', 200)
      await manager.undoLastAction()
      doFn.mockClear()
      await manager.redoLastAction()
      expect(doFn).toHaveBeenCalledWith(200)
    })

    it('moves the action from redo stack back to action stack', async () => {
      manager.registerActionHandlers('jump', vi.fn(), vi.fn())
      await manager.doAction('jump', 'B')
      await manager.undoLastAction()
      await manager.redoLastAction()
      expect(manager._redoStack.value).toHaveLength(0)
      expect(manager._actionStack.value).toHaveLength(1)
    })

    it('does nothing when redo stack is empty', async () => {
      await expect(manager.redoLastAction()).resolves.toBeUndefined()
    })
  })

  // ─── clearHistory ────────────────────────────────────────────────────────────

  describe('clearHistory', () => {
    it('empties both stacks', async () => {
      manager.registerActionHandlers('fill', vi.fn(), vi.fn())
      await manager.doAction('fill', 1)
      await manager.doAction('fill', 2)
      await manager.undoLastAction()
      manager.clearHistory()
      expect(manager._actionStack.value).toHaveLength(0)
      expect(manager._redoStack.value).toHaveLength(0)
    })

    it('makes both empty flags true', async () => {
      manager.registerActionHandlers('z', vi.fn(), vi.fn())
      await manager.doAction('z')
      manager.clearHistory()
      expect(manager.actionStackEmpty.value).toBe(true)
      expect(manager.redoStackEmpty.value).toBe(true)
    })
  })

  // ─── async handlers ──────────────────────────────────────────────────────────

  describe('async action handlers', () => {
    it('awaits an async doFn before pushing to stack', async () => {
      const order = []
      const doFn = async () => {
        await new Promise(r => setTimeout(r, 10))
        order.push('done')
      }
      manager.registerActionHandlers('async_act', doFn, vi.fn())
      const promise = manager.doAction('async_act')
      expect(order).toHaveLength(0)
      await promise
      expect(order).toEqual(['done'])
      expect(manager._actionStack.value).toHaveLength(1)
    })
  })
})
