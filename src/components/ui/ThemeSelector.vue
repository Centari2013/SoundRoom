<template>
  <section class="rounded-2xl border border-[var(--sr-border)] bg-[var(--sr-bg-1)] shadow-[var(--sr-shadow)] text-left p-4 space-y-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--sr-text-1)]">Themes</p>
        <h3 class="text-lg font-semibold text-[var(--sr-text-0)]">Choose your vibe</h3>
        <p class="text-sm text-[var(--sr-text-1)]">Themes update instantly and persist to your account.</p>
      </div>
      <div v-if="loading" class="text-xs text-[var(--sr-text-1)]">Loading…</div>
    </div>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <button
        v-for="theme in sortedThemes"
        :key="theme.id"
        type="button"
        class="flex flex-col items-start gap-2 rounded-xl border w-full text-left p-3 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sr-focus)]"
        :class="[
          theme.id === activeId ? 'border-[var(--sr-primary)] shadow-[var(--sr-shadow)]' : 'border-[var(--sr-border)]',
          isPremiumLocked(theme) ? 'opacity-60 cursor-not-allowed' : 'hover:border-[var(--sr-primary)]'
        ]"
        @click="handleSelect(theme)"
      >
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <span class="inline-flex h-3 w-3 rounded-full" :style="previewStyle(theme)"></span>
            <span class="text-sm font-semibold text-[var(--sr-text-0)]">{{ theme.name || 'Untitled theme' }}</span>
          </div>
          <span v-if="theme.id === activeId" class="text-xs text-[var(--sr-primary)] font-medium">Active</span>
        </div>
        <p class="text-xs text-[var(--sr-text-1)] leading-snug">{{ theme.description || 'Custom theme' }}</p>
        <div v-if="isPremiumLocked(theme)" class="text-xs text-amber-600 flex items-center gap-1">
          <span aria-hidden="true">🔒</span>
          <span>Premium required</span>
        </div>
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useTheme } from '@/composables/useTheme'

const { themes, currentTheme, fetchThemes, setTheme, isPremiumLocked } = useTheme()
const loading = ref(false)
const error = ref('')

const sortedThemes = computed(() => themes.value || [])
const activeId = computed(() => currentTheme.value?.id)

const previewStyle = (theme) => ({
  background: theme?.css_vars?.sr_bg_1 || theme?.css_vars?.sr_bg_0 || 'var(--sr-primary)'
})

async function handleSelect(theme) {
  if (!theme) return
  if (isPremiumLocked(theme)) {
    error.value = 'This theme is locked. Upgrade to unlock premium themes.'
    return
  }
  error.value = ''
  loading.value = true
  try {
    await setTheme(theme.id)
  } catch (err) {
    console.error('Unable to apply theme', err)
    error.value = 'Unable to apply theme right now.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await fetchThemes()
  } catch (err) {
    console.error('Theme fetch failed', err)
    error.value = 'Unable to load themes from Supabase.'
  } finally {
    loading.value = false
  }
})
</script>
