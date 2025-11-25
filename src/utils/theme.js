const THEME_KEY = 'theme'
const DEFAULT_THEME = 'dark'

export const SUPPORTED_THEMES = ['dark', 'light']

function resolveInitialTheme() {
  if (typeof window === 'undefined') return DEFAULT_THEME

  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light') return stored

  return DEFAULT_THEME
}

function applyTheme(theme) {
  const normalized = SUPPORTED_THEMES.includes(theme) ? theme : DEFAULT_THEME
  const root = document.documentElement
  root.dataset.theme = normalized
  localStorage.setItem(THEME_KEY, normalized)
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

export function setTheme(theme) {
  return applyTheme(theme)
}

export function getTheme() {
  return document.documentElement.dataset.theme || DEFAULT_THEME
}

export function getAvailableThemes() {
  return [...SUPPORTED_THEMES]
}
