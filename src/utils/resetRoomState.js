import { useActionManagerStore } from '@/stores/useActionManagerStore'
import { useListenerStore } from '@/stores/useListenerStore'
import { useRoomStore } from '@/stores/useRoomStore'


/**
 * Reset all core stores to their initial state.
 *
 * Disposes of active audio objects and recreates fresh instances so a
 * brand new room can be instantiated without leftover state.
 */
export function resetRoomState() {
  const actionStore = useActionManagerStore()
  const listenerStore = useListenerStore()
  const roomStore = useRoomStore()

 

  // Clear undo/redo history and create a new manager instance
  actionStore.resetActionManager()

  // Reset listener
  listenerStore.resetListener()

  // Reset room metadata
  roomStore.resetRoom()

  roomStore.getSaveSnapshot()
}
