# SoundRoom Brand Typography

Single source of truth for the SoundRoom wordmark and brand typography. Update this file whenever the visual treatment of the wordmark changes anywhere in the codebase.

## Wordmark

### Type specimen

| Attribute | Value | Source |
|---|---|---|
| Font family | `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif` | `src/style.css:32` (`:root`) |
| Resolved font | **SF Pro** (macOS / iOS), **Segoe UI** (Windows), **Roboto** (Android / Linux) | system default |
| Weight | **600 (semibold)** | Tailwind `font-semibold` |
| Letter-spacing | **-0.025em** (≈ -1.1px at 44px, -0.9px at 36px) | Tailwind `tracking-tight` |
| Size in app header | **2.25rem / 36px** | Tailwind `text-4xl` |
| Size in marketing copy | inherits surrounding heading size | — |
| Color (primary) | `linear-gradient(to right, #2f6dfd → #2ebd94)` via `bg-clip-text text-transparent` | `--color-accent` → `--color-success` |
| Color (white variant) | `#FFFFFF` | for dark backgrounds |
| Color (black variant) | `#000000` | for light backgrounds, print, single-color reproduction |

### Color tokens (from `src/styles/theme-tokens.css`)

| Token | Hex |
|---|---|
| `--color-accent` | `#2f6dfd` (indigo-blue) |
| `--color-accent-soft` | `#6fa2ff` |
| `--color-accent-strong` | `#1f4fc6` |
| `--color-success` | `#2ebd94` (mint-green) |

The gradient runs **left-to-right** from `--color-accent` to `--color-success`.

## Asset files

Standalone SVG variants live in [`public/brand/`](../public/brand/) and ship with every build at `/brand/*.svg`:

| File | Use |
|---|---|
| [`soundroom-wordmark-gradient.svg`](../public/brand/soundroom-wordmark-gradient.svg) | Primary brand mark — accent→success gradient, hardcoded hex. For external use (social previews, decks, press kits). |
| [`soundroom-wordmark-white.svg`](../public/brand/soundroom-wordmark-white.svg) | Dark backgrounds (video overlays, single-color contexts) |
| [`soundroom-wordmark-black.svg`](../public/brand/soundroom-wordmark-black.svg) | Light backgrounds, print, single-color reproduction, embroidery |

All three are 400×80 with transparent backgrounds. They use the same system-font stack as the live app so the SVG renders identically to the navbar wherever the platform has SF Pro / Segoe UI / Roboto available.

### In-app usage — use the component, not the SVG file

For anything *inside the app*, prefer the [`<Wordmark />`](../src/components/brand/Wordmark.vue) component:

```vue
<script setup>
import Wordmark from '@/components/brand/Wordmark.vue'
</script>

<template>
  <Wordmark class="h-10 w-auto" />          <!-- default: gradient -->
  <Wordmark variant="solid" class="text-white h-8" />   <!-- inherits text color via currentColor -->
</template>
```

The component renders an inline SVG whose `<linearGradient>` stops reference `var(--color-accent)` and `var(--color-success)` directly, so the wordmark **shifts with the active theme** (the success green dims from `#2ebd94` on dark to `#1f8768` on light, for example). The standalone gradient SVG file has those values baked in and does not track the theme.

### Path-based versions (for print, fabric, foreign platforms)

The shipped SVGs reference system fonts. If you need a version that renders identically *everywhere* — print proofs, embroidery, third-party platforms missing the font — convert the text to outlined paths:

1. Open the SVG in Figma → select the text → right-click → **Outline stroke** (or **Flatten**) → re-export.
2. Or in Illustrator → select the text → **Type → Create Outlines** → re-export.
3. Or via CLI: `fontTools` / `svgo` with text-to-path conversion. `inkscape --export-text-to-path` is the lightest option.

Save the outlined versions next to the originals as `soundroom-wordmark-white-paths.svg` etc. and update this table when they exist.

## Where the wordmark appears in code

| File | Line | Context | Treatment |
|---|---|---|---|
| `src/components/brand/Wordmark.vue` | — | **Canonical implementation.** Inline SVG, theme-reactive via CSS vars. | Source of truth |
| `src/components/SoundRoom/HeaderBar.vue` | ~17–24 | Navbar logo (always visible) | `<Wordmark class="h-10 w-auto" />` |
| `src/views/LandingPage.vue` | ~171 | Inline in marketing copy ("…with **SoundRoom**.") | **Still uses ad-hoc gradient text** — migrate to `<Wordmark />` next time this file is touched. |
| `src/views/LandingPage.vue` | ~199 | Footer `© 2025 SoundRoom` | Plain text, intentional (no logo treatment in footer copy) |
| `public/brand/*.svg` | — | Downloadable / external assets | Standalone SVGs (gradient, white, black) |

The favicon (`public/favicon.ico`) and OG share image (`public/SoundRoom.png`) are static raster assets — re-export them whenever the brand mark changes substantively.

## Migration note

The pre-component implementation rendered "SoundRoom" as text with `bg-clip-text text-transparent` on a Tailwind gradient. This worked but duplicated styling and tied the visual treatment to specific Tailwind class strings. The new `<Wordmark />` component:

- Renders an inline SVG so theme variables propagate into the gradient stops.
- Hardcodes the system font stack inside the SVG so it survives being extracted from the app (e.g. screenshotted for press).
- Exposes a `variant="solid"` mode that falls back to `currentColor` for white/black contexts where the gradient is wrong (printed material, embroidery, dark-photo overlays).

If you ever change the gradient, the font weight, or the tracking, update `Wordmark.vue` and the three `public/brand/*.svg` files together. That's all.

## Brand do's and don'ts

| ✅ Do | ❌ Don't |
|---|---|
| Use the gradient on dark backgrounds with sufficient contrast | Apply the gradient on busy photos / video — readability dies |
| Use the white SVG on dark photo backgrounds | Use the white SVG on light backgrounds |
| Keep the wordmark at 36px minimum for legibility | Render below 24px — system fonts get blurry |
| Maintain `tracking-tight` (-0.025em) at all sizes | Add custom tracking — it breaks visual consistency |
| Pair with the system stack body font | Pair with a different display font — the brand IS the system font |
