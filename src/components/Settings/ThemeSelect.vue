<template>
  <section
    class="rounded-2xl border border-border-subtle bg-[color-mix(in_srgb,var(--color-bg-surface)_88%,transparent)] p-6 shadow-sm space-y-6"
  >
    <header class="space-y-2">
      <h2 class="text-xl font-semibold">Appearance</h2>
      <p class="text-sm text-[var(--color-text-muted)]">Choose a theme for your workspace.</p>
    </header>

    <div class="flex flex-wrap items-start justify-between gap-6">
      <div class="space-y-1 max-w-xl">
        <h3 class="text-base font-medium">Theme</h3>
        <p class="text-sm text-[var(--color-text-muted)]">
          Switch between available themes. Your choice is saved to this browser.
        </p>
      </div>
      <div class="space-y-2">
        <label class="text-sm font-medium" for="theme-select">Select theme</label>
        <select
          id="theme-select"
          class="min-w-[220px] rounded-lg border border-border-subtle bg-[var(--color-bg-elevated)] px-4 py-2 text-[var(--color-text-primary)] focus:outline focus:outline-2 focus:outline-[var(--color-focus-ring)]"
          :value="selectedTheme"
          @change="onThemeChange"
        >
          <option
            v-for="option in themeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getAvailableThemes, getTheme, setTheme } from '@/utils/theme'

const selectedTheme = ref('dark')

const formatLabel = (theme) => theme
  .split('-')
  .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
  .join(' ')

const themeOptions = computed(() => getAvailableThemes().map((theme) => ({
  value: theme,
  label: formatLabel(theme)
})))

const onThemeChange = (event) => {
  selectedTheme.value = setTheme(event.target.value)
}

onMounted(() => {
  selectedTheme.value = getTheme()
})
</script>
