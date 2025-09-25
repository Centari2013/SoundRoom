import { useActionManagerStore } from '@/stores/useActionManagerStore'
import { useListenerStore } from '@/stores/useListenerStore'
import { useAudioEngineStore } from '@/stores/useAudioEngineStore'
import { useRoomStore } from '@/stores/useRoomStore'
import { registerSoundRoomActions, unregisterSoundRoomActions } from '@/composables/useSoundRoomActions'
import { useAudioCacheStore } from '@/stores/useAudioCacheStore'


/**
 * Reset all core stores to their initial state.
 *
 * Disposes of active audio objects and recreates fresh instances so a
 * brand new room can be instantiated without leftover state.
 */
export function resetRoomState() {
  unregisterSoundRoomActions()
  const actionStore = useActionManagerStore()
  const listenerStore = useListenerStore()
  const engineStore = useAudioEngineStore()
  const roomStore = useRoomStore()
  const cacheStore = useAudioCacheStore()

 

  // Clear undo/redo history and create a new manager instance
  actionStore.resetActionManager()

  // Reset listener
  listenerStore.resetListener()

  // Reset room metadata
  roomStore.resetRoom()

  // Clear draggable library sources but keep cached blobs available
  cacheStore.clearSoundLibrarySources({ removeFromCache: false })

  // Dispose of audio engine and start from scratch
  engineStore.resetAudioEngine()

  roomStore.getSaveSnapshot()
  registerSoundRoomActions()
}
