import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/utils/supabase', () => ({ supabase: {} }))
vi.mock('@/utils/soundIntegrity', () => ({
  isSoundAvailable: vi.fn(async () => true),
}))

const { resetRoomState } = await import('@/utils/resetRoomState')
const { useListenerStore } = await import('@/stores/useListenerStore')

describe('resetRoomState', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('binds the fresh listener to the fresh audio context after creating a new room', () => {
    const listenerStore = useListenerStore()

    resetRoomState()

    const audioContext = listenerStore.listener._audioContext
    audioContext.listener.setOrientation.mockClear()

    listenerStore.listener.updateAngle(90)

    expect(audioContext).toBeTruthy()
    expect(audioContext.listener.setOrientation).toHaveBeenCalledWith(
      expect.closeTo(1, 5),
      expect.closeTo(0, 5),
      0,
      0,
      0,
      1
    )
  })
})
