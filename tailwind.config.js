const plugin = require('tailwindcss/plugin')

const resolveVar = (token) => () => `var(${token})`

module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  important: false,
  corePlugins: {
    borderWidth: false,
  },
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      white: resolveVar('--base-white'),
      black: resolveVar('--base-black'),
      surface: {
        app: resolveVar('--color-bg-app'),
        base: resolveVar('--color-bg-surface'),
        raised: resolveVar('--color-bg-elevated'),
      },
      border: {
        subtle: resolveVar('--color-border-subtle'),
        strong: resolveVar('--color-border-strong'),
      },
      text: {
        primary: resolveVar('--color-text-primary'),
        secondary: resolveVar('--color-text-secondary'),
        muted: resolveVar('--color-text-muted'),
        inverse: resolveVar('--color-text-inverse'),
      },
      accent: {
        soft: resolveVar('--color-accent-soft'),
        DEFAULT: resolveVar('--color-accent'),
        strong: resolveVar('--color-accent-strong'),
      },
      status: {
        success: resolveVar('--color-success'),
        warning: resolveVar('--color-warning'),
        danger: resolveVar('--color-danger'),
      },
      panel: resolveVar('--color-panel'),
      input: resolveVar('--color-input'),
    },
    extend: {
      boxShadow: {
        soft: 'var(--color-shadow-soft)',
        strong: 'var(--color-shadow-strong)',
      },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        '.sr-border': { borderWidth: '1px', borderStyle: 'solid' },
        '.sr-border-2': { borderWidth: '2px', borderStyle: 'solid' },
        '.sr-border-none': { borderWidth: '0' },
        '.sr-border-t': { borderTopWidth: '1px', borderStyle: 'solid' },
        '.sr-border-r': { borderRightWidth: '1px', borderStyle: 'solid' },
        '.sr-border-b': { borderBottomWidth: '1px', borderStyle: 'solid' },
        '.sr-border-l': { borderLeftWidth: '1px', borderStyle: 'solid' },
        '.sr-border-subtle': { borderColor: 'rgb(var(--color-border-subtle-rgb) / 1)' },
        '.sr-border-strong': { borderColor: 'rgb(var(--color-border-strong-rgb) / 1)' },
      })
    }),
  ],
}
