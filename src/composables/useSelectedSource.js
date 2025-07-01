import { computed } from "vue";
import { useRoomStore } from "@/stores/useRoomStore";
import { storeToRefs } from "pinia";

export function getSourceName(path) {
  const file = path.split('/').pop();
  return file.replace(/\.[^/.]+$/, '');
}

export function useSelectedSource(selectedIndex) {
  const { audioEngine } = storeToRefs(useRoomStore());
  const selectedSource = computed(() => {
    const index = selectedIndex.value;
    if (index == null || index < 0 || index >= audioEngine.value.soundSources.value.length) return null;
    const raw = audioEngine.value.soundSources.value[index];
    console.log(raw)
    return {
      ...raw,
      volume: raw.instance.getVolume(),
    };
  });

  return { selectedSource };
}
