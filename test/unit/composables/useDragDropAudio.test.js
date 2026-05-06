import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('@/utils/supabase', () => ({ supabase: {} }))
vi.mock('@/utils/soundIntegrity', () => ({
  isSoundAvailable: vi.fn(async () => true),
}))

const { useDragDropAudio } = await import('@/composables/useDragDropAudio')
const { unregisterSoundRoomActions } = await import('@/composables/useSoundRoomActions')
const { useCanvasStore } = await import('@/stores/useCanvasStore')
const { useAudioCacheStore } = await import('@/stores/useAudioCacheStore')
const { useAudioEngineStore } = await import('@/stores/useAudioEngineStore')

describe('useDragDropAudio', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    unregisterSoundRoomActions()
  })

  it('stores the dragged library source on drag start', () => {
    const draggedSource = ref(null)
    const { handleDragStart } = useDragDropAudio({ draggedSource })
    const source = { libraryId: 'rain', name: 'Rain' }

    handleDragStart(new Event('dragstart'), source)

    expect(draggedSource.value).toStrictEqual(source)
  })

  it('drops a source onto the canvas using coordinates relative to the stage', async () => {
    const draggedSource = ref({
      audioPath: '/sounds/rain.wav',
      libraryId: 'rain',
      name: 'Rain',
      coneInner: 45,
      coneOuter: 120,
      plan_tier: 'free',
    })
    const canvasStore = useCanvasStore()
    const cacheStore = useAudioCacheStore()
    const engineStore = useAudioEngineStore()
    const { handleDrop } = useDragDropAudio({ draggedSource })

    cacheStore.soundLibrarySources.push({
      audioPath: '/sounds/rain.wav',
      libraryId: 'rain',
      name: 'Rain',
      plan_tier: 'free',
    })
    canvasStore.setStageDivRef({
      getBoundingClientRect: () => ({ left: 50, top: 25 }),
    })

    handleDrop({ clientX: 200, clientY: 125 })
    await flushPromises()

    expect(engineStore.audioEngine.soundSources.value).toHaveLength(1)
    expect(engineStore.audioEngine.soundSources.value[0]).toMatchObject({
      name: 'Rain',
      libraryId: 'rain',
      audioPath: '/sounds/rain.wav',
      plan_tier: 'free',
      fileId: 'rain',
    })
    expect(engineStore.audioEngine.soundSources.value[0].instance.state).toMatchObject({
      x: 150,
      y: 100,
      coneInner: 45,
      coneOuter: 120,
    })
  })

  it('does nothing when no source is being dragged', () => {
    const draggedSource = ref(null)
    const engineStore = useAudioEngineStore()
    const { handleDrop } = useDragDropAudio({ draggedSource })

    handleDrop({ clientX: 200, clientY: 125 })

    expect(engineStore.audioEngine.soundSources.value).toHaveLength(0)
  })
})
