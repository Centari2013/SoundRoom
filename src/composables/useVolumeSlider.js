import { storeToRefs } from "pinia"
import { useActionManagerStore } from "@/stores/useActionManagerStore"
export function useVolumeSlider(selectedSource) {
  const actionStore = useActionManagerStore()
  const { actionManager } = storeToRefs(actionStore)
  actionManager.value.registerActionHandlers(
    "set_sound_source_volume",
    (payload) => {
      selectedSource.value.instance.setVolume(payload.to)
    },
    (payload) => {
      selectedSource.value.instance.setVolume(payload.from)
    }
  )

  let volumePayload = null

  const onStart = () => {
    volumePayload = {
      from: selectedSource.value.instance.getVolume(),
      index: selectedSource.value.index
    }
  }

  const onChange = (v) => {
    if (selectedSource.value) {
      selectedSource.value.instance.setVolume(v)
    }
  }

  const onEnd = () => {
    volumePayload.to = selectedSource.value.instance.getVolume()
    actionManager.value.doAction("set_sound_source_volume", volumePayload)
    volumePayload.value = null
  }

  return { onStart, onChange, onEnd }
}
