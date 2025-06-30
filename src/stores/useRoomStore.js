// stores/useRoomStore.js
import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import Room from '@/lib/Room'
import Listener from '@/lib/Listener'
import AudioEngine from '@/lib/AudioEngine'

export const useRoomStore = defineStore('room', () => {
  // reactive refs
  const room = ref(new Room())
  const listener = ref(new Listener())
  const audioEngine = shallowRef(new AudioEngine([]))
  const soundLibrarySources = ref([])

  // actions
  function setRoom(roomData) {
    room.value = Room.fromJSON(roomData)
  }

  function setListener(data) {
    listener.value = Listener.fromJSON(data)
  }

  function setAudioEngine(data) {
    audioEngine.value = AudioEngine.fromJSON(data)
  }

  function addLibrarySource(src) {
    soundLibrarySources.value.push(src)
  }

  return {
    room,
    listener,
    audioEngine,
    soundLibrarySources,
    setRoom,
    setListener,
    setAudioEngine,
    addLibrarySource
  }
})
