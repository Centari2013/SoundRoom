import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import { supabase } from '@/utils/supabase'

import Room from '@/lib/Room'
import { useListenerStore } from './useListenerStore'
import { useAudioEngineStore } from './useAudioEngineStore'
import { useAudioCacheStore } from './useAudioCacheStore'

export const useRoomStore = defineStore('room', () => {
  const room = ref(new Room())
  const _lastSavedSnapshot = ref(null)
  const currentRoomNames = ref([])

  function setCurrentRoomNames() { // to be called on app load for duplicate room name checking
    supabase
      .from('rooms')
      .select('name')
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching room names:', error)
        } else {
          currentRoomNames.value = data.map(room => room.name)
        }
      })
  }

  function generateUniqueRoomName(base) {
    const normalized = currentRoomNames.value.map(n => n.toLowerCase())
    let name = base
    let count = 1

    while (normalized.includes(name.toLowerCase())) {
      name = `${base} (${count})`
      count++
    }

    return name
  }


  function loadRoom(roomData) {
    room.value = Room.fromJSON(roomData)
  }

  function roomToJSON() {
    return room.value.toJSON()
  }

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
    roomToJSON,
    getSaveSnapshot,
    isRoomSaveable,
    setCurrentRoomNames,
    generateUniqueRoomName,
  }
})
