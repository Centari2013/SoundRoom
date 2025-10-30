export const THEME_AVAILABILITY = {
  none: 0,
  basic: 1,
  pro: 2
}

export const DEFAULT_THEME_ID = 'classic'
export const DEFAULT_COLOR_SCHEME = 'light'
export const SUPPORTED_COLOR_SCHEMES = ['light', 'dark']
const CSS_VAR_PREFIX = '--sr-'

function resolveSystemColorScheme() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return DEFAULT_COLOR_SCHEME
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
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
          panel: '#ffffff',
          panelRaised: '#ffffff',
          textOnPanelRaised: '#0f172a',
          panelOverlay: 'rgba(248, 250, 252, 0.85)',
          textOnPanelOverlay: '#0f172a',
          menuBackground: '#ffffff',
          textOnMenu: '#0f172a',
          border: '#e5e7eb',
          accent: '#2563eb',
          accentForeground: '#ffffff',
          textPrimary: '#0f172a',
          textMuted: '#475569',
          textOnSurface: '#0f172a',
          textOnPanel: '#0f172a',
          overlayBackground: '#1f2937',
          onOverlayText: '#f8fafc'
        }
      },
      dark: {
        label: 'Classic Night',
        isDark: true,
        cssVars: {
          surface: '#0b1120',
          panel: '#111827',
          panelRaised: '#1f2937',
          textOnPanelRaised: '#f8fafc',
          panelOverlay: 'rgba(15, 23, 42, 0.75)',
          textOnPanelOverlay: '#f8fafc',
          menuBackground: '#1f2937',
          textOnMenu: '#f8fafc',
          border: '#1e293b',
          accent: '#38bdf8',
          accentForeground: '#0f172a',
          textPrimary: '#e2e8f0',
          textMuted: '#94a3b8',
          textOnSurface: '#e2e8f0',
          textOnPanel: '#f8fafc',
          overlayBackground: '#111827',
          onOverlayText: '#f8fafc'
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
          panel: '#ffffff',
          panelRaised: '#ffffff',
          textOnPanelRaised: '#0f172a',
          panelOverlay: 'rgba(240, 249, 255, 0.85)',
          textOnPanelOverlay: '#0f172a',
          menuBackground: '#ffffff',
          textOnMenu: '#0f172a',
          border: '#c7d2fe',
          accent: '#0ea5e9',
          accentForeground: '#082f49',
          textPrimary: '#0f172a',
          textMuted: '#1e3a8a',
          textOnSurface: '#0f172a',
          textOnPanel: '#0f172a',
          overlayBackground: '#1e3a8a',
          onOverlayText: '#f8fafc'
        }
      },
      dark: {
        label: 'Skyline Night',
        isDark: true,
        cssVars: {
          surface: '#0d1b2a',
          panel: '#112240',
          panelRaised: '#1d3557',
          textOnPanelRaised: '#e0f2fe',
          panelOverlay: 'rgba(13, 27, 42, 0.78)',
          textOnPanelOverlay: '#f8fafc',
          menuBackground: '#112240',
          textOnMenu: '#f8fafc',
          border: '#1d3557',
          accent: '#38bdf8',
          accentForeground: '#081226',
          textPrimary: '#e0f2fe',
          textMuted: '#93c5fd',
          textOnSurface: '#e0f2fe',
          textOnPanel: '#f8fafc',
          overlayBackground: '#112240',
          onOverlayText: '#f8fafc'
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
          panel: '#ede9fe',
          panelRaised: '#ffffff',
          textOnPanelRaised: '#1e1b4b',
          panelOverlay: 'rgba(237, 233, 254, 0.88)',
          textOnPanelOverlay: '#1e1b4b',
          menuBackground: '#ede9fe',
          textOnMenu: '#1e1b4b',
          border: '#ddd6fe',
          accent: '#7c3aed',
          accentForeground: '#f8fafc',
          textPrimary: '#312e81',
          textMuted: '#5b21b6',
          textOnSurface: '#1e1b4b',
          textOnPanel: '#1e1b4b',
          overlayBackground: '#312e81',
          onOverlayText: '#f8fafc'
        }
      },
      dark: {
        label: 'Nocturne Night',
        isDark: true,
        cssVars: {
          surface: '#0f172a',
          panel: '#111827',
          panelRaised: '#1e1b4b',
          textOnPanelRaised: '#f4f1ff',
          panelOverlay: 'rgba(17, 24, 39, 0.78)',
          textOnPanelOverlay: '#f8fafc',
          menuBackground: '#161b33',
          textOnMenu: '#f4f1ff',
          border: '#1f2937',
          accent: '#7c3aed',
          accentForeground: '#f8fafc',
          textPrimary: '#f8fafc',
          textMuted: '#cbd5f5',
          textOnSurface: '#f8fafc',
          textOnPanel: '#f4f1ff',
          overlayBackground: '#111827',
          onOverlayText: '#f8fafc'
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

  const resolvedCssVars = {
    ...(variant.cssVars ?? {})
  }

  if (!resolvedCssVars.textOnSurface && resolvedCssVars.textPrimary) {
    resolvedCssVars.textOnSurface = resolvedCssVars.textPrimary
  }

  if (!resolvedCssVars.textOnPanel && resolvedCssVars.textOnSurface) {
    resolvedCssVars.textOnPanel = resolvedCssVars.textOnSurface
  }

  if (!resolvedCssVars.panelRaised && resolvedCssVars.panel) {
    resolvedCssVars.panelRaised = resolvedCssVars.panel
  }

  if (!resolvedCssVars.textOnPanelRaised && resolvedCssVars.textOnPanel) {
    resolvedCssVars.textOnPanelRaised = resolvedCssVars.textOnPanel
  }

  if (!resolvedCssVars.panelOverlay) {
    resolvedCssVars.panelOverlay =
      resolvedCssVars.overlayBackground ?? resolvedCssVars.panelRaised ?? resolvedCssVars.panel
  }

  if (!resolvedCssVars.textOnPanelOverlay) {
    resolvedCssVars.textOnPanelOverlay =
      resolvedCssVars.onOverlayText ?? resolvedCssVars.textOnPanelRaised ?? resolvedCssVars.textOnPanel
  }

  if (!resolvedCssVars.menuBackground) {
    resolvedCssVars.menuBackground = resolvedCssVars.panelRaised ?? resolvedCssVars.panel
  }

  if (!resolvedCssVars.textOnMenu) {
    resolvedCssVars.textOnMenu =
      resolvedCssVars.textOnPanelRaised ?? resolvedCssVars.textOnPanel ?? resolvedCssVars.textOnSurface
  }

  if (!resolvedCssVars.overlayBackground && resolvedCssVars.panel) {
    resolvedCssVars.overlayBackground = resolvedCssVars.panel
  }

  if (!resolvedCssVars.onOverlayText && resolvedCssVars.textOnPanel) {
    resolvedCssVars.onOverlayText = resolvedCssVars.textOnPanel
  }

  Object.entries(resolvedCssVars).forEach(([token, value]) => {
    root.style.setProperty(`${CSS_VAR_PREFIX}${token}`, value)
  })

  root.dataset.themeId = themeId
  root.dataset.themePreference = colorScheme ?? 'system'
  root.dataset.themeScheme = resolvedScheme
  root.style.colorScheme = variant.isDark ? 'dark' : 'light'
  root.classList.toggle('dark', Boolean(variant.isDark))
  root.classList.toggle('sr-dark', Boolean(variant.isDark))

  if (resolvedCssVars.surface) {
    root.style.backgroundColor = resolvedCssVars.surface
    if (body) {
      body.style.backgroundColor = resolvedCssVars.surface
    }
  }

  if (body) {
    const bodyTextColor =
      resolvedCssVars.textOnSurface ?? resolvedCssVars.textPrimary ?? body.style.color
    if (bodyTextColor) {
      body.style.color = bodyTextColor
    }
  }

  return {
    themeId,
    colorScheme: resolvedScheme,
    variant
  }
}
