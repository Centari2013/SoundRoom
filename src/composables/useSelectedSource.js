import { computed } from "vue";
import { useRoomStore } from "@/stores/useRoomStore";

export function getSourceName(path) {
  const file = path.split('/').pop();
  return file.replace(/\.[^/.]+$/, '');
}

export function useSelectedSource(selectedIndex) {
  const { audioEngine } = useRoomStore();
  const selectedSource = computed(() => {
    const index = selectedIndex.value;
    if (index == null || index < 0 || index >= audioEngine.soundSources.value.length) return null;
    const raw = audioEngine.soundSources.value[index];
    return {
      ...raw,
      volume: raw.instance.getVolume(),
    };
  });

  return { selectedSource };
}
