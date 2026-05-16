import { storeToRefs } from "pinia"
import { useActionManagerStore } from "@/stores/useActionManagerStore"
import { getCurrentScope, onScopeDispose, watch } from "vue"

const VOLUME_ACTION_NAMES = ["set_sound_source_volume"]

/**
 * Provides handlers for adjusting the volume of the currently selected sound source.
 *
 * @param {import('vue').Ref<Object|null>} selectedSource - ref of the currently selected source
 * @returns {{ onStart: Function, onChange: Function, onEnd: Function }} slider handlers
 */
export function useVolumeSlider(selectedSource) {
  const actionStore = useActionManagerStore()
  const { actionManager } = storeToRefs(actionStore)

  const unregisterVolumeActions = (manager) => {
    manager?.unregisterActionHandlers(VOLUME_ACTION_NAMES)
  }

  const registerVolumeActions = (manager) => {
    manager.registerActionHandlers(
      "set_sound_source_volume",
      (payload) => {
        selectedSource.value.instance.setVolume(payload.to)
      },
      (payload) => {
        selectedSource.value.instance.setVolume(payload.from)
      }
    )
  }

  let registeredVolumeActionManager = null
  const stopVolumeActionRegistration = watch(
    actionManager,
    (manager, previousManager) => {
      if (previousManager && previousManager !== manager) {
        unregisterVolumeActions(previousManager)
      }

      registerVolumeActions(manager)
      registeredVolumeActionManager = manager
    },
    { immediate: true, flush: "sync" }
  )

  if (getCurrentScope()) {
    onScopeDispose(() => {
      stopVolumeActionRegistration()
      unregisterVolumeActions(registeredVolumeActionManager)
      registeredVolumeActionManager = null
    })
  }

  let volumePayload = null

  /**
   * Capture initial volume and index when user begins sliding.
   */
  const onStart = () => {
    volumePayload = {
      from: selectedSource.value.instance.getVolume(),
      index: selectedSource.value.index
    }
  }

  /**
   * Update volume as slider moves.
   * @param {number} v - new volume value
   */
  const onChange = (v) => {
    if (selectedSource.value) {
      selectedSource.value.instance.setVolume(v)
    }
  }

  /**
   * Commit the volume change via the action manager.
   */
  const onEnd = () => {
    volumePayload.to = selectedSource.value.instance.getVolume()
    actionManager.value.doAction("set_sound_source_volume", volumePayload)
    volumePayload.value = null
  }

  return { onStart, onChange, onEnd }
}
