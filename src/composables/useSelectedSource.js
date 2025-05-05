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
    const index = selectedIndex.value
    if (index == null || index < 0 || index >= soundSources.value.length) return null
  
    const raw = soundSources.value[index]
    const name = getSourceName(raw.name)
  
    return {
      ...raw,
      volume: raw.instance.getVolume(),
    }
  })
  

  return { selectedSource }
}