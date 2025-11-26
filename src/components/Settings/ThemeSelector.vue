<template>
  <section class="rounded-2xl border border-border-subtle bg-[color-mix(in_srgb,var(--color-bg-surface)_90%,transparent)] p-6 shadow-sm space-y-6">
    <header class="space-y-2">
      <h2 class="text-xl font-semibold">Appearance</h2>
      <p class="text-sm text-[var(--color-text-muted)]">Pick a theme and preview its palette.</p>
    </header>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <button
        v-for="theme in themes"
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
              {{ theme.type === 'builtin' ? 'Built-in base mode' : `${formatTierLabel(theme.required_plan)} theme palette` }}
            </p>
            <p
              v-if="theme.type === 'database' && isLocked(theme)"
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
          <span v-if="theme.type === 'database'">{{ formatTierLabel(theme.required_plan) }} Theme</span>
          <span v-else>Base mode</span>
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
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import { applyThemeVars, clearThemeVars, getTheme, setTheme, previewThemeBase, restorePersistentTheme } from '@/utils/theme'
import { fetchAllThemes, fetchUserTheme, saveUserTheme } from '@/utils/themeApi'
import { compareTiers, formatTierLabel } from '@/utils/tierUtils'
import { useAuth } from '@/composables/useAuth'

const { tier, isAuthenticated, user } = useAuth()

const BUILTIN_THEMES = [
  {
    id: 'builtin-dark',
    name: 'dark',
    label: 'Dark',
    type: 'builtin',
    required_plan: 'free',
    theme_base: 'dark',
    css_vars: {}
  },
  {
    id: 'builtin-light',
    name: 'light',
    label: 'Light',
    type: 'builtin',
    required_plan: 'free',
    theme_base: 'light',
    css_vars: {}
  }
]

const availableThemes = ref([...BUILTIN_THEMES])
const activeBaseTheme = ref(getTheme())
const selectedTheme = ref(BUILTIN_THEMES.find((theme) => theme.name === activeBaseTheme.value) || BUILTIN_THEMES[0])
const savedThemeId = ref(null)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')
const previews = reactive({})

const formatLabel = (theme) => theme
  .split('-')
  .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
  .join(' ')

const normalizeTheme = (theme) => ({
  ...theme,
  label: theme.label || formatLabel(theme.name),
  type: theme.type || 'database',
  theme_base: theme.theme_base || theme.name || 'dark'
})

const themeKey = (theme) => (theme?.type === 'builtin' ? theme?.name : theme?.id)

const themes = computed(() => availableThemes.value)
const activeThemeKey = computed(() => themeKey(selectedTheme.value))
const savedThemeKey = computed(() => savedThemeId.value)

const previewFrameStyle = {
  borderColor: 'var(--preview-border)'
}

const isLocked = (theme) => compareTiers(tier.value, theme.required_plan) < 0

const saveDisabled = computed(() => {
  if (!selectedTheme.value) return true
  if (selectedTheme.value.type === 'builtin') return false
  if (!isAuthenticated.value) return true
  return isLocked(selectedTheme.value)
})

const selectionStatus = computed(() => {
  if (!selectedTheme.value) return 'Select a theme to preview.'

  if (selectedTheme.value.type === 'database') {
    if (isLocked(selectedTheme.value)) {
      return `Requires ${formatTierLabel(selectedTheme.value.required_plan)} plan to use. You can still preview it.`
    }
    if (!isAuthenticated.value) return 'Sign in to save this premium palette.'
    return 'Previewing premium palette. Save to keep it across sessions.'
  }

  return 'Using a built-in mode. Save to clear any premium overrides.'
})

const previewStyle = (theme) => {
  const palette = previews[themeKey(theme)] || {}
  return {
    '--preview-bg': palette.background || 'var(--color-bg-app)',
    '--preview-surface': palette.surface || 'var(--color-bg-surface)',
    '--preview-border': palette.border || 'var(--color-border-subtle)',
    '--preview-text': palette.text || 'var(--color-text-primary)',
    '--preview-accent': palette.accent || 'var(--color-accent)'
  }
}

const readPalette = (theme) => {
  if (typeof document === 'undefined' || !theme) return null
  const probe = document.createElement('div')
  const baseTheme = theme.type === 'builtin' ? theme.name : theme.theme_base || 'dark'
  probe.dataset.theme = baseTheme
  probe.style.position = 'absolute'
  probe.style.opacity = '0'
  probe.style.pointerEvents = 'none'
  probe.style.inset = '0'

  Object.entries(theme.css_vars || {}).forEach(([key, value]) => {
    probe.style.setProperty(key, value)
  })

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
    const palette = readPalette(theme)
    if (palette) previews[themeKey(theme)] = palette
  })
}

const selectTheme = (theme) => {
  if (!theme) return
  errorMessage.value = ''
  message.value = ''
  selectedTheme.value = theme

  if (theme.type === 'builtin') {
    activeBaseTheme.value = previewThemeBase(theme.name)
    clearThemeVars()

  } else {
    activeBaseTheme.value = setTheme(theme.theme_base || 'dark', { clearOverrides: true })
    applyThemeVars(theme.css_vars || {})
  }
}

const resetPreview = () => {
  if (savedThemeId.value) {
    const saved = themes.value.find((theme) => themeKey(theme) === savedThemeId.value)
    if (saved) selectTheme(saved)
  } else {
    const base = BUILTIN_THEMES.find((theme) => theme.name === activeBaseTheme.value) || BUILTIN_THEMES[0]
    selectTheme(base)
  }
}

const saveSelection = async () => {
  if (!selectedTheme.value) return
  errorMessage.value = ''
  message.value = ''

  if (selectedTheme.value.type === 'builtin') {
    try {
      if (isAuthenticated.value && savedThemeId.value) {
        await saveUserTheme(null)
        savedThemeId.value = null
      }
      message.value = 'Base mode applied.'
    } catch (error) {
      errorMessage.value = error.message || 'Unable to update theme.'
    }
    return
  }

  if (!isAuthenticated.value) {
    errorMessage.value = 'Sign in to save this premium theme.'
    return
  }

  if (isLocked(selectedTheme.value)) {
    errorMessage.value = `Requires ${formatTierLabel(selectedTheme.value.required_plan)} plan to use. You can still preview it.`
    return
  }

  saving.value = true
  try {
    await saveUserTheme(selectedTheme.value.id)
    savedThemeId.value = selectedTheme.value.id
    message.value = 'Theme saved successfully.'
  } catch (error) {
    errorMessage.value = error.message || 'Unable to save theme.'
  } finally {
    saving.value = false
  }
}

const upsertTheme = (theme) => {
  const normalized = normalizeTheme(theme)
  const existingIndex = availableThemes.value.findIndex((entry) => themeKey(entry) === themeKey(normalized))
  if (existingIndex >= 0) {
    availableThemes.value.splice(existingIndex, 1, normalized)
  } else {
    availableThemes.value.push(normalized)
  }
  return normalized
}

const loadThemes = async () => {
  if (!isAuthenticated.value) {
    availableThemes.value = [...BUILTIN_THEMES]
    hydratePreviews()
    return
  }
  try {
    errorMessage.value = ''
    const data = await fetchAllThemes()
    const mapped = data.map((theme) => normalizeTheme({ ...theme, type: 'database' }))
    availableThemes.value = [...BUILTIN_THEMES, ...mapped]
    hydratePreviews()
  } catch (error) {
    errorMessage.value = error.message || 'Unable to load themes.'
  }
}

const loadUserTheme = async () => {
  if (!isAuthenticated.value) {
    savedThemeId.value = null
    clearThemeVars()
    const base = BUILTIN_THEMES.find((entry) => entry.name === activeBaseTheme.value) || BUILTIN_THEMES[0]
    selectTheme(base)
    return
  }
  try {
    errorMessage.value = ''
    const theme = await fetchUserTheme()
    savedThemeId.value = theme?.id || null

    if (theme) {
      const normalized = upsertTheme({ ...theme, type: 'database' })
      hydratePreviews()
      selectTheme(normalized)
    } else {
      clearThemeVars()
      const base = BUILTIN_THEMES.find((entry) => entry.name === activeBaseTheme.value) || BUILTIN_THEMES[0]
      selectTheme(base)
    }
  } catch (error) {
    errorMessage.value = error.message || 'Unable to load saved theme.'
  }
}

const syncActiveTheme = () => {
  activeBaseTheme.value = getTheme()
  if (selectedTheme.value?.type === 'builtin') {
    selectedTheme.value = BUILTIN_THEMES.find((theme) => theme.name === activeBaseTheme.value) || selectedTheme.value
  }
  hydratePreviews()
}

let observer
const handleStorage = (event) => {
  if (event.key === 'theme') {
    syncActiveTheme()
  }
}

onMounted(async () => {
  syncActiveTheme()
  await loadThemes()
  await loadUserTheme()

  observer = new MutationObserver(syncActiveTheme)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  window.addEventListener('storage', handleStorage)
})

watch(
  () => user.value?.id,
  () => {
    void loadThemes()
    void loadUserTheme()
  }
)


onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('storage', handleStorage)
  restorePersistentTheme()
  clearThemeVars()
})
</script>
