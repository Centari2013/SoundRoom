import { useActionManagerStore } from '@/stores/useActionManagerStore'
import { useListenerStore } from '@/stores/useListenerStore'
import { useAudioEngineStore } from '@/stores/useAudioEngineStore'
import { useAudioCacheStore } from '@/stores/useAudioCacheStore'
import { useRoomStore } from '@/stores/useRoomStore'
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

  // Clear undo/redo history and create a new manager instance
  actionStore.actionManager.value.clearHistory()
  actionStore.actionManager.value = new ActionManager()

  // Dispose of audio engine and start from scratch
  engineStore.audioEngine.value.dispose()
  engineStore.audioEngine.value = new AudioEngine([])

  // Reset listener
  listenerStore.listener.value.dispose()
  listenerStore.listener.value = new Listener()

  // Remove any loaded library sounds and cached blobs
  cacheStore.clearSoundLibrarySources()
  cacheStore.audioCacheManager.value.clearMemoryCache()

  // Reset room metadata
  roomStore.room.value = new Room()
  roomStore.getSaveSnapshot()
}
