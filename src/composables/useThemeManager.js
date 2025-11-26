import { computed, reactive, ref, watch } from 'vue'
import { fetchAllThemes, fetchUserTheme, saveUserTheme } from '@/utils/themeApi'
import { compareTiers } from '@/utils/tierUtils'
import { useAuth } from '@/composables/useAuth'
import { DEFAULT_THEMES, DEFAULT_THEME_NAME } from '@/constants/defaultThemes'

const appliedKeys = new Set()
const state = reactive({
  themes: [...DEFAULT_THEMES],
  selectedThemeId: DEFAULT_THEMES[0]?.id ?? null,
  savedThemeId: null,
  activeTheme: DEFAULT_THEMES[0] ?? null,
  loading: false,
  error: '',
})

const bootstrapped = ref(false)
let bootstrapPromise = null
let watchersReady = false

const root = typeof document !== 'undefined' ? document.documentElement : null

function findTheme(match) {
  if (!match) return null
  return state.themes.find((theme) => theme.id === match || theme.name === match) || null
}

function applyTheme(theme) {
  if (!root || !theme) return null

  appliedKeys.forEach((key) => {
    root.style.removeProperty(key)
  })
  appliedKeys.clear()

  Object.entries(theme.css_vars || {}).forEach(([key, value]) => {
    root.style.setProperty(key, value)
    appliedKeys.add(key)
  })

  root.dataset.theme = theme.name
  root.style.colorScheme = theme.name?.includes('dark') ? 'dark' : 'light'

  state.activeTheme = theme
  state.selectedThemeId = theme.id ?? theme.name
  return theme
}

if (root && DEFAULT_THEMES[0]) {
  applyTheme(DEFAULT_THEMES[0])
}

async function loadThemes() {
  try {
    const data = await fetchAllThemes()
    if (Array.isArray(data) && data.length) {
      state.themes = data
      state.error = ''
      return data
    }
  } catch (error) {
    console.error('Failed to fetch themes', error)
    state.error = 'Unable to load themes from Supabase. Using fallback palettes.'
  }

  state.themes = [...DEFAULT_THEMES]
  return state.themes
}

async function loadUserTheme() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated.value) return null

  const theme = await fetchUserTheme()
  return theme || null
}

function ensureWatchers() {
  if (watchersReady) return

  const { user } = useAuth()
  watch(
    () => user.value?.id,
    () => {
      state.savedThemeId = null
      bootstrapped.value = false
      void bootstrap(true)
    }
  )

  watchersReady = true
}

async function bootstrap(force = false) {
  ensureWatchers()
  if (state.loading) return bootstrapPromise
  if (bootstrapped.value && !force) return bootstrapPromise

  state.loading = true
  bootstrapPromise = (async () => {
    const { isAuthenticated } = useAuth()
    const [themesResult, userThemeResult] = await Promise.allSettled([
      loadThemes(),
      isAuthenticated.value ? loadUserTheme() : Promise.resolve(null),
    ])

    const themeList =
      themesResult.status === 'fulfilled' && Array.isArray(themesResult.value) && themesResult.value.length
        ? themesResult.value
        : [...DEFAULT_THEMES]

    state.themes = themeList

    const userTheme = userThemeResult.status === 'fulfilled' ? userThemeResult.value : null
    if (userThemeResult.status === 'rejected') {
      console.error('Failed to fetch user theme', userThemeResult.reason)
      state.error = state.error || 'Unable to load saved theme.'
    }
    if (userTheme && !findTheme(userTheme.id)) {
      state.themes.push(userTheme)
    }

    const startingTheme = userTheme || findTheme(DEFAULT_THEME_NAME) || state.themes[0]
    state.savedThemeId = userTheme?.id || null

    applyTheme(startingTheme)

    state.loading = false
    bootstrapped.value = true
    bootstrapPromise = null
  })()

  return bootstrapPromise
}

function previewTheme(themeId) {
  const theme = findTheme(themeId)
  if (!theme) return null
  return applyTheme(theme)
}

function resetToSaved() {
  if (state.savedThemeId) {
    return previewTheme(state.savedThemeId)
  }
  const fallback = findTheme(DEFAULT_THEME_NAME) || state.themes[0]
  return previewTheme(fallback?.id ?? fallback?.name)
}

function isThemeLocked(theme) {
  const { tier } = useAuth()
  return compareTiers(tier.value, theme?.required_plan) < 0
}

async function saveSelectedTheme() {
  const { isAuthenticated, tier } = useAuth()
  const theme = findTheme(state.selectedThemeId)

  if (!theme) throw new Error('Select a theme to save.')
  if (!isAuthenticated.value) throw new Error('Sign in to save this theme.')
  if (isThemeLocked(theme)) {
    throw new Error(`Requires ${theme.required_plan?.toUpperCase() || 'PRO'} plan to use. You can still preview it.`)
  }

  await saveUserTheme(theme.id)
  state.savedThemeId = theme.id
  return theme
}

function cycleDefaultThemes() {
  const defaults = state.themes.filter((theme) => theme.name === 'default-dark' || theme.name === 'default-light')
  if (!defaults.length) return null

  const current = findTheme(state.selectedThemeId) || defaults[0]
  const next = defaults.find((theme) => theme.id !== current.id) || defaults[0]
  return previewTheme(next.id)
}

export function useThemeManager() {
  const { isAuthenticated, tier } = useAuth()

  return {
    themes: computed(() => state.themes),
    activeTheme: computed(() => state.activeTheme),
    selectedTheme: computed(() => findTheme(state.selectedThemeId)),
    savedThemeId: computed(() => state.savedThemeId),
    loading: computed(() => state.loading),
    error: computed(() => state.error),
    canSaveSelected: computed(() => {
      const theme = findTheme(state.selectedThemeId)
      if (!theme) return false
      if (!isAuthenticated.value) return false
      return compareTiers(tier.value, theme.required_plan) >= 0
    }),
    previewTheme,
    resetToSaved,
    saveSelectedTheme,
    bootstrap,
    isThemeLocked,
    cycleDefaultThemes,
  }
}
