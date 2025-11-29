import { onMounted, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useThemeStore } from '@/stores/useThemeStore'

export function useThemeBootstrap() {
  const { user } = useAuth()
  const themeStore = useThemeStore()

  const loadUserTheme = async () => {
    await themeStore.loadUserTheme()
  }

  onMounted(() => {
    void loadUserTheme()
  })

  watch(
    () => user.value?.id,
    () => {
      void loadUserTheme()
    }
  )

  return { loadUserTheme }
}
