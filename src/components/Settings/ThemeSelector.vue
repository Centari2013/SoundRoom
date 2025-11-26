<template>
  <section class="rounded-2xl sr-border sr-border-subtle bg-[color-mix(in_srgb,var(--color-bg-surface)_90%,transparent)] p-6 shadow-sm space-y-6">
    <header class="space-y-2">
      <h2 class="text-xl font-semibold">Appearance</h2>
      <p class="text-sm text-[var(--color-text-muted)]">Pick a theme and preview its palette.</p>
    </header>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <button
        v-for="theme in themes"
        :key="theme.name"
        type="button"
        class="relative flex flex-col gap-3 rounded-xl sr-border p-4 text-left transition duration-200"
        :class="[
          activeTheme === theme.name
            ? 'border-accent-soft ring-2 ring-[color-mix(in_srgb,var(--color-accent)_65%,transparent)] shadow-md'
            : 'sr-border-subtle hover:sr-border-strong hover:shadow-sm',
          'bg-[color-mix(in_srgb,var(--color-bg-elevated)_86%,transparent)] hover:-translate-y-0.5 hover:scale-[1.01]'
        ]"
        :style="previewStyle(theme.name)"
        @click="selectTheme(theme.name)"
      >
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-sm font-semibold">{{ theme.label }}</p>
            <p class="text-xs text-[var(--color-text-muted)]">Preview.</p>
          </div>
          <span
            v-if="activeTheme === theme.name"
            class="text-[11px] font-medium rounded-full px-2 py-1 bg-[color-mix(in_srgb,var(--color-accent)_16%,transparent)] text-[var(--color-text-primary)]"
          >
            Active
          </span>
        </div>

        <div class="relative h-20 w-full overflow-hidden rounded-xl sr-border" :style="previewFrameStyle">
          <div class="absolute inset-0" :style="{ background: 'var(--preview-bg)' }"></div>
          <div
            class="absolute inset-[12px] rounded-lg sr-border"
            :style="{ background: 'var(--preview-surface)', borderColor: 'color-mix(in srgb, var(--preview-border) 70%, transparent)' }"
          ></div>
          <div class="absolute left-5 top-5 flex items-center gap-2">
            <span
              class="inline-flex items-center gap-1 rounded-full px-2 py-[5px] text-[11px] font-medium"
              :style="{ color: 'var(--preview-text)', background: 'color-mix(in srgb, var(--preview-surface) 82%, transparent)', border: '1px solid var(--preview-border)' }"
            >
              Aa
            </span>
            <span class="h-2.5 w-8 rounded-full" :style="{ background: 'var(--preview-border)' }"></span>
          </div>
          <div class="absolute right-5 bottom-4 flex items-center gap-2">
            <span class="h-2 w-10 rounded-full" :style="{ background: 'var(--preview-text)' }"></span>
            <span
              class="h-3 w-3 rounded-full"
              :style="{
                background: 'var(--preview-accent)',
                boxShadow: '0 0 0 6px color-mix(in srgb, var(--preview-accent) 16%, transparent)'
              }"
            ></span>
          </div>
        </div>
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { getAvailableThemes, getTheme, setTheme } from '@/utils/theme'

const activeTheme = ref('dark')
const previews = reactive({})

const formatLabel = (theme) => theme
  .split('-')
  .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
  .join(' ')

const themes = computed(() => getAvailableThemes().map((name) => ({
  name,
  label: formatLabel(name)
})))

const previewFrameStyle = {
  borderColor: 'var(--preview-border)'
}

const previewStyle = (themeName) => {
  const palette = previews[themeName] || {}
  return {
    '--preview-bg': palette.background || 'var(--color-bg-app)',
    '--preview-surface': palette.surface || 'var(--color-bg-surface)',
    '--preview-border': palette.border || 'var(--color-border-subtle)',
    '--preview-text': palette.text || 'var(--color-text-primary)',
    '--preview-accent': palette.accent || 'var(--color-accent)'
  }
}

const readPalette = (themeName) => {
  if (typeof document === 'undefined') return null
  const probe = document.createElement('div')
  probe.dataset.theme = themeName
  probe.style.position = 'absolute'
  probe.style.opacity = '0'
  probe.style.pointerEvents = 'none'
  probe.style.inset = '0'
  document.body.appendChild(probe)

  const styles = getComputedStyle(probe)
  const palette = {
    background: styles.getPropertyValue('--color-bg-app').trim(),
    surface: styles.getPropertyValue('--color-bg-surface').trim(),
    border: styles.getPropertyValue('--color-border-subtle').trim(),
    text: styles.getPropertyValue('--color-text-primary').trim(),
    accent: styles.getPropertyValue('--color-accent').trim()
  }

  document.body.removeChild(probe)
  return palette
}

const hydratePreviews = () => {
  themes.value.forEach((theme) => {
    const palette = readPalette(theme.name)
    if (palette) previews[theme.name] = palette
  })
}

const selectTheme = (themeName) => {
  activeTheme.value = setTheme(themeName)
}

const syncActiveTheme = () => {
  activeTheme.value = getTheme()
}

let observer
const handleStorage = (event) => {
  if (event.key === 'theme') {
    syncActiveTheme()
  }
}

onMounted(() => {
  syncActiveTheme()
  hydratePreviews()

  observer = new MutationObserver(syncActiveTheme)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  window.addEventListener('storage', handleStorage)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('storage', handleStorage)
})
</script>
