<template>
  <section class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 p-6 shadow-sm space-y-6">
    <header class="space-y-2">
      <h2 class="text-xl font-semibold">Appearance</h2>
      <p class="text-sm text-neutral-600 dark:text-neutral-400">Pick a theme to update the interface instantly.</p>
    </header>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <button
        v-for="theme in sortedThemes"
        :key="theme.id"
        type="button"
        class="group relative flex items-center gap-4 border rounded-xl p-4 text-left transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        :class="[
          isLocked(theme)
            ? 'border-dashed border-red-300 dark:border-red-800 opacity-70 cursor-not-allowed'
            : 'border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 shadow-sm hover:shadow-md'
        ]"
        :aria-pressed="currentThemeId === theme.id"
        :disabled="isLocked(theme)"
        @click="handleSelect(theme)"
      >
        <div
          class="w-16 h-16 rounded-lg border overflow-hidden flex-shrink-0"
          :class="isLocked(theme) ? 'border-red-300 dark:border-red-800' : 'border-neutral-200 dark:border-neutral-700'"
          :style="previewStyle(theme)"
        >
          <span v-if="isLocked(theme)" class="sr-only">Locked theme</span>
        </div>

        <div class="flex-1 space-y-1">
          <div class="flex items-center gap-2">
            <p class="text-base font-medium">{{ theme.name }}</p>
            <span
              v-if="currentThemeId === theme.id"
              class="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-100"
            >
              Active
            </span>
          </div>
          <p class="text-xs text-neutral-500 dark:text-neutral-400">{{ planLabel(theme.plan_required) }} plan or higher</p>
          <p v-if="isLocked(theme)" class="text-xs text-red-500">Upgrade to use this theme.</p>
          <p v-else class="text-xs text-neutral-500 dark:text-neutral-400">Click to apply instantly.</p>
        </div>
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useTheme } from '@/composables/useTheme'

const { themes, currentTheme, loadTheme, setTheme, isPremiumLocked } = useTheme()

onMounted(() => {
  void loadTheme()
})

const currentThemeId = computed(() => currentTheme.value?.id || '')

const sortedThemes = computed(() => [...themes.value].sort((a, b) => a.name.localeCompare(b.name)))

function planLabel(plan) {
  if (!plan) return 'Free'
  const normalized = plan.toLowerCase()
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function previewStyle(theme) {
  if (theme.preview_url) {
    return {
      backgroundImage: `url(${theme.preview_url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }
  }

  const bg1 = theme.css_vars?.['--lm-bg-1'] || '#e5e5e5'
  const bg2 = theme.css_vars?.['--lm-bg-2'] || '#dcdcdc'
  const accent = theme.css_vars?.['--lm-node-blue'] || '#6c8edb'

  return {
    backgroundImage: `linear-gradient(135deg, ${bg1} 0%, ${bg2} 65%, ${accent} 100%)`
  }
}

function isLocked(theme) {
  return isPremiumLocked(theme)
}

async function handleSelect(theme) {
  if (!theme || isLocked(theme)) return
  await setTheme(theme.id)
}
</script>
