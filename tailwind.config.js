const withOpacity = (variable) => ({ opacityValue } = {}) => {
  if (opacityValue === undefined) {
    return `rgb(var(${variable}) / 1)`
  }

  return `rgb(var(${variable}) / ${opacityValue})`
}

module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        neutral: {
          50: withOpacity('--sr-neutral-50-rgb'),
          100: withOpacity('--sr-neutral-100-rgb'),
          200: withOpacity('--sr-neutral-200-rgb'),
          300: withOpacity('--sr-neutral-300-rgb'),
          400: withOpacity('--sr-neutral-400-rgb'),
          500: withOpacity('--sr-neutral-500-rgb'),
          600: withOpacity('--sr-neutral-600-rgb'),
          700: withOpacity('--sr-neutral-700-rgb'),
          800: withOpacity('--sr-neutral-800-rgb'),
          900: withOpacity('--sr-neutral-900-rgb'),
          950: withOpacity('--sr-neutral-950-rgb')
        },
        surface: withOpacity('--sr-surface-rgb'),
        'surface-muted': withOpacity('--sr-surface-muted-rgb'),
        panel: withOpacity('--sr-panel-rgb'),
        'panel-muted': withOpacity('--sr-panel-muted-rgb'),
        accent: withOpacity('--sr-accent-rgb'),
        'accent-foreground': withOpacity('--sr-accentForeground-rgb')
      },
      backgroundColor: {
        surface: withOpacity('--sr-surface-rgb'),
        'surface-muted': withOpacity('--sr-surface-muted-rgb'),
        panel: withOpacity('--sr-panel-rgb'),
        'panel-muted': withOpacity('--sr-panel-muted-rgb'),
        accent: withOpacity('--sr-accent-rgb')
      },
      textColor: {
        primary: withOpacity('--sr-textPrimary-rgb'),
        muted: withOpacity('--sr-textMuted-rgb'),
        accent: withOpacity('--sr-accent-rgb'),
        'accent-foreground': withOpacity('--sr-accentForeground-rgb')
      },
      borderColor: {
        border: withOpacity('--sr-border-rgb'),
        accent: withOpacity('--sr-accent-rgb')
      },
      ringColor: {
        accent: withOpacity('--sr-accent-rgb'),
        border: withOpacity('--sr-border-rgb')
      },
      divideColor: {
        border: withOpacity('--sr-border-rgb')
      },
      fill: {
        accent: withOpacity('--sr-accent-rgb'),
        muted: withOpacity('--sr-textMuted-rgb')
      },
      stroke: {
        accent: withOpacity('--sr-accent-rgb'),
        muted: withOpacity('--sr-textMuted-rgb')
      }
    }
  },
  plugins: []
}
