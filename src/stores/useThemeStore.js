import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  applyThemeVariant,
  DEFAULT_COLOR_SCHEME,
  DEFAULT_THEME_ID,
  getThemeById,
  SUPPORTED_COLOR_SCHEMES,
  THEMES
} from '@/constants/themes'

const STORAGE_KEY = 'soundroom:theme-preference'
let systemMediaQuery = null

function removeSystemListener() {
  if (!systemMediaQuery) {
    return
  }

  if (typeof systemMediaQuery.removeEventListener === 'function') {
    systemMediaQuery.removeEventListener('change', handleSystemChange)
  } else if (typeof systemMediaQuery.removeListener === 'function') {
    systemMediaQuery.removeListener(handleSystemChange)
  }

  systemMediaQuery = null
}

function handleSystemChange() {
  const store = useThemeStore()
  store.apply(store.themeId, 'system')
}

export const useThemeStore = defineStore('theme', () => {
  const themeId = ref(DEFAULT_THEME_ID)
  const colorSchemePreference = ref('system')
  const resolvedScheme = ref(DEFAULT_COLOR_SCHEME)
  const appliedVariant = ref(null)

  function persist() {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const payload = {
        themeId: themeId.value,
        scheme: colorSchemePreference.value
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch (error) {
      console.warn('Failed to persist theme preference', error)
    }
  }

  function normalizeScheme(preference) {
    if (!preference || preference === 'system') {
      return 'system'
    }

    return SUPPORTED_COLOR_SCHEMES.includes(preference) ? preference : DEFAULT_COLOR_SCHEME
  }

  function attachSystemListener() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    if (systemMediaQuery === mediaQuery) {
      return
    }

    removeSystemListener()
    systemMediaQuery = mediaQuery

    if (typeof systemMediaQuery.addEventListener === 'function') {
      systemMediaQuery.addEventListener('change', handleSystemChange)
    } else if (typeof systemMediaQuery.addListener === 'function') {
      systemMediaQuery.addListener(handleSystemChange)
    }
  }

  function apply(theme = themeId.value, scheme = colorSchemePreference.value) {
    const result = applyThemeVariant(theme, scheme)
    if (!result) {
      return null
    }

    themeId.value = result.themeId
    resolvedScheme.value = result.colorScheme
    appliedVariant.value = result.variant

    if (!scheme || scheme === 'system') {
      attachSystemListener()
    } else {
      removeSystemListener()
    }

    persist()
    return result
  }

  function setTheme(newThemeId) {
    return apply(newThemeId, colorSchemePreference.value)
  }

  function setColorScheme(preference) {
    const normalized = normalizeScheme(preference)
    colorSchemePreference.value = normalized
    return apply(themeId.value, normalized)
  }

  function initialize(options = {}) {
    if (typeof window === 'undefined') {
      return
    }

    let stored = null
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      stored = raw ? JSON.parse(raw) : null
    } catch (error) {
      stored = null
    }

    const root = document.documentElement
    const initialTheme =
      options.themeId ?? stored?.themeId ?? root?.dataset.themeId ?? DEFAULT_THEME_ID
    const initialScheme = normalizeScheme(
      options.scheme ?? stored?.scheme ?? root?.dataset.themePreference ?? 'system'
    )

    themeId.value = initialTheme
    colorSchemePreference.value = initialScheme

    const result = apply(initialTheme, initialScheme)
    if (!result) {
      apply(DEFAULT_THEME_ID, 'system')
    }
  }

  function reset() {
    colorSchemePreference.value = 'system'
    apply(DEFAULT_THEME_ID, 'system')
  }

  const currentTheme = computed(() => getThemeById(themeId.value))
  const availableThemes = computed(() => THEMES)
  const isDark = computed(() => Boolean(appliedVariant.value?.isDark))

  return {
    themeId,
    colorSchemePreference,
    resolvedScheme,
    appliedVariant,
    availableThemes,
    currentTheme,
    isDark,
    initialize,
    apply,
    setTheme,
    setColorScheme,
    reset
  }
})

