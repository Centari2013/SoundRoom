import { useActionManagerStore } from '@/stores/useActionManagerStore'
import { useListenerStore } from '@/stores/useListenerStore'
import { useAudioEngineStore } from '@/stores/useAudioEngineStore'
import { useAudioCacheStore } from '@/stores/useAudioCacheStore'
import { useRoomStore } from '@/stores/useRoomStore'
import { storeToRefs } from 'pinia'
import ActionManager from '@/lib/ActionManager'
import Listener from '@/lib/Listener'
import AudioEngine from '@/lib/AudioEngine'
import Room from '@/lib/Room'

/**
 * Reset all core stores to their initial state.
 *
 * Disposes of active audio objects and recreates fresh instances so a
 * brand new room can be instantiated without leftover state.
 */
export function resetRoomState() {
  const actionStore = useActionManagerStore()
  const listenerStore = useListenerStore()
  const engineStore = useAudioEngineStore()
  const cacheStore = useAudioCacheStore()
  const roomStore = useRoomStore()

  const { room } = storeToRefs(roomStore)
  const { listener } = storeToRefs(listenerStore)
  const { audioCacheManager } = storeToRefs(cacheStore)
  const { actionManager } = storeToRefs(actionStore)

  // Clear undo/redo history and create a new manager instance
  actionManager.value.clearHistory()

  // Reset listener
  listener.value.dispose()
  listener.value = new Listener()

  // Remove any loaded library sounds and cached blobs
  cacheStore.clearSoundLibrarySources()
  audioCacheManager.value.clearMemoryCache()

  // Reset room metadata
  room.value = new Room()

  // Dispose of audio engine and start from scratch
  engineStore.resetAudioEngine()
  
  roomStore.getSaveSnapshot()
}
