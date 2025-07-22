import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useDragDropAudio } from '../../src/composables/useDragDropAudio.js'
import { setActivePinia, createPinia } from 'pinia'

let actionManagerRef, canvasStore

vi.mock('../../src/stores/useActionManagerStore.js', () => ({
  useActionManagerStore: () => ({ actionManager: actionManagerRef })
}))
vi.mock('../../src/stores/useCanvasStore.js', () => ({
  useCanvasStore: () => canvasStore
}))

beforeEach(() => {
  actionManagerRef = ref({ doAction: vi.fn() })
  canvasStore = { stageDivRef: { getBoundingClientRect: () => ({ left: 10, top: 20 }) } }
  setActivePinia(createPinia())
})

describe('useDragDropAudio', () => {
  it('captures dragged source and drops at coordinates', () => {
    const draggedSource = ref(null)
    const { handleDragStart, handleDrop } = useDragDropAudio({ draggedSource })
    const src = { audioPath: 'a.mp3', name: 'A', libraryId: '1' }
    handleDragStart(null, src)
    expect(draggedSource.value).toEqual(src)

    handleDrop({ clientX: 30, clientY: 50 })
    expect(actionManagerRef.value.doAction).toHaveBeenCalledWith('add_canvas_sound_source', expect.objectContaining({ src: expect.any(Object) }))
    const payload = actionManagerRef.value.doAction.mock.calls[0][1]
    expect(payload.src.state.x).toBe(20)
    expect(payload.src.state.y).toBe(30)
  })
})
