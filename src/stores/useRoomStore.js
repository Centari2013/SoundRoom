// stores/useRoomStore.js
import { defineStore } from 'pinia'
import { ref, shallowRef, computed } from 'vue'
import Room from '@/lib/Room'
import Listener from '@/lib/Listener'
import AudioEngine from '@/lib/AudioEngine'
import ActionManager from '@/lib/ActionManager'

export const useRoomStore = defineStore('room', () => {
  // reactive refs
  const room = ref(new Room())
  const listener = ref(new Listener())
  const audioEngine = shallowRef(new AudioEngine([]))
  const soundLibrarySources = ref([])
  const actionManager = ref(new ActionManager())
  const _lastSavedSnapshot = ref(null)

  // actions
  function setupAudioContext() {
    const audioContext = audioEngine.value.getAudioContext()
    listener.value.setAudioContext(audioContext)
    audioEngine.value.setupAudioEngine() // run after listener audio context is set because it plays saved sounds
    listener.value.updateAudio() // ensure listener is ready with the new context
    getSaveSnapshot()
  }
  function loadRoom(roomData) {
    room.value = Room.fromJSON(roomData)
  }

  function loadListener(data) {
    listener.value = Listener.fromJSON(data)
  }

  function loadAudioEngine(data) {
    audioEngine.value = AudioEngine.fromJSON(data)
  }

  function clearSoundLibrarySources() {
    soundLibrarySources.value = []
  }

  function roomToJSON() {
    return room.value.toJSON()
  }
  function listenerToJSON() {
    return listener.value.toJSON()
  }
  function audioEngineToJSON() {
    return audioEngine.value.toJSON()
  }

  function getSaveSnapshot() {
    const savedState = {
      room: roomToJSON(),
      listener: listenerToJSON(), 
      audioEngine: audioEngineToJSON(),
      soundLibrarySources: soundLibrarySourcesToJSON()
    }
    _lastSavedSnapshot.value = JSON.stringify(savedState)
    return savedState
  }

  function soundLibrarySourcesToJSON() {
    return soundLibrarySources.value.map((src) => ({ 
      libraryId: src.libraryId, 
      coneInner: src.coneInner, 
      coneOuter: src.coneOuter,  
      name: src.name 
    }))
  }

  function addLibrarySource(src) {
    soundLibrarySources.value.push(src)
  }

  function setMaxCanvasSources(max) {
    if (audioEngine.value) {
      audioEngine.value.maxSourceCount = max
    }
  }

  async function addLibrarySoundSource(src) {
    await actionManager.value.doAction('add_draggable_sound_source', { src })
  }

  async function deleteLibrarySoundSource(src) {
    await actionManager.value.doAction('delete_draggable_sound_source', { src })
  }

  const isPlaying = computed(() => audioEngine.value.isPlaying.value)
  const actionStackEmpty = computed(() => actionManager.value.actionStackEmpty)
  const redoStackEmpty = computed(() => actionManager.value.redoStackEmpty)
  const MAX_CANVAS_SOURCES = computed(() => audioEngine.value.maxSourceCount)
  const isRoomSaveable = computed(() => {
  // 👇 this line makes Vue re-evaluate when any relevant part changes
    void room.value && void listener.value && void audioEngine.value && void soundLibrarySources.value

    try {
      const currentSnapshot = JSON.stringify({
        room: roomToJSON(),
        listener: listenerToJSON(),
        audioEngine: audioEngineToJSON(),
        soundLibrarySources: soundLibrarySourcesToJSON(),
      })
      return currentSnapshot !== _lastSavedSnapshot.value
    } catch (e) {
      console.warn('Error computing isRoomSaveable:', e)
      return false
    }
  })

  return {
    room,
    listener,
    audioEngine,
    soundLibrarySources,
    actionManager,
    loadRoom,
    loadListener,
    loadAudioEngine,
    addLibrarySource,
    setMaxCanvasSources,
    addLibrarySoundSource,
    deleteLibrarySoundSource,
    clearSoundLibrarySources,
    isPlaying,
    actionStackEmpty,
    redoStackEmpty,
    MAX_CANVAS_SOURCES,
    roomToJSON,
    listenerToJSON,
    audioEngineToJSON,
    soundLibrarySourcesToJSON,
    setupAudioContext,
    isRoomSaveable,
    getSaveSnapshot,
  }
})
