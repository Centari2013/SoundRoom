import { computed, watch } from 'vue'
import { useThemeStore } from '@/stores/useThemeStore'

export function useKonvaThemeRedraw(redrawFn) {
  const themeStore = useThemeStore()
  const themeVersion = computed(() => themeStore.signature)

  watch(
    () => themeVersion.value,
    () => {
      if (typeof redrawFn === 'function') {
        redrawFn()
      }
    },
    { flush: 'post' }
  )

  return { themeStore, themeVersion }
}
