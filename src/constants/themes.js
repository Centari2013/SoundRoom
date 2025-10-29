export const THEME_AVAILABILITY = {
  none: 0,
  basic: 1,
  pro: 2
}

export const DEFAULT_THEME_ID = 'classic'
export const DEFAULT_COLOR_SCHEME = 'light'
export const SUPPORTED_COLOR_SCHEMES = ['light', 'dark']
const CSS_VAR_PREFIX = '--sr-'

const DEFAULT_NEUTRAL_SCALE = {
  50: '#fafafa',
  100: '#f5f5f5',
  200: '#e5e5e5',
  300: '#d4d4d4',
  400: '#a3a3a3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717',
  950: '#0a0a0a'
}

function resolveSystemColorScheme() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return DEFAULT_COLOR_SCHEME
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '').trim()
  if (normalized.length === 3) {
    const r = normalized[0]
    const g = normalized[1]
    const b = normalized[2]
    return [r, r, g, g, b, b].join('').match(/.{2}/g).map((pair) => parseInt(pair, 16))
  }

  if (normalized.length === 6) {
    return normalized.match(/.{2}/g).map((pair) => parseInt(pair, 16))
  }

  return null
}

function parseColorToRgb(value) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()

  if (trimmed.startsWith('#')) {
    const components = hexToRgb(trimmed)
    return components ? components.join(' ') : null
  }

  const rgbMatch = trimmed.match(/^rgba?\(([^)]+)\)$/i)
  if (rgbMatch) {
    const parts = rgbMatch[1]
      .split(',')
      .map((part) => part.trim())
      .slice(0, 3)
    if (parts.length === 3) {
      return parts.join(' ')
    }
  }

  return null
}

function setCssVariable(root, token, value) {
  root.style.setProperty(`${CSS_VAR_PREFIX}${token}`, value)
  const rgbValue = parseColorToRgb(value)
  if (rgbValue) {
    root.style.setProperty(`${CSS_VAR_PREFIX}${token}-rgb`, rgbValue)
  }
}

export const THEMES = [
  {
    id: 'classic',
    label: 'Classic Neutral',
    description: 'Balanced neutrals that match the existing SoundRoom look and feel.',
    availability: 'none',
    defaultColorScheme: 'light',
    preview: {
      light: ['#f9fafb', '#ffffff', '#2563eb'],
      dark: ['#0b1120', '#111827', '#38bdf8']
    },
    variants: {
      light: {
        label: 'Classic Day',
        isDark: false,
        cssVars: {
          surface: '#f9fafb',
          surfaceMuted: '#e2e8f0',
          panel: '#ffffff',
          panelMuted: '#f3f4f6',
          border: '#e5e7eb',
          accent: '#2563eb',
          accentForeground: '#ffffff',
          textPrimary: '#0f172a',
          textMuted: '#475569'
        },
        neutralScale: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        }
      },
      dark: {
        label: 'Classic Night',
        isDark: true,
        cssVars: {
          surface: '#0b1120',
          surfaceMuted: '#111a2c',
          panel: '#111827',
          panelMuted: '#1f2937',
          border: '#1e293b',
          accent: '#38bdf8',
          accentForeground: '#0f172a',
          textPrimary: '#e2e8f0',
          textMuted: '#94a3b8'
        },
        neutralScale: {
          50: '#e2e8f0',
          100: '#cbd5f5',
          200: '#94a3b8',
          300: '#64748b',
          400: '#475569',
          500: '#334155',
          600: '#1f2a3b',
          700: '#162032',
          800: '#0f172a',
          900: '#0b1120',
          950: '#030712'
        }
      }
    }
  },
  {
    id: 'skyline',
    label: 'Skyline',
    description: 'Airy blues and soft panels for a brighter workspace.',
    availability: 'basic',
    defaultColorScheme: 'light',
    preview: {
      light: ['#f3f4ff', '#0ea5e9', '#1e3a8a'],
      dark: ['#0d1b2a', '#112240', '#38bdf8']
    },
    variants: {
      light: {
        label: 'Skyline Day',
        isDark: false,
        cssVars: {
          surface: '#f3f4ff',
          surfaceMuted: '#e0f2fe',
          panel: '#ffffff',
          panelMuted: '#f0f9ff',
          border: '#c7d2fe',
          accent: '#0ea5e9',
          accentForeground: '#082f49',
          textPrimary: '#0f172a',
          textMuted: '#1e3a8a'
        },
        neutralScale: {
          50: '#f5faff',
          100: '#e8f3ff',
          200: '#d8e9ff',
          300: '#c0dafb',
          400: '#90bae9',
          500: '#5c96d1',
          600: '#3f75b3',
          700: '#285a94',
          800: '#1f4878',
          900: '#1a3a60',
          950: '#132846'
        }
      },
      dark: {
        label: 'Skyline Night',
        isDark: true,
        cssVars: {
          surface: '#0d1b2a',
          surfaceMuted: '#132b3f',
          panel: '#112240',
          panelMuted: '#1d3557',
          border: '#1d3557',
          accent: '#38bdf8',
          accentForeground: '#081226',
          textPrimary: '#e0f2fe',
          textMuted: '#93c5fd'
        },
        neutralScale: {
          50: '#e0f2fe',
          100: '#bae6fd',
          200: '#7dd3fc',
          300: '#38bdf8',
          400: '#0ea5e9',
          500: '#0284c7',
          600: '#0369a1',
          700: '#0b4f7d',
          800: '#123a5a',
          900: '#0b2a42',
          950: '#051a2a'
        }
      }
    }
  },
  {
    id: 'nocturne',
    label: 'Nocturne',
    description: 'Deep violets and high-contrast panels designed for late-night sessions.',
    availability: 'pro',
    defaultColorScheme: 'dark',
    preview: {
      light: ['#f5f3ff', '#7c3aed', '#312e81'],
      dark: ['#0f172a', '#7c3aed', '#f8fafc']
    },
    variants: {
      light: {
        label: 'Nocturne Dawn',
        isDark: false,
        cssVars: {
          surface: '#f5f3ff',
          surfaceMuted: '#ede9fe',
          panel: '#ede9fe',
          panelMuted: '#ddd6fe',
          border: '#c4b5fd',
          accent: '#7c3aed',
          accentForeground: '#f8fafc',
          textPrimary: '#312e81',
          textMuted: '#5b21b6'
        },
        neutralScale: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065'
        }
      },
      dark: {
        label: 'Nocturne Night',
        isDark: true,
        cssVars: {
          surface: '#0f172a',
          surfaceMuted: '#1a1d3b',
          panel: '#111827',
          panelMuted: '#1f2937',
          border: '#1f2937',
          accent: '#7c3aed',
          accentForeground: '#f8fafc',
          textPrimary: '#f8fafc',
          textMuted: '#cbd5f5'
        },
        neutralScale: {
          50: '#ede9fe',
          100: '#ddd6fe',
          200: '#c4b5fd',
          300: '#a78bfa',
          400: '#8b5cf6',
          500: '#7c3aed',
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#3b1678',
          950: '#2a0f57'
        }
      }
    }
  }
]

export const THEME_LOOKUP = THEMES.reduce((lookup, theme) => {
  lookup[theme.id] = theme
  return lookup
}, {})

export function getThemeById(themeId) {
  return THEME_LOOKUP[themeId] ?? THEME_LOOKUP[DEFAULT_THEME_ID]
}

export function getThemeVariant(themeId, colorScheme = DEFAULT_COLOR_SCHEME) {
  const theme = getThemeById(themeId)
  const preferredScheme = SUPPORTED_COLOR_SCHEMES.includes(colorScheme)
    ? colorScheme
    : theme.defaultColorScheme ?? DEFAULT_COLOR_SCHEME

  if (theme.variants?.[preferredScheme]) {
    return theme.variants[preferredScheme]
  }

  const fallbackScheme = theme.defaultColorScheme ?? DEFAULT_COLOR_SCHEME
  if (theme.variants?.[fallbackScheme]) {
    return theme.variants[fallbackScheme]
  }

  const firstVariant = theme.variants
    ? theme.variants[Object.keys(theme.variants)[0]]
    : undefined

  return (
    firstVariant ?? {
      label: theme.label,
      isDark: false,
      cssVars: theme.cssVars ?? {},
      preview:
        Array.isArray(theme.preview) || !theme.preview
          ? theme.preview ?? []
          : theme.preview[theme.defaultColorScheme ?? DEFAULT_COLOR_SCHEME] ?? []
    }
  )
}

export function getThemeAvailabilityRank(level) {
  return THEME_AVAILABILITY[level] ?? THEME_AVAILABILITY.none
}

export function applyThemeVariant(themeId, colorScheme) {
  if (typeof document === 'undefined') {
    return null
  }

  const resolvedScheme =
    colorScheme === 'system' || !colorScheme
      ? resolveSystemColorScheme()
      : colorScheme
  const variant = getThemeVariant(themeId, resolvedScheme)
  const root = document.documentElement
  const body = document.body

  if (!root || !variant) {
    return null
  }

  const cssVars = {
    ...variant.cssVars,
    surfaceMuted: variant.cssVars?.surfaceMuted ?? variant.cssVars?.surface,
    panelMuted: variant.cssVars?.panelMuted ?? variant.cssVars?.panel
  }

  Object.entries(cssVars).forEach(([token, value]) => {
    if (value) {
      setCssVariable(root, token, value)
    }
  })

  const neutralScale = variant.neutralScale ?? DEFAULT_NEUTRAL_SCALE
  Object.entries(neutralScale).forEach(([level, value]) => {
    setCssVariable(root, `neutral-${level}`, value)
  })

  root.dataset.themeId = themeId
  root.dataset.themePreference = colorScheme ?? 'system'
  root.dataset.themeScheme = resolvedScheme
  root.style.colorScheme = variant.isDark ? 'dark' : 'light'
  root.classList.toggle('dark', Boolean(variant.isDark))
  root.classList.toggle('sr-dark', Boolean(variant.isDark))

  if (variant.cssVars?.surface) {
    root.style.backgroundColor = variant.cssVars.surface
    if (body) {
      body.style.backgroundColor = variant.cssVars.surface
    }
  }

  if (variant.cssVars?.textPrimary && body) {
    body.style.color = variant.cssVars.textPrimary
  }

  return {
    themeId,
    colorScheme: resolvedScheme,
    variant
  }
}
