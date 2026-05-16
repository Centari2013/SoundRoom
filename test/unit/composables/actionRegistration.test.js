import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia, storeToRefs } from 'pinia'
import { effectScope, ref } from 'vue'

const { useActionManagerStore } = await import('@/stores/useActionManagerStore')
const { useKeyboardControls } = await import('@/composables/useKeyboardControls')
const { useVolumeSlider } = await import('@/composables/useVolumeSlider')

describe('action registrations', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('keeps keyboard actions registered after the action manager is reset', async () => {
    const actionStore = useActionManagerStore()
    const { actionManager } = storeToRefs(actionStore)
    const selectedSource = ref({
      locked: false,
      instance: {
        state: { angle: 0 },
        updateAudio: vi.fn(),
      },
    })
    const selectedIndex = ref(0)
    const scope = effectScope()

    scope.run(() => {
      useKeyboardControls({ selectedSource, selectedIndex })
    })

    const originalManager = actionManager.value
    actionStore.resetActionManager()

    expect(actionManager.value).not.toBe(originalManager)
    expect(actionManager.value._actionMap.rotate_source_angle).toBeDefined()

    await actionManager.value.doAction('rotate_source_angle', { from: 0, to: 45 })

    expect(selectedSource.value.instance.state.angle).toBe(45)
    scope.stop()
  })

  it('keeps source volume actions registered after the action manager is reset', async () => {
    const actionStore = useActionManagerStore()
    const { actionManager } = storeToRefs(actionStore)
    const setVolume = vi.fn()
    const selectedSource = ref({
      instance: {
        setVolume,
        getVolume: vi.fn(() => 1),
      },
    })
    const scope = effectScope()

    scope.run(() => {
      useVolumeSlider(selectedSource)
    })

    const originalManager = actionManager.value
    actionStore.resetActionManager()

    expect(actionManager.value).not.toBe(originalManager)
    expect(actionManager.value._actionMap.set_sound_source_volume).toBeDefined()

    await actionManager.value.doAction('set_sound_source_volume', { from: 1, to: 0.5 })

    expect(setVolume).toHaveBeenCalledWith(0.5)
    scope.stop()
  })
})
