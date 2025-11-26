import { onMounted, watch } from 'vue'
import { fetchUserTheme } from '@/utils/themeApi'
import { applyThemeVars, clearThemeVars } from '@/utils/theme'
import { useAuth } from '@/composables/useAuth'

export function useThemeBootstrap() {
  const { user } = useAuth()

  const loadUserTheme = async () => {
    try {
      if (!user.value) {
        clearThemeVars()
        return
      }

      const theme = await fetchUserTheme()
      if (theme?.css_vars) {
        applyThemeVars(theme.css_vars)
      } else {
        clearThemeVars()
      }
    } catch (error) {
      console.error('Failed to load user theme', error)
    }
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
