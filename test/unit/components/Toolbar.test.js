import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'

vi.mock('@/utils/supabase', () => ({ supabase: {} }))
vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: { value: false } }),
}))
vi.mock('@/composables/useSaveAndLoadRoom', () => ({
  useSaveAndLoadRoom: () => ({
    updateRoomName: vi.fn(async () => true),
  }),
}))

const { default: Toolbar } = await import('@/components/SoundRoom/Toolbar.vue')
const { useAudioEngineStore } = await import('@/stores/useAudioEngineStore')

function sourceWrapper({ playing = false } = {}) {
  return {
    locked: false,
    instance: {
      playing,
      state: { schedule: { id: 'source-1' } },
    },
  }
}

describe('Toolbar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('disables play/pause when the room has no canvas sources', () => {
    const wrapper = mount(Toolbar, {
      global: {
        stubs: {
          VueSlider: true,
          EditableRoomName: true,
        },
      },
    })

    expect(wrapper.findAll('button')[0].attributes('disabled')).toBeDefined()
  })

  it('calls playAll when sources exist and none are playing', async () => {
    const engineStore = useAudioEngineStore()
    engineStore.audioEngine.soundSources.value.push(sourceWrapper({ playing: false }))
    const playAll = vi.spyOn(engineStore.audioEngine, 'playAll').mockImplementation(() => {})

    const wrapper = mount(Toolbar, {
      global: {
        stubs: {
          VueSlider: true,
          EditableRoomName: true,
        },
      },
    })

    await wrapper.findAll('button')[0].trigger('click')

    expect(playAll).toHaveBeenCalledOnce()
  })

  it('calls pauseAll when at least one non-timeline source is playing', async () => {
    const engineStore = useAudioEngineStore()
    engineStore.audioEngine.soundSources.value.push(sourceWrapper({ playing: true }))
    const pauseAll = vi.spyOn(engineStore.audioEngine, 'pauseAll').mockImplementation(() => {})

    const wrapper = mount(Toolbar, {
      global: {
        stubs: {
          VueSlider: true,
          EditableRoomName: true,
        },
      },
    })

    await wrapper.findAll('button')[0].trigger('click')

    expect(pauseAll).toHaveBeenCalledOnce()
  })
})
