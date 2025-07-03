import { computed } from "vue";
import { useAudioEngineStore } from "@/stores/useAudioEngineStore";
import { storeToRefs } from "pinia";

export function getSourceName(path) {
  const file = path.split('/').pop();
  return file.replace(/\.[^/.]+$/, '');
}

export function useSelectedSource(selectedIndex) {
  const { audioEngine } = storeToRefs(useAudioEngineStore());
  const selectedSource = computed(() => {
    const index = selectedIndex.value;
    if (index == null || index < 0 || index >= audioEngine.value.soundSources.value.length) return null;
    const raw = audioEngine.value.soundSources.value[index];
  
    return {
      ...raw,
      volume: raw.instance.getVolume(),
    };
  });

  return { selectedSource };
}
