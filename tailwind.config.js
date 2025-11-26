const resolveVar = (token) => () => `var(${token})`

module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  important: false,
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
}
