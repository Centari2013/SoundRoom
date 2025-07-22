import { describe, it, expect, beforeEach } from 'vitest'
import ActionManager from '../src/lib/ActionManager.js'

let manager

beforeEach(() => {
  manager = new ActionManager()
  manager.registerActionHandlers('inc', (ctx) => ctx.count++, (ctx) => ctx.count--)
})

describe('ActionManager', () => {
  it('performs actions and tracks history', async () => {
    const ctx = { count: 0 }
    await manager.doAction('inc', ctx)
    expect(ctx.count).toBe(1)
    expect(manager._actionStack.value.length).toBe(1)
  })

  it('undoes and redoes actions', async () => {
    const ctx = { count: 0 }
    await manager.doAction('inc', ctx)
    await manager.undoLastAction()
    expect(ctx.count).toBe(0)
    await manager.redoLastAction()
    expect(ctx.count).toBe(1)
  })

  it('clears history', async () => {
    const ctx = { count: 0 }
    await manager.doAction('inc', ctx)
    manager.clearHistory()
    expect(manager._actionStack.value.length).toBe(0)
    expect(manager._redoStack.value.length).toBe(0)
  })
})
