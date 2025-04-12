import { computed } from "vue";

export function getSourceName(path) {
  const file = path.split('/').pop()
  return file.replace(/\.[^/.]+$/, '')
}

export function useSelectedSource(soundSources, selectedIndex) {
  const rawSource = computed(() => {
    const index = selectedIndex.value
    if (index == null || index < 0 || index >= soundSources.value.length) return null
    return soundSources.value[index]
  })


  const selectedSource = computed(() => {
    if (!rawSource.value) return null
    const src = rawSource.value
    const name = getSourceName(src.audioPath)
    const state = src.instance?.state
    let angle = state?.angle ?? src.angle
    angle = (angle % 360 + 360) % 360
    return {
      name,
      index: selectedIndex.value,
      volume: src.instance.getVolume(),
      ...rawSource.value
    }
  })

  return { selectedSource }
}