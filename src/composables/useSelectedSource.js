// src/composables/useSelectedSource.js

import { computed } from "vue";

export function useSelectedSource(soundSources, selectedIndex) {
  const getSourceName = (path) => {
    const file = path.split('/').pop()
    return file.replace(/\.[^/.]+$/, '')
  }

  const selectedSource = computed(() => {
    const index = selectedIndex.value
    if (index == null || index < 0 || index >= soundSources.value.length) return null
    const src = soundSources.value[index]
    const name = getSourceName(src.audioPath)
    const state = src.instance?.state
    let angle = state?.angle ?? src.angle
    angle = (angle % 360 + 360) % 360
    return {
      name,
      x: Math.round(state?.x ?? src.x),
      y: Math.round(state?.y ?? src.y),
      angle,
      innerCone: state?.coneInner ?? src.coneInner ?? 360,
      outerCone: state?.coneOuter ?? src.coneOuter ?? 360
    }
  })

  return { selectedSource, getSourceName }
}
