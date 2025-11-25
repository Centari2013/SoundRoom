module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  important: true,
  theme: {
    extend: {
      colors: {
        transparent: 'transparent',
        current: 'currentColor',
        white: 'var(--base-white)',
        black: 'var(--base-black)',
        surface: {
          app: 'var(--color-bg-app)',
          base: 'var(--color-bg-surface)',
          raised: 'var(--color-bg-elevated)',
        },
        border: {
          subtle: 'var(--color-border-subtle)',
          strong: 'var(--color-border-strong)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          inverse: 'var(--color-text-inverse)',
        },
        accent: {
          soft: 'var(--color-accent-soft)',
          DEFAULT: 'var(--color-accent)',
          strong: 'var(--color-accent-strong)',
        },
        status: {
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
          danger: 'var(--color-danger)',
        },
        panel: 'var(--color-panel)',
        input: 'var(--color-input)',
      },
      boxShadow: {
        soft: 'var(--color-shadow-soft)',
        strong: 'var(--color-shadow-strong)',
      },
    },
  },
}
