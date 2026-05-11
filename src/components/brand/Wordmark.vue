<!--
  SoundRoom Wordmark — single in-app source of truth.

  Renders an inline SVG so its <linearGradient> stops can resolve CSS
  variables (--color-accent, --color-success), letting the wordmark
  shift with the active theme exactly like the previous text-based
  treatment did.

  Props:
    variant: 'gradient' (default) | 'solid'
      - gradient → indigo→mint accent gradient
      - solid    → inherits `currentColor` so the parent's `text-*` class
                   controls fill (use for white/black/print contexts)

  Sizing:
    Default visual height matches the previous `text-4xl` wordmark
    (~36–40px). Override with any Tailwind `h-*` class on the element.
-->
<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 240 50"
    role="img"
    aria-label="SoundRoom"
    class="block select-none h-10 w-auto"
  >
    <title>SoundRoom</title>
    <defs v-if="variant === 'gradient'">
      <linearGradient :id="gradientId" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="var(--color-accent)" />
        <stop offset="100%" stop-color="var(--color-success)" />
      </linearGradient>
    </defs>
    <text
      x="0"
      y="40"
      font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
      font-weight="600"
      font-size="40"
      letter-spacing="-1"
      :fill="variant === 'gradient' ? `url(#${gradientId})` : 'currentColor'"
    >SoundRoom</text>
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'gradient',
    validator: (v) => ['gradient', 'solid'].includes(v),
  },
})

// Each <Wordmark /> instance gets a unique gradient id so multiple
// instances on the same page can't collide on `<defs>` references.
const gradientId = computed(
  () => `sr-wordmark-${Math.random().toString(36).slice(2, 9)}`
)
</script>
