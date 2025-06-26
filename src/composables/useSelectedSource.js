import { computed } from "vue";

export function getSourceName(path) {
  const file = path.split('/').pop();
  return file.replace(/\.[^/.]+$/, '');
}

export function useSelectedSource(soundSources, selectedIndex) {
  const selectedSource = computed(() => {
    const index = selectedIndex.value;
    if (index == null || index < 0 || index >= soundSources.value.length) return null;
    const raw = soundSources.value[index];
    return {
      ...raw,
      volume: raw.instance.getVolume(),
    };
  });

  return { selectedSource };
}
