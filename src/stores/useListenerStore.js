import { defineStore } from 'pinia'
import { ref } from 'vue'
import Listener from '@/lib/Listener'

export const useListenerStore = defineStore('listener', () => {
  const listener = ref(new Listener())

  function loadListener(data) {
    listener.value = Listener.fromJSON(data)
  }

  function listenerToJSON() {
    return listener.value.toJSON()
  }

  return {
    listener,
    loadListener,
    listenerToJSON
  }
})
