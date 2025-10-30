// tailwind.config.js
module.exports = {
  important: true,
  theme: {
    extend: {
      backgroundColor: {
        surface: 'var(--sr-surface)',
        panel: 'var(--sr-panel)',
        'panel-raised': 'var(--sr-panelRaised)',
        'panel-overlay': 'var(--sr-panelOverlay)',
        menu: 'var(--sr-menuBackground)',
        overlay: 'var(--sr-overlayBackground)',
        accent: 'var(--sr-accent)'
      },
      textColor: {
        surface: 'var(--sr-textOnSurface)',
        panel: 'var(--sr-textOnPanel)',
        'panel-raised': 'var(--sr-textOnPanelRaised)',
        'panel-overlay': 'var(--sr-textOnPanelOverlay)',
        menu: 'var(--sr-textOnMenu)',
        primary: 'var(--sr-textPrimary)',
        muted: 'var(--sr-textMuted)',
        overlay: 'var(--sr-onOverlayText)',
        accent: 'var(--sr-accent)',
        onAccent: 'var(--sr-accentForeground)'
      },
      borderColor: {
        base: 'var(--sr-border)',
        menu: 'var(--sr-menuBackground)',
        overlay: 'var(--sr-panelOverlay)',
        accent: 'var(--sr-accent)',
        panel: 'var(--sr-panel)'
      },
      divideColor: {
        base: 'var(--sr-border)'
      },
      ringColor: {
        accent: 'var(--sr-accent)'
      }
    }
  }
}
