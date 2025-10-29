import {
  applyThemeVariant,
  DEFAULT_THEME_ID,
  SUPPORTED_COLOR_SCHEMES
} from '@/constants/themes.js'

const url = new URL(window.location.href)
const queryTheme = url.searchParams.get('theme')?.trim()
const queryScheme = url.searchParams.get('scheme')?.trim()?.toLowerCase()

const initialThemeId = queryTheme && queryTheme.length ? queryTheme : DEFAULT_THEME_ID
const initialScheme =
  queryScheme && (SUPPORTED_COLOR_SCHEMES.includes(queryScheme) || queryScheme === 'system')
    ? queryScheme
    : 'system'

let activeTheme = initialThemeId
let activeScheme = initialScheme
let systemMediaQuery = null

function apply(themeId = activeTheme, scheme = activeScheme) {
  activeTheme = themeId
  activeScheme = scheme

  const result = applyThemeVariant(themeId, scheme)

  const store = window.__SOUNDROOM_THEME__?.store
  if (store && (store.themeId !== themeId || store.colorSchemePreference !== scheme)) {
    store.apply(themeId, scheme)
  }

  if (systemMediaQuery) {
    if (typeof systemMediaQuery.removeEventListener === 'function') {
      systemMediaQuery.removeEventListener('change', handleSystemSchemeChange)
    } else if (typeof systemMediaQuery.removeListener === 'function') {
      systemMediaQuery.removeListener(handleSystemSchemeChange)
    }
    systemMediaQuery = null
  }

  if (!scheme || scheme === 'system') {
    if (typeof window.matchMedia === 'function') {
      systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      if (typeof systemMediaQuery.addEventListener === 'function') {
        systemMediaQuery.addEventListener('change', handleSystemSchemeChange)
      } else if (typeof systemMediaQuery.addListener === 'function') {
        systemMediaQuery.addListener(handleSystemSchemeChange)
      }
    }
  }

  return result
}

function handleSystemSchemeChange() {
  applyThemeVariant(activeTheme, 'system')
}

apply(initialThemeId, initialScheme)

window.__SOUNDROOM_THEME__ = {
  apply,
  get activeTheme() {
    return activeTheme
  },
  get activeScheme() {
    return activeScheme
  },
  reset() {
    apply(DEFAULT_THEME_ID, 'system')
  }
}
