import { THEMES } from '../src/constants/themes.js'

const REQUIRED_PAIRINGS = [
  { foreground: 'textOnSurface', background: 'surface', label: 'surface text' },
  { foreground: 'textOnPanel', background: 'panel', label: 'panel text' },
  { foreground: 'accentForeground', background: 'accent', label: 'accent foreground' },
  { foreground: 'onOverlayText', background: 'overlayBackground', label: 'overlay text' }
]

function hexToRgb(hex) {
  const normalized = hex.trim()
  if (!/^#([\da-f]{3}|[\da-f]{6})$/i.test(normalized)) {
    throw new Error(`Unsupported color format: ${hex}`)
  }

  const value = normalized.slice(1)
  const chunk = value.length === 3 ? value.split('').map((c) => c + c).join('') : value
  const intVal = parseInt(chunk, 16)
  return {
    r: (intVal >> 16) & 0xff,
    g: (intVal >> 8) & 0xff,
    b: intVal & 0xff
  }
}

function relativeLuminance({ r, g, b }) {
  const srgb = [r, g, b].map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
}

function contrastRatio(foreground, background) {
  const fg = relativeLuminance(hexToRgb(foreground))
  const bg = relativeLuminance(hexToRgb(background))

  const light = Math.max(fg, bg)
  const dark = Math.min(fg, bg)

  return (light + 0.05) / (dark + 0.05)
}

const failures = []

for (const theme of THEMES) {
  const variants = theme.variants ?? {}
  for (const [scheme, variant] of Object.entries(variants)) {
    const vars = variant.cssVars ?? {}
    for (const pairing of REQUIRED_PAIRINGS) {
      const foreground = vars[pairing.foreground]
      const background = vars[pairing.background]
      if (!foreground || !background) {
        failures.push(
          `${theme.id}.${scheme} is missing ${pairing.foreground} or ${pairing.background}`
        )
        continue
      }

      try {
        const ratio = contrastRatio(foreground, background)
        if (ratio < 4.5) {
          failures.push(
            `${theme.id}.${scheme} ${pairing.label} contrast is ${ratio.toFixed(2)} (< 4.5)`
          )
        }
      } catch (error) {
        failures.push(
          `${theme.id}.${scheme} has invalid colors for ${pairing.label}: ${error.message}`
        )
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Theme contrast check failed:')
  failures.forEach((failure) => console.error(` • ${failure}`))
  process.exit(1)
}

console.log('All theme contrast checks passed.')
