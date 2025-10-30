// tailwind.config.js
module.exports = {
  important: true,
  theme: {
    extend: {
      backgroundColor: {
        surface: 'var(--sr-surface)',
        panel: 'var(--sr-panel)',
        overlay: 'var(--sr-overlayBackground)',
        accent: 'var(--sr-accent)'
      },
      textColor: {
        surface: 'var(--sr-textOnSurface)',
        panel: 'var(--sr-textOnPanel)',
        primary: 'var(--sr-textPrimary)',
        muted: 'var(--sr-textMuted)',
        overlay: 'var(--sr-onOverlayText)',
        accent: 'var(--sr-accent)',
        onAccent: 'var(--sr-accentForeground)'
      },
      borderColor: {
        base: 'var(--sr-border)',
        accent: 'var(--sr-accent)',
        panel: 'var(--sr-panel)'
      },
      ringColor: {
        accent: 'var(--sr-accent)'
      }
    }
  }
}
