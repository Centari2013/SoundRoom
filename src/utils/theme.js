const THEME_KEY = 'theme'
const DEFAULT_THEME = 'dark'

export const SUPPORTED_THEMES = ['dark', 'light']

const tieredOverrides = {
  active: {}
}

function resolveInitialTheme() {
  if (typeof window === 'undefined') return DEFAULT_THEME

  const stored = localStorage.getItem(THEME_KEY)
  if (SUPPORTED_THEMES.includes(stored)) return stored

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  if (typeof prefersDark === 'boolean') {
    return prefersDark ? 'dark' : 'light'
  }

  return DEFAULT_THEME
}

function applyTheme(theme, { persist = true, clearOverrides = false } = {}) {
  const normalized = SUPPORTED_THEMES.includes(theme) ? theme : DEFAULT_THEME
  const root = document.documentElement
  root.dataset.theme = normalized
  root.classList.toggle('dark', normalized === 'dark')
  if (clearOverrides) clearThemeVars()
  if (persist && typeof localStorage !== 'undefined') {
    localStorage.setItem(THEME_KEY, normalized)
  }
  return normalized
}

export function initTheme() {
  const initial = resolveInitialTheme()
  return applyTheme(initial)
}

export function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'
  return applyTheme(next)
}

export function setTheme(theme, options = {}) {
  return applyTheme(theme, options)
}

export function getTheme() {
  return document.documentElement.dataset.theme || DEFAULT_THEME
}

export function getAvailableThemes() {
  return [...SUPPORTED_THEMES]
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

export function mergeCssVars(baseVars = {}, overrideVars = {}) {
  return { ...baseVars, ...overrideVars }
}
