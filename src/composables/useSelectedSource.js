import { computed } from "vue";
import { useAudioEngineStore } from "@/stores/useAudioEngineStore";
import { storeToRefs } from "pinia";

/**
 * Strip the file extension from an audio file path to derive a display name.
 *
 * @param {string} path - full path to the audio file
 * @returns {string} file name without extension
 */
export function getSourceName(path) {
  const file = path.split('/').pop();
  return file.replace(/\.[^/.]+$/, '');
}

/**
 * Reactive helper that exposes the currently selected sound source.
 *
 * @param {import('vue').Ref<number|null>} selectedIndex - reactive index value
 * @returns {{ selectedSource: import('vue').ComputedRef<Object|null> }}
 */
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
