import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { resetRoomState } from '../src/utils/resetRoomState.js'

vi.mock('../src/utils/supabase.js', () => ({ supabase: {} }))

let actionStore, listenerStore, engineStore, cacheStore, roomStore

vi.mock('../src/stores/useActionManagerStore.js', () => ({
  useActionManagerStore: () => {
    if (!actionStore) actionStore = { actionManager: { clearHistory: vi.fn() } }
    return actionStore
  }
}))
vi.mock('../src/stores/useListenerStore.js', () => ({
  useListenerStore: () => {
    if (!listenerStore) listenerStore = { listener: { dispose: vi.fn() } }
    return listenerStore
  }
}))
vi.mock('../src/stores/useAudioEngineStore.js', () => ({
  useAudioEngineStore: () => {
    if (!engineStore) engineStore = { audioEngine: { dispose: vi.fn() } }
    return engineStore
  }
}))
vi.mock('../src/stores/useAudioCacheStore.js', () => ({
  useAudioCacheStore: () => {
    if (!cacheStore) {
      cacheStore = {
        soundLibrarySources: [],
        audioCacheManager: { clearMemoryCache: vi.fn(function(){ this.memoryCache.clear() }), memoryCache: new Map() },
        clearSoundLibrarySources: () => { cacheStore.soundLibrarySources.length = 0 }
      }
    }
    return cacheStore
  }
}))
vi.mock('../src/stores/useRoomStore.js', () => ({
  useRoomStore: () => {
    if (!roomStore) roomStore = { room: {}, getSaveSnapshot: vi.fn() }
    return roomStore
  }
}))

beforeEach(async () => {
  setActivePinia(createPinia())
  Object.defineProperty(global, 'navigator', {
    value: { mediaSession: {} },
    configurable: true,
  })
  actionStore = (await import('../src/stores/useActionManagerStore.js')).useActionManagerStore()
  listenerStore = (await import('../src/stores/useListenerStore.js')).useListenerStore()
  engineStore = (await import('../src/stores/useAudioEngineStore.js')).useAudioEngineStore()
  cacheStore = (await import('../src/stores/useAudioCacheStore.js')).useAudioCacheStore()
  roomStore = (await import('../src/stores/useRoomStore.js')).useRoomStore()
})

describe('resetRoomState', () => {
  it('reinitializes core stores', () => {
    cacheStore.soundLibrarySources.push({ id: 1 })
    cacheStore.audioCacheManager.memoryCache.set('x', 'y')

    resetRoomState()

    expect(cacheStore.soundLibrarySources.length).toBe(0)
    expect(cacheStore.audioCacheManager.memoryCache.size).toBe(0)
    expect(roomStore.getSaveSnapshot).toHaveBeenCalled()
  })
})
