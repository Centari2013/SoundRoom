// src/composables/useVolumeSlider.js
export function useVolumeSlider(canvasSoundSources, selectedIndex, actionManager) {
  actionManager.registerActionHandlers(
    "set_sound_source_volume",
    (payload) => {
      const src = canvasSoundSources.value[payload.index]
      src.instance.setVolume(payload.to)
    },
    (payload) => {
      const src = canvasSoundSources.value[payload.index]
      src.instance.setVolume(payload.from)
    }
  )

  let volumePayload = null

  const onStart = () => {
    volumePayload = {
      from: canvasSoundSources.value[selectedIndex.value].instance.getVolume(),
      index: selectedIndex.value
    }
  }

  const onChange = (v) => {
    const src = canvasSoundSources.value[selectedIndex.value]
    if (src?.instance) {
      src.instance.setVolume(v)
    }
  }

  const onEnd = () => {
    volumePayload.to = canvasSoundSources.value[selectedIndex.value].instance.getVolume()
    actionManager.doAction("set_sound_source_volume", volumePayload)
    volumePayload.value = null
  }

  return { onStart, onChange, onEnd }
}
