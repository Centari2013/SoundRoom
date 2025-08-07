import { defineStore } from 'pinia'
import { ref, shallowRef, computed } from 'vue'
import { supabase } from '@/utils/supabase'

/**
 * Store responsible for managing room metadata and serializing the
 * application state for saving/loading rooms.
 */

import Room from '@/lib/Room'
import { useListenerStore } from './useListenerStore'
import { useAudioEngineStore } from './useAudioEngineStore'
import { useAudioCacheStore } from './useAudioCacheStore'

export const useRoomStore = defineStore('room', () => {
  const room = shallowRef(new Room())
  room.value.setAudioEngine()
  const _lastSavedSnapshot = ref(null)
  const existingRoomNames = ref([])

  /**
   * Populate the list of existing room names for duplicate checks.
   * Should be invoked once on application startup.
   *
   * @returns {void}
   */
  function setExistingRoomNames() {
    supabase
      .from('rooms')
      .select('id, name')
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching room names:', error)
        } else {
          existingRoomNames.value = data.map(room => ({
            name: room.name,
            id: room.id
          }))
        }
      })
  }

  /**
   * Generate a unique room name based on a base name and an ID.
   * If the base name already exists in `existingRoomNames`, appends a suffix like "(1)", "(2)", etc.
   * Reuses existing entry if ID already exists, or adds a new one if not.
   * 
   * @param {string} id - The unique identifier for the room.
   * @param {string} base - The desired base name for the room.
   * @returns {string} - A unique room name.
   */
  function generateUniqueRoomName(id, base) {
    // Fallback to default name if base is empty or just whitespace
    if (!base || base.trim() === '') {
      base = 'Untitled Room'
    }

    let name = base
    let count = 1

    // Filter out the current room (if it exists) so it doesn't collide with itself
    const normalizedNames = existingRoomNames.value
      .filter(room => room.id !== id)
      .map(room => room.name.toLowerCase())

    // Add suffix until the name is unique
    while (normalizedNames.includes(name.toLowerCase())) {
      name = `${base} (${count})`
      count++
    }

    return name
  }

  /**
   * Update the tracked room name list once a name is successfully saved.
   * Reuses existing entry if ID already exists, or adds a new one if not.
   *
   * @param {string} id
   * @param {string} name
   */

  function commitRoomName(id, name) {
    // Handle rooms that haven't been saved to the DB yet
    if (!id) {
      const tempIndex = existingRoomNames.value.findIndex(r => r.id === null)
      if (tempIndex !== -1) {
        existingRoomNames.value[tempIndex].name = name
      } else {
        existingRoomNames.value.push({ id, name })
      }
      return
    }

    // Remove any temporary entry once we have a real ID
    const tempIndex = existingRoomNames.value.findIndex(r => r.id === null)
    if (tempIndex !== -1) existingRoomNames.value.splice(tempIndex, 1)

    const index = existingRoomNames.value.findIndex(r => r.id === id)
    if (index !== -1) {
      existingRoomNames.value[index].name = name
    } else {
      existingRoomNames.value.push({ id, name })
    }
  }


  /**
   * Load room configuration from serialized data.
   *
   * @param {Object} roomData - data from `Room.toJSON()`
   * @returns {void}
   */
  function loadRoom(roomData) {
    room.value = Room.fromJSON(roomData)
  }

  /**
   * Serialize the current room state.
   *
   * @returns {Object}
   */
  function roomToJSON() {
    return room.value.toJSON()
  }

  /**
   * Capture a snapshot of all core stores for persistence.
   *
   * @returns {Object} serialized snapshot
   */
  function getSaveSnapshot() {
    const listenerStore = useListenerStore()
    const audioEngineStore = useAudioEngineStore()
    const cacheStore = useAudioCacheStore()
    const savedState = {
      room: roomToJSON(),
      listener: listenerStore.listenerToJSON(),
      audioEngine: audioEngineStore.audioEngineToJSON(),
      soundLibrarySources: cacheStore.soundLibrarySourcesToJSON()
    }
    _lastSavedSnapshot.value = JSON.stringify(savedState)
    return savedState
  }

  /** Reset the room state to its initial values. */
  function resetRoom() {
    room.value.dispose()
    room.value = new Room()
    room.value.setAudioEngine()
  }

  const isRoomSaveable = computed(() => {
    const listenerStore = useListenerStore()
    const audioEngineStore = useAudioEngineStore()
    const cacheStore = useAudioCacheStore()
    void room.value && void listenerStore.listener && void audioEngineStore.audioEngine && void cacheStore.soundLibrarySources

    try {
      const currentSnapshot = JSON.stringify({
        room: roomToJSON(),
        listener: listenerStore.listenerToJSON(),
        audioEngine: audioEngineStore.audioEngineToJSON(),
        soundLibrarySources: cacheStore.soundLibrarySourcesToJSON()
      })
      return currentSnapshot !== _lastSavedSnapshot.value
    } catch (e) {
      console.warn('Error computing isRoomSaveable:', e)
      return false
    }
  })

  return {
    room,
    loadRoom,
    resetRoom,
    roomToJSON,
    getSaveSnapshot,
    isRoomSaveable,
    setExistingRoomNames,
    generateUniqueRoomName,
    commitRoomName,
  }
})
