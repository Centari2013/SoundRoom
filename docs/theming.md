# Theming Guidelines

SoundRoom themes define a set of CSS custom properties that power both the runtime theming system and Tailwind utilities. When introducing a new theme, supply the full set of tokens described below so the UI renders consistently before the JavaScript theme loader runs.

## Required tokens

Each variant must provide the following tokens inside `cssVars`:

| Token | Purpose |
| --- | --- |
| `surface` | Default application background.
| `panel` | Elevated surfaces such as dialogs and cards.
| `border` | Outlines and separators between elements.
| `accent` | Primary interactive background color (buttons, toggles, etc.).
| `accentForeground` | Text or icon color placed on top of the accent color.
| `textPrimary` | Legacy token for main text; still consumed by older components.
| `textMuted` | Secondary text for subdued UI.
| `textOnSurface` | Primary text placed directly on the `surface` color.
| `textOnPanel` | Primary text placed on `panel` surfaces.
| `overlayBackground` | Backdrop color for overlays, sheets, and floating chrome.
| `onOverlayText` | Text and icon color on top of `overlayBackground`.

## Contrast requirements

To meet WCAG AA for normal-sized text, maintain a contrast ratio of **4.5:1 or higher** for every variant and color scheme using the following pairings:

- `textOnSurface` on `surface`
- `textOnPanel` on `panel`
- `accentForeground` on `accent`
- `onOverlayText` on `overlayBackground`

The automated contrast check fails the build if any pairing falls below the threshold or if a token is missing.

## Validation

Run the contrast verifier locally with:

```bash
npm run check:theme-contrast
```

The script evaluates every theme/variant declared in `src/constants/themes.js`. Our CI pipeline calls the same command via `npm test`, so a theme will not ship without passing contrast validation.
