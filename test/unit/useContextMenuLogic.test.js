import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useContextMenuLogic, SOUND_NODE_PART_NAME } from '../../src/composables/useContextMenuLogic.js'

vi.mock('../../src/stores/useActionManagerStore.js', () => ({
  useActionManagerStore: () => ({ actionManager: { doAction: vi.fn() } })
}))

let show
vi.mock('../../src/stores/useCanvasStore.js', () => ({
  useCanvasStore: () => ({ stageDivRef: { contextMenuRef: { show: (...args) => show(...args) } } })
}))
vi.mock('../../src/stores/useAudioEngineStore.js', () => ({
  useAudioEngineStore: () => ({ playSoundSource: vi.fn(), pauseSoundSource: vi.fn() })
}))

describe('useContextMenuLogic', () => {
  it('shows context menu for sound node part', () => {
    show = vi.fn()
    const { showContextMenu } = useContextMenuLogic(ref(null))
    const prevent = vi.fn()
    const stop = vi.fn()
    const evt = { preventDefault: prevent, stopPropagation: stop, clientX: 5, clientY: 6 }
    const target = { getAttr: vi.fn(() => SOUND_NODE_PART_NAME) }
    showContextMenu({ evt, target })
    expect(prevent).toHaveBeenCalled()
    expect(stop).toHaveBeenCalled()
    expect(show).toHaveBeenCalledWith({ x: 5, y: 6 })
  })
})
