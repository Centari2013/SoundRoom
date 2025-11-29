const THEME_KEY = 'theme'
const THEME_STATE_KEY = 'theme:state'
export const DEFAULT_THEME = 'dark'

export const SUPPORTED_THEMES = ['dark', 'light']

const tieredOverrides = {
  active: {},
}

function normalizeTheme(theme) {
  return SUPPORTED_THEMES.includes(theme) ? theme : DEFAULT_THEME
}

function persistThemeState(theme, cssVars = {}) {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(
      THEME_STATE_KEY,
      JSON.stringify({
        theme: normalizeTheme(theme),
        cssVars: cssVars || {},
      })
    )
    localStorage.setItem(THEME_KEY, normalizeTheme(theme))
  } catch (error) {
    console.warn('Unable to persist theme', error)
  }
}

export function readPersistedTheme() {
  if (typeof localStorage === 'undefined') return { theme: DEFAULT_THEME, cssVars: {} }

  try {
    const storedState = localStorage.getItem(THEME_STATE_KEY)
    if (storedState) {
      const parsed = JSON.parse(storedState)
      return {
        theme: normalizeTheme(parsed.theme) || DEFAULT_THEME,
        cssVars: parsed.cssVars || {},
      }
    }

    const legacy = localStorage.getItem(THEME_KEY)
    if (legacy) {
      return { theme: normalizeTheme(legacy), cssVars: {} }
    }
  } catch (error) {
    console.warn('Unable to read persisted theme', error)
  }

  return { theme: DEFAULT_THEME, cssVars: {} }
}

export function resolveInitialTheme() {
  if (typeof window === 'undefined') return { theme: DEFAULT_THEME, cssVars: {} }

  const persisted = readPersistedTheme()
  if (persisted?.theme) return persisted

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  if (typeof prefersDark === 'boolean') {
    return { theme: prefersDark ? 'dark' : 'light', cssVars: {} }
  }

  return { theme: DEFAULT_THEME, cssVars: {} }
}

export function applyThemeVars(vars = {}) {
  const root = document.documentElement
  Object.keys(tieredOverrides.active || {}).forEach((key) => {
    root.style.removeProperty(key)
  })

  tieredOverrides.active = vars || {}
  Object.entries(tieredOverrides.active).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}

export function clearThemeVars() {
  const root = document.documentElement
  Object.keys(tieredOverrides.active || {}).forEach((key) => {
    root.style.removeProperty(key)
  })
  tieredOverrides.active = {}
}

export function applyTheme(theme, { persist = true, clearOverrides = false, cssVars } = {}) {
  const normalized = normalizeTheme(theme)
  const root = document.documentElement
  root.dataset.theme = normalized
  root.classList.toggle('dark', normalized === 'dark')

  if (clearOverrides) {
    clearThemeVars()
  }

  if (cssVars) {
    applyThemeVars(cssVars)
  }

  if (persist && typeof localStorage !== 'undefined') {
    persistThemeState(normalized, cssVars ?? tieredOverrides.active)
  }

  return normalized
}

export function setTheme(theme, options = {}) {
  return applyTheme(theme, options)
}

export function getTheme() {
  return document.documentElement.dataset.theme || DEFAULT_THEME
}

export function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'
  return applyTheme(next)
}

export function mergeCssVars(baseVars = {}, overrideVars = {}) {
  return { ...baseVars, ...overrideVars }
}

export function restorePersistentTheme() {
  const persisted = readPersistedTheme()
  applyTheme(persisted.theme, { persist: false })
  applyThemeVars(persisted.cssVars)
}

export function initThemeFromStorage() {
  const { theme, cssVars } = resolveInitialTheme()
  applyTheme(theme, { persist: false })
  applyThemeVars(cssVars)
  return theme
}

export function applyThemeVarsFromRemote(theme, cssVars = {}, { persist = true } = {}) {
  const normalized = applyTheme(theme, { persist, clearOverrides: true })
  applyThemeVars(cssVars)
  if (persist) persistThemeState(normalized, cssVars)
  return normalized
}

export function getAvailableThemes() {
  return [...SUPPORTED_THEMES]
}

export function previewThemeBase(theme) {
  return normalizeTheme(theme)
}
