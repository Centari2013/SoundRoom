import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

let canvasStore

vi.mock('@/stores/useCanvasStore', () => ({
  useCanvasStore: () => canvasStore
}))

beforeEach(() => {
  vi.resetModules()
  setActivePinia(createPinia())
  canvasStore = { stageDivRef: { getBoundingClientRect: () => ({ left: 10, top: 20 }) } }
})

describe('useDragDropAudio', () => {
  it('stores dragged source when drag starts', async () => {
    const { useDragDropAudio } = await import('../src/composables/useDragDropAudio.js')
    const draggedSource = ref(null)
    const { handleDragStart } = useDragDropAudio({ draggedSource })

    handleDragStart({}, { name: 'foo' })
    expect(draggedSource.value.name).toBe('foo')
  })
})
