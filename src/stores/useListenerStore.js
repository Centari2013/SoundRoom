import { defineStore } from 'pinia'
import { ref } from 'vue'
import Listener from '@/lib/Listener'

/**
 * Store exposing the application's single {@link Listener} instance.
 */

export const useListenerStore = defineStore('listener', () => {
  const listener = ref(new Listener())

  /**
   * Hydrate the listener from serialized data.
   *
   * @param {Object} data - data from `Listener.toJSON()`
   * @returns {void}
   */
  function loadListener(data) {
    listener.value = Listener.fromJSON(data)
  }

  /**
   * Serialize the current listener state.
   *
   * @returns {Object}
   */
  function listenerToJSON() {
    return listener.value.toJSON()
  }

  /**
   * Reset the listener to its initial state.
   */
  function resetListener() {
    listener.value.dispose()
    listener.value = new Listener()
  }

  return {
    listener,
    loadListener,
    listenerToJSON,
    resetListener
  }
})
