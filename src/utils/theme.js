const THEME_STORAGE_KEY = 'soundroom.themePreference'
const DARK_QUERY = '(prefers-color-scheme: dark)'

const VALID_THEMES = ['light', 'dark', 'system']

export function getStoredThemePreference() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return VALID_THEMES.includes(stored) ? stored : 'system'
}

export function persistThemePreference(preference) {
  if (!VALID_THEMES.includes(preference)) {
    return
  }
  localStorage.setItem(THEME_STORAGE_KEY, preference)
}

export function getSystemTheme() {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

export function resolveTheme(preference) {
  if (!VALID_THEMES.includes(preference)) {
    return getSystemTheme()
  }
  return preference === 'system' ? getSystemTheme() : preference
}

export function applyTheme(preference) {
  const theme = resolveTheme(preference)
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

export function initializeTheme(preference = getStoredThemePreference()) {
  applyTheme(preference)

  if (preference !== 'system') {
    return () => {}
  }

  const media = window.matchMedia(DARK_QUERY)
  const handleChange = (event) => {
    const nextTheme = event.matches ? 'dark' : 'light'
    const root = document.documentElement
    root.classList.toggle('dark', nextTheme === 'dark')
    root.style.colorScheme = nextTheme
  }

  media.addEventListener('change', handleChange)

  return () => media.removeEventListener('change', handleChange)
}
