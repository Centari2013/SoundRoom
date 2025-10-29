export const THEME_AVAILABILITY = {
  none: 0,
  basic: 1,
  pro: 2
}

export const DEFAULT_THEME_ID = 'classic'

export const THEMES = [
  {
    id: 'classic',
    label: 'Classic Neutral',
    description: 'Balanced neutrals that match the existing SoundRoom look and feel.',
    availability: 'none',
    isDark: false,
    cssVars: {
      surface: '#f9fafb',
      panel: '#ffffff',
      border: '#e5e7eb',
      accent: '#2563eb',
      accentForeground: '#ffffff',
      textPrimary: '#0f172a',
      textMuted: '#475569'
    },
    preview: ['#f9fafb', '#ffffff', '#2563eb']
  },
  {
    id: 'skyline',
    label: 'Skyline',
    description: 'Airy blues and soft panels for a brighter workspace.',
    availability: 'basic',
    isDark: false,
    cssVars: {
      surface: '#f3f4ff',
      panel: '#ffffff',
      border: '#c7d2fe',
      accent: '#0ea5e9',
      accentForeground: '#ffffff',
      textPrimary: '#0f172a',
      textMuted: '#1e3a8a'
    },
    preview: ['#f3f4ff', '#0ea5e9', '#1e3a8a']
  },
  {
    id: 'nocturne',
    label: 'Nocturne',
    description: 'Deep violets and high-contrast panels designed for late-night sessions.',
    availability: 'pro',
    isDark: true,
    cssVars: {
      surface: '#0f172a',
      panel: '#111827',
      border: '#1f2937',
      accent: '#7c3aed',
      accentForeground: '#f8fafc',
      textPrimary: '#f8fafc',
      textMuted: '#cbd5f5'
    },
    preview: ['#0f172a', '#7c3aed', '#f8fafc']
  }
]

export const THEME_LOOKUP = THEMES.reduce((lookup, theme) => {
  lookup[theme.id] = theme
  return lookup
}, {})

export function getThemeById(themeId) {
  return THEME_LOOKUP[themeId] ?? THEME_LOOKUP[DEFAULT_THEME_ID]
}

export function getThemeAvailabilityRank(level) {
  return THEME_AVAILABILITY[level] ?? THEME_AVAILABILITY.none
}
