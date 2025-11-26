<template>
  <section class="rounded-2xl border border-border-subtle bg-[color-mix(in_srgb,var(--color-bg-surface)_90%,transparent)] p-6 shadow-sm space-y-6">
    <header class="space-y-2">
      <h2 class="text-xl font-semibold">Appearance</h2>
      <p class="text-sm text-[var(--color-text-muted)]">Pick a theme and preview its palette.</p>
    </header>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <button
        v-for="theme in displayThemes"
        :key="themeKey(theme)"
        type="button"
        class="relative flex flex-col gap-3 rounded-xl border p-4 text-left transition duration-200"
        :class="[
          activeThemeKey === themeKey(theme)
            ? 'border-[var(--color-accent-soft)] ring-2 ring-[color-mix(in_srgb,var(--color-accent)_65%,transparent)] shadow-md'
            : 'border-border-subtle hover:border-[var(--color-border-strong)] hover:shadow-sm',
          'bg-[color-mix(in_srgb,var(--color-bg-elevated)_86%,transparent)] hover:-translate-y-0.5 hover:scale-[1.01]'
        ]"
        :style="previewStyle(theme)"
        @click="selectTheme(theme)"
      >
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-sm font-semibold">{{ theme.label }}</p>
            <p class="text-xs text-[var(--color-text-muted)]">
              {{ `${formatTierLabel(theme.required_plan)} theme palette` }}
            </p>
            <p
              v-if="isLocked(theme)"
              class="text-[11px] text-[var(--color-danger)]"
            >
              Preview only
            </p>
          </div>
          <span
            v-if="activeThemeKey === themeKey(theme)"
            class="text-[11px] font-medium rounded-full px-2 py-1 bg-[color-mix(in_srgb,var(--color-accent)_16%,transparent)] text-[var(--color-text-primary)]"
          >
            Active
          </span>
          <span
            v-else-if="isLocked(theme)"
            class="text-[11px] font-medium rounded-full px-2 py-1 bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)] text-[var(--color-danger)]"
          >
            🔒 Locked
          </span>
        </div>

        <div class="relative h-20 w-full overflow-hidden rounded-xl border" :style="previewFrameStyle">
          <div class="absolute inset-0" :style="{ background: 'var(--preview-bg)' }"></div>
          <div
            class="absolute inset-[12px] rounded-lg border"
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

        <div class="mt-1 flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
          <span>{{ formatTierLabel(theme.required_plan) }} Theme</span>
          <span v-if="savedThemeKey === themeKey(theme)" class="text-[var(--color-accent)] font-medium">Saved</span>
        </div>
      </button>
    </div>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-[var(--color-text-muted)]">{{ selectionStatus }}</p>
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="text-sm text-text-muted hover:text-text-primary transition"
          @click="resetPreview"
        >
          Reset
        </button>
        <BaseButton
          type="button"
          :loading="saving"
          :disabled="saving || !selectedTheme || saveDisabled"
          @click="saveSelection"
        >
          Save theme
        </BaseButton>
      </div>
    </div>

    <p v-if="message" class="text-sm text-status-success">{{ message }}</p>
    <p v-if="errorMessage" class="text-sm text-status-danger">{{ errorMessage }}</p>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import { formatTierLabel } from '@/utils/tierUtils'
import { useAuth } from '@/composables/useAuth'
import { useThemeManager } from '@/composables/useThemeManager'

const { isAuthenticated } = useAuth()

const {
  themes,
  selectedTheme,
  savedThemeId,
  previewTheme,
  resetToSaved,
  saveSelectedTheme,
  bootstrap,
  isThemeLocked,
  canSaveSelected,
  loading,
  error,
} = useThemeManager()

const saving = ref(false)
const message = ref('')
const errorMessage = ref('')

const formatLabel = (name = '') =>
  name
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')

const themeKey = (theme) => theme?.id || theme?.name

const displayThemes = computed(() =>
  (themes?.value || []).map((theme) => ({
    ...theme,
    label: theme.label || formatLabel(theme.name),
  }))
)

const activeThemeKey = computed(() => themeKey(selectedTheme.value))
const savedThemeKey = computed(() => savedThemeId.value)
const previewFrameStyle = {
  borderColor: 'var(--preview-border)',
}

const selectionStatus = computed(() => {
  if (!selectedTheme.value) return 'Select a theme to preview.'

  if (!isAuthenticated.value) return 'Sign in to save this theme.'
  if (isThemeLocked(selectedTheme.value)) {
    return `Requires ${formatTierLabel(selectedTheme.value.required_plan)} plan to use. You can still preview it.`
  }
  if (selectedTheme.value?.required_plan && selectedTheme.value.required_plan !== 'free') {
    return 'Previewing a premium palette. Save to keep it across sessions.'
  }

  return 'Previewing theme. Save to keep it across sessions.'
})

const saveDisabled = computed(() => {
  if (!selectedTheme.value) return true
  if (saving.value || loading.value) return true
  if (!isAuthenticated.value) return true
  return !canSaveSelected.value
})

const previewStyle = (theme) => {
  const palette = theme?.css_vars || {}
  return {
    '--preview-bg': palette['--color-bg-app'] || 'var(--color-bg-app)',
    '--preview-surface': palette['--color-bg-surface'] || 'var(--color-bg-surface)',
    '--preview-border': palette['--color-border-subtle'] || 'var(--color-border-subtle)',
    '--preview-text': palette['--color-text-primary'] || 'var(--color-text-primary)',
    '--preview-accent': palette['--color-accent'] || 'var(--color-accent)',
  }
}

const selectTheme = (theme) => {
  if (!theme) return
  errorMessage.value = ''
  message.value = ''
  previewTheme(themeKey(theme))
}

const resetPreview = () => {
  message.value = ''
  errorMessage.value = ''
  resetToSaved()
}

const saveSelection = async () => {
  if (!selectedTheme.value) return
  errorMessage.value = ''
  message.value = ''
  saving.value = true
  try {
    await saveSelectedTheme()
    message.value = 'Theme saved successfully.'
  } catch (err) {
    errorMessage.value = err.message || 'Unable to save theme.'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void bootstrap()
})

watch(
  () => error?.value,
  (val) => {
    if (val) errorMessage.value = val
  }
)
</script>
