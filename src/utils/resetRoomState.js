import { useActionManagerStore } from '@/stores/useActionManagerStore'
import { useListenerStore } from '@/stores/useListenerStore'
import { useAudioEngineStore } from '@/stores/useAudioEngineStore'
import { useAudioCacheStore } from '@/stores/useAudioCacheStore'
import { useRoomStore } from '@/stores/useRoomStore'
import { storeToRefs } from 'pinia'


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

  const { audioCacheManager } = storeToRefs(cacheStore)

  // Clear undo/redo history and create a new manager instance
  actionStore.resetActionManager()

  // Reset listener
  listenerStore.resetListener()

  // Remove any loaded library sounds and cached blobs
  cacheStore.clearSoundLibrarySources()
  audioCacheManager.value.clearMemoryCache()

  // Reset room metadata
  roomStore.resetRoom()

  // Dispose of audio engine and start from scratch
  engineStore.resetAudioEngine()

  roomStore.getSaveSnapshot()
}
