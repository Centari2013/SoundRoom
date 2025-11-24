import { DEFAULT_THEME } from '@/constants/preferences'

const systemThemeQuery = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null

function prefersDarkScheme() {
  return systemThemeQuery?.matches ?? false
}

function setColorScheme(isDark) {
  const root = document.documentElement
  root.classList.toggle('dark', isDark)
  root.style.colorScheme = isDark ? 'dark' : 'light'
}

export function applyThemePreference(theme = DEFAULT_THEME) {
  const isDark = theme === 'dark' || (theme === 'system' && prefersDarkScheme())
  document.documentElement.dataset.theme = theme
  setColorScheme(isDark)
  return isDark
}

export function onSystemThemeChange(callback) {
  if (!systemThemeQuery || typeof callback !== 'function') return () => {}

  const handler = (event) => callback(event.matches)

  if (typeof systemThemeQuery.addEventListener === 'function') {
    systemThemeQuery.addEventListener('change', handler)
  } else if (typeof systemThemeQuery.addListener === 'function') {
    systemThemeQuery.addListener(handler)
  }

  return () => {
    if (typeof systemThemeQuery.removeEventListener === 'function') {
      systemThemeQuery.removeEventListener('change', handler)
    } else if (typeof systemThemeQuery.removeListener === 'function') {
      systemThemeQuery.removeListener(handler)
    }
  }
}

export function getSystemPrefersDark() {
  return prefersDarkScheme()
}
