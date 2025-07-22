import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

let actionStore
let engineStore
let canvasStore

vi.mock('../src/stores/useActionManagerStore.js', () => ({
  useActionManagerStore: () => actionStore
}))

vi.mock('../src/stores/useAudioEngineStore.js', () => ({
  useAudioEngineStore: () => engineStore
}))

vi.mock('../src/stores/useCanvasStore.js', () => ({
  useCanvasStore: () => canvasStore
}))

beforeEach(() => {
  actionStore = { actionManager: { doAction: vi.fn() } }
  engineStore = { pauseSoundSource: vi.fn(), playSoundSource: vi.fn() }
  canvasStore = { stageDivRef: { contextMenuRef: { show: vi.fn() } } }
  vi.resetModules()
})

describe('useContextMenuLogic', () => {
  it('shows context menu for sound node parts', async () => {
    const { useContextMenuLogic, SOUND_NODE_PART_NAME } = await import('../src/composables/useContextMenuLogic.js')
    const selected = ref(null)
    const { showContextMenu } = useContextMenuLogic(selected)

    const evt = {
      evt: { preventDefault: vi.fn(), stopPropagation: vi.fn(), clientX: 5, clientY: 10 },
      target: { getAttr: vi.fn(() => SOUND_NODE_PART_NAME) }
    }
    showContextMenu(evt)
    expect(evt.evt.preventDefault).toHaveBeenCalled()
    expect(canvasStore.stageDivRef.contextMenuRef.show).toHaveBeenCalledWith({ x: 5, y: 10 })
  })

  it('computes play/pause label', async () => {
    const { useContextMenuLogic } = await import('../src/composables/useContextMenuLogic.js')
    const selected = ref({ instance: { playing: true }, index: 0 })
    const { contextMenuActions } = useContextMenuLogic(selected)
    expect(contextMenuActions[0].label.value).toBe('Pause')
    selected.value.instance.playing = false
    expect(contextMenuActions[0].label.value).toBe('Play')
  })
})
