// src/composables/useVolumeSlider.js
export function useVolumeSlider(selectedSource, actionManager) {
  actionManager.registerActionHandlers(
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
    actionManager.doAction("set_sound_source_volume", volumePayload)
    volumePayload.value = null
  }

  return { onStart, onChange, onEnd }
}
