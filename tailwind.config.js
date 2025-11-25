// tailwind.config.js
const withAlpha = (variable) => `rgb(var(${variable}) / <alpha-value>)`

module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  important: true,
  theme: {
    extend: {
      colors: {
        transparent: 'transparent',
        current: 'currentColor',
        white: withAlpha('--base-white-rgb'),
        black: withAlpha('--base-black-rgb'),
        focus: {
          ring: withAlpha('--color-focus-ring-rgb'),
        },
        disabled: {
          bg: 'var(--color-disabled-bg)',
          text: 'var(--color-disabled-text)',
        },
        surface: {
          app: withAlpha('--color-bg-app-rgb'),
          base: withAlpha('--color-bg-surface-rgb'),
          raised: withAlpha('--color-bg-elevated-rgb'),
          muted: 'var(--color-surface-muted)',
        },
        border: {
          subtle: withAlpha('--color-border-subtle-rgb'),
          strong: withAlpha('--color-border-strong-rgb'),
        },
        text: {
          primary: withAlpha('--color-text-primary-rgb'),
          secondary: withAlpha('--color-text-secondary-rgb'),
          muted: withAlpha('--color-text-muted-rgb'),
          inverse: withAlpha('--color-text-inverse-rgb'),
        },
        accent: {
          soft: withAlpha('--color-accent-soft-rgb'),
          DEFAULT: withAlpha('--color-accent-rgb'),
          strong: withAlpha('--color-accent-strong-rgb'),
        },
        status: {
          success: withAlpha('--color-success-rgb'),
          warning: withAlpha('--color-warning-rgb'),
          danger: withAlpha('--color-danger-rgb'),
        },
        panel: withAlpha('--color-panel-rgb'),
        input: withAlpha('--color-input-rgb'),
      },
      boxShadow: {
        soft: 'var(--color-shadow-soft)',
        strong: 'var(--color-shadow-strong)',
      },
    },
  },
}
