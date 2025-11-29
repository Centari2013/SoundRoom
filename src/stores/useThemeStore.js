import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  applyTheme,
  applyThemeVars,
  applyThemeVarsFromRemote,
  readPersistedTheme,
  resolveInitialTheme,
} from '@/utils/theme'
import { fetchUserTheme } from '@/utils/themeApi'
import { useAuth } from '@/composables/useAuth'

export const useThemeStore = defineStore('theme', () => {
  const initial = resolveInitialTheme()
  const activeTheme = ref(initial.theme)
  const cssVars = ref(readPersistedTheme().cssVars || {})
  const version = ref(0)
  const loadingUserTheme = ref(false)
  const initialized = ref(false)

  const signature = computed(() => `${activeTheme.value}:${JSON.stringify(cssVars.value || {})}`)

  function bumpVersion() {
    version.value += 1
  }

  function hydrateFromStorage() {
    const { theme, cssVars: persistedCssVars } = resolveInitialTheme()
    activeTheme.value = applyTheme(theme, { persist: false, cssVars: persistedCssVars })
    cssVars.value = persistedCssVars || {}
    initialized.value = true
    bumpVersion()
  }

  function persistState() {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem('theme:state', JSON.stringify({ theme: activeTheme.value, cssVars: cssVars.value || {} }))
      localStorage.setItem('theme', activeTheme.value)
    } catch (error) {
      console.warn('Unable to persist theme state', error)
    }
  }

  function setTheme(theme, { persist = true, clearOverrides = false, overrides } = {}) {
    const nextOverrides = overrides ?? (clearOverrides ? {} : cssVars.value)
    activeTheme.value = applyTheme(theme, {
      persist,
      clearOverrides,
      cssVars: nextOverrides,
    })
    cssVars.value = nextOverrides || {}
    if (persist) persistState()
    bumpVersion()
    return activeTheme.value
  }

  function applyOverrides(vars = {}, { persist = true } = {}) {
    cssVars.value = vars || {}
    applyThemeVars(cssVars.value)
    if (persist) persistState()
    bumpVersion()
  }

  function resetToBase(theme) {
    activeTheme.value = applyTheme(theme || activeTheme.value, { persist: true, clearOverrides: true })
    cssVars.value = {}
    persistState()
    bumpVersion()
  }

  async function loadUserTheme() {
    const { user } = useAuth()
    if (!user.value) {
      resetToBase(activeTheme.value)
      return
    }
    loadingUserTheme.value = true
    try {
      const theme = await fetchUserTheme()
      if (theme?.css_vars) {
        activeTheme.value = applyThemeVarsFromRemote(theme.theme_base || activeTheme.value, theme.css_vars)
        cssVars.value = theme.css_vars
        persistState()
      } else {
        resetToBase(activeTheme.value)
      }
      bumpVersion()
    } catch (error) {
      console.error('Failed to load user theme', error)
    } finally {
      loadingUserTheme.value = false
    }
  }

  function watchAuthTheme() {
    const { user } = useAuth()
    watch(
      () => user.value?.id,
      () => {
        void loadUserTheme()
      },
      { immediate: true }
    )
  }

  return {
    activeTheme,
    cssVars,
    version,
    signature,
    initialized,
    loadingUserTheme,
    hydrateFromStorage,
    setTheme,
    applyOverrides,
    resetToBase,
    loadUserTheme,
    watchAuthTheme,
  }
})
