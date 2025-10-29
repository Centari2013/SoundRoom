<template>
  <main class="flex-1 overflow-y-auto bg-surface text-primary">
    <div class="max-w-5xl mx-auto px-6 py-10 space-y-10">
      <section class="space-y-4">
        <div class="flex items-center justify-between gap-6 flex-wrap">
          <div class="space-y-2">
            <h1 class="text-3xl font-semibold tracking-tight">Settings</h1>
            <p class="text-sm text-neutral-600 dark:text-neutral-400 max-w-xl">
              Update how you appear in SoundRoom, adjust playback preferences, and keep your account secure.
            </p>
          </div>
          <div class="flex items-center gap-3 rounded-full border border-border px-4 py-2 bg-panel/70">
            <span class="text-xs uppercase tracking-wide text-neutral-500">Plan</span>
            <span class="text-sm font-medium">{{ planLabel }}</span>
            <RouterLink v-if="tier.value === 'free'" :to="'/upgrade'" class="ml-2">
              <BaseButton type="button">
                Upgrade Plan
              </BaseButton>
            </RouterLink>
            <BaseButton
              v-else
              type="button"
              class="ml-2"
              @click="handleManagePlan"
            >
              Manage Plan
            </BaseButton>

          </div>
        </div>

        <div
          v-if="planStatusMessage || planErrorMessage || isProcessingCheckout"
          class="rounded-xl border p-4"
          :class="[
            isProcessingCheckout ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300' : '',
            planStatusMessage && !isProcessingCheckout ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300' : '',
            planErrorMessage ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300' : '',
          ]"
        >
          <p v-if="isProcessingCheckout" class="text-sm font-medium">Processing your plan change…</p>
          <p v-else-if="planStatusMessage" class="text-sm font-medium">{{ planStatusMessage }}</p>
          <p v-else-if="planErrorMessage" class="text-sm font-medium">{{ planErrorMessage }}</p>
        </div>

        <div class="rounded-2xl border border-border bg-panel/70 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">Signed in as</p>
            <p class="text-lg font-medium break-all">{{ userEmail }}</p>
          </div>
          <div class="flex items-center gap-4">
            <div class="relative w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center overflow-hidden text-xl font-semibold">
              <img
                v-if="avatarPreview && !avatarFailed"
                :src="avatarPreview"
                alt="User avatar preview"
                class="w-full h-full object-cover"
                @error="handleAvatarError"
              >
              <span v-else>{{ avatarInitial }}</span>
            </div>
            <div>
              <p class="text-sm text-neutral-500 dark:text-neutral-400">Display name</p>
              <p class="text-base font-medium">{{ profileForm.displayName || '—' }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-border bg-panel/80 p-6 shadow-sm space-y-6">
        <header class="space-y-2">
          <h2 class="text-xl font-semibold">Profile</h2>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">Set how teammates and collaborators see you.</p>
        </header>

        <div v-if="isFetchingProfile" class="space-y-4 animate-pulse">
          <div class="h-4 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
          <div class="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-2/3"></div>
          <div class="h-40 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
        </div>

        <form v-else @submit.prevent="saveProfile" class="space-y-8">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BaseInput
              v-model="profileForm.displayName"
              label="Display name"
              autocomplete="name"
              :disabled="profileSaving"
              :error="profileErrors.displayName"
              placeholder="Add a friendly name"
            />
            <BaseInput
              v-model="profileForm.avatarUrl"
              label="Avatar URL"
              placeholder="https://example.com/avatar.png"
              autocomplete="off"
              :disabled="profileSaving"
              :error="profileErrors.avatarUrl"
            />
            <BaseInput
              :model-value="userEmail"
              label="Email"
              type="email"
              disabled
              autocomplete="email"
            />
            <BaseInput
              :model-value="formattedUserId"
              label="User ID"
              disabled
            />
          </div>

          <div class="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              class="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition"
              @click="resetProfileForm"
              :disabled="profileSaving || !hasProfileChanges"
            >
              Reset
            </button>
            <BaseButton
              type="submit"
              :loading="profileSaving"
              :disabled="profileSaving || !hasProfileChanges"
            >
              Save profile
            </BaseButton>
          </div>

          <p v-if="profileMessage" class="text-sm text-green-600">{{ profileMessage }}</p>
          <p v-if="profileErrorMessage" class="text-sm text-red-600">{{ profileErrorMessage }}</p>
        </form>
      </section>

      <section class="rounded-2xl border border-border bg-panel/80 p-6 shadow-sm space-y-6">
        <header class="space-y-2">
          <h2 class="text-xl font-semibold">Appearance</h2>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            Choose the palette that best fits your workspace. Themes update instantly across the app.
          </p>
        </header>

        <div class="flex flex-wrap items-start justify-between gap-6">
          <div class="space-y-1">
            <h3 class="text-base font-medium">Color scheme</h3>
            <p class="text-sm text-neutral-600 dark:text-neutral-400">
              Currently showing <span class="font-medium">{{ activeVariantLabel || 'Default palette' }}</span>
              in the
              <span class="font-medium">{{ resolvedSchemeLabel }}</span>
              scheme.
            </p>
          </div>
          <label class="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
            <span class="font-medium">Preference</span>
            <select
              v-model="selectedScheme"
              class="rounded-lg border border-border bg-panel px-3 py-2 text-sm text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/60"
            >
              <option v-for="option in schemeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>

        <div class="space-y-4">
          <h3 class="text-base font-medium">Theme</h3>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            Switch between available SoundRoom themes. Locked themes will prompt an upgrade.
          </p>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <button
              v-for="theme in themeCards"
              :key="theme.id"
              type="button"
              class="relative overflow-hidden rounded-xl border bg-panel px-4 py-4 text-left shadow-sm transition"
              :class="[
                theme.id === activeThemeId ? 'border-accent/70 ring-2 ring-accent/70' : 'border-border hover:border-accent/40',
                theme.unlocked ? 'cursor-pointer' : 'cursor-pointer opacity-60'
              ]"
              @click="handleThemeSelection(theme)"
              :aria-pressed="theme.id === activeThemeId"
            >
              <div
                class="h-20 w-full rounded-lg border border-border bg-surface-muted"
                :style="getThemePreviewStyle(theme)"
              />
              <div class="mt-4 space-y-1">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm font-medium">{{ theme.label }}</p>
                  <span
                    v-if="theme.id === activeThemeId"
                    class="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent"
                  >
                    Active
                  </span>
                </div>
                <p class="text-xs text-neutral-600 dark:text-neutral-400">{{ theme.description }}</p>
                <p class="text-xs text-neutral-500 dark:text-neutral-500">
                  {{ getVariantLabel(theme) }}
                </p>
                <p
                  v-if="!theme.unlocked"
                  class="text-xs font-medium text-accent"
                >
                  Requires {{ theme.requiredPlanLabel }} plan
                </p>
              </div>
            </button>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-border bg-panel/80 p-6 shadow-sm space-y-6">
        <header class="space-y-2">
          <h2 class="text-xl font-semibold">Playback Preferences</h2>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">These settings are stored locally in your browser.</p>
        </header>

        <div class="space-y-6">
          <div class="flex items-start justify-between gap-6">
            <div>
              <h3 class="text-base font-medium">Auto-resume sessions</h3>
              <p class="text-sm text-neutral-600 dark:text-neutral-400">Automatically reload your last SoundRoom when you sign back in.</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer select-none">
              <input type="checkbox" class="sr-only peer" v-model="preferences.autoResumePlayback">
              <span class="block w-12 h-6 rounded-full bg-neutral-300 dark:bg-neutral-700 transition-colors peer-focus:outline peer-focus:outline-2 peer-focus:outline-blue-500 peer-checked:bg-blue-600"></span>
              <span class="absolute left-1 top-1 block w-4 h-4 rounded-full bg-panel shadow transition-transform peer-checked:translate-x-6"></span>
            </label>
          </div>

          <div class="flex items-start justify-between gap-6">
            <div>
              <h3 class="text-base font-medium">Show interface tips</h3>
              <p class="text-sm text-neutral-600 dark:text-neutral-400">Keep lightweight reminders visible for keyboard shortcuts and best practices.</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer select-none">
              <input type="checkbox" class="sr-only peer" v-model="preferences.showInterfaceTips">
              <span class="block w-12 h-6 rounded-full bg-neutral-300 dark:bg-neutral-700 transition-colors peer-focus:outline peer-focus:outline-2 peer-focus:outline-blue-500 peer-checked:bg-blue-600"></span>
              <span class="absolute left-1 top-1 block w-4 h-4 rounded-full bg-panel shadow transition-transform peer-checked:translate-x-6"></span>
            </label>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            class="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition"
            @click="resetPreferences"
            :disabled="!hasPreferenceChanges"
          >
            Reset to defaults
          </button>
          <BaseButton
            type="button"
            @click="savePreferences"
            :disabled="!hasPreferenceChanges"
          >
            Save preferences
          </BaseButton>
        </div>
        <p v-if="preferenceMessage" class="text-sm text-green-600">{{ preferenceMessage }}</p>
      </section>

      <section class="rounded-2xl border border-border bg-panel/80 p-6 shadow-sm space-y-6">
        <header class="space-y-2">
          <h2 class="text-xl font-semibold">Security</h2>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">Keep your account protected and up to date.</p>
        </header>

        <div class="space-y-6">
          <div class="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h3 class="text-base font-medium">Password</h3>
              <p class="text-sm text-neutral-600 dark:text-neutral-400">Use a strong password to protect your SoundRoom sessions and purchases.</p>
            </div>
            <RouterLink to="/update-password">
              <BaseButton type="button">Update password</BaseButton>
            </RouterLink>
          </div>

          <div class="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h3 class="text-base font-medium">Sign out</h3>
              <p class="text-sm text-neutral-600 dark:text-neutral-400">Need to switch devices? Sign out to end your session on this browser.</p>
            </div>
            <BaseButton type="button" @click="signOutCurrentSession">Sign out of this device</BaseButton>
          </div>
        </div>

        <p v-if="securityMessage" class="text-sm text-green-600">{{ securityMessage }}</p>
        <p v-if="securityError" class="text-sm text-red-600">{{ securityError }}</p>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import BaseInput from '@/components/ui/input/BaseInput.vue'
import { useAuth } from '@/composables/useAuth'
import { supabase } from '@/utils/supabase'
import { useThemeStore } from '@/stores/useThemeStore.js'
import { SUPPORTED_COLOR_SCHEMES } from '@/constants/themes.js'
import { canUseTheme } from '@/utils/permissions.js'
import { useEntitlementStore } from '@/stores/useEntitlementStore.js'
import { getEntitlementCopy } from '@/constants/entitlementCopy.js'

const router = useRouter()
const route = useRoute()
const { user, sessionLoaded, tier, refreshTier, primeTier } = useAuth()

const themeStore = useThemeStore()
const entitlementStore = useEntitlementStore()
const { availableThemes, themeId, colorSchemePreference, resolvedScheme, appliedVariant } = storeToRefs(themeStore)

const COLOR_SCHEME_LABELS = {
  system: 'Match system',
  light: 'Light',
  dark: 'Dark'
}

const THEME_PLAN_LABELS = {
  none: 'Free',
  basic: 'Basic',
  pro: 'Pro'
}

const schemeOptions = computed(() => {
  const options = ['system', ...SUPPORTED_COLOR_SCHEMES]
  return options.map((value) => ({
    value,
    label: COLOR_SCHEME_LABELS[value] ?? value
  }))
})

const selectedScheme = computed({
  get: () => colorSchemePreference.value,
  set: (value) => {
    themeStore.setColorScheme(value)
  }
})

const resolvedSchemeLabel = computed(() => COLOR_SCHEME_LABELS[resolvedScheme.value] ?? 'Light')
const activeVariantLabel = computed(() => appliedVariant.value?.label ?? '')
const activeThemeId = computed(() => themeId.value)

const currentPlan = computed(() => tier.value ?? 'free')

const themeCards = computed(() => {
  const plan = currentPlan.value
  const themes = availableThemes.value ?? []
  return themes.map((theme) => {
    const unlocked = canUseTheme(plan, theme.availability)
    return {
      ...theme,
      unlocked,
      requiredPlanLabel: THEME_PLAN_LABELS[theme.availability] ?? 'Pro'
    }
  })
})

const profileForm = reactive({
  displayName: '',
  avatarUrl: ''
})

const profileInitial = ref({
  displayName: '',
  avatarUrl: ''
})

const profileSaving = ref(false)
const profileMessage = ref('')
const profileErrorMessage = ref('')
const profileErrors = reactive({
  displayName: '',
  avatarUrl: ''
})
const isFetchingProfile = ref(false)
const avatarFailed = ref(false)

const preferenceDefaults = Object.freeze({
  autoResumePlayback: false,
  showInterfaceTips: true
})

const preferences = reactive({
  autoResumePlayback: preferenceDefaults.autoResumePlayback,
  showInterfaceTips: preferenceDefaults.showInterfaceTips
})

const preferenceInitial = ref({ ...preferenceDefaults })
const preferenceMessage = ref('')

const securityMessage = ref('')
const securityError = ref('')

const planStatusMessage = ref('')
const planErrorMessage = ref('')
const isProcessingCheckout = ref(false)

const LOCAL_PREF_KEY = 'soundroom.userPreferences'

const userEmail = computed(() => user.value?.email ?? 'Unknown user')
const formattedUserId = computed(() => user.value?.id ?? '—')

const planLabel = computed(() => {
  const value = tier.value || 'free'
  return value === 'free'
    ? 'Free'
    : value.charAt(0).toUpperCase() + value.slice(1)
})

function handleManagePlan() {
  //router.push({ path: '/upgrade', query: { manage: '1' } })
  router.push('/manage-plan')
}

function getVariantLabel(theme) {
  if (!theme) return ''

  const scheme = resolvedScheme.value ?? theme.defaultColorScheme ?? 'light'
  const variants = theme.variants ?? {}
  const variant =
    variants[scheme] ||
    variants[theme.defaultColorScheme] ||
    Object.values(variants)[0]

  return variant?.label ?? ''
}

function getThemePreviewStyle(theme) {
  const scheme = resolvedScheme.value ?? theme.defaultColorScheme ?? 'light'
  const swatches = theme.preview?.[scheme] ?? theme.preview?.light ?? []

  if (!Array.isArray(swatches) || swatches.length === 0) {
    return {}
  }

  if (swatches.length === 1) {
    return { backgroundColor: swatches[0] }
  }

  const stops = swatches
    .map((color, index) => {
      const percentage = swatches.length === 1 ? 100 : Math.round((index / (swatches.length - 1)) * 100)
      return `${color} ${percentage}%`
    })
    .join(', ')

  return { background: `linear-gradient(135deg, ${stops})` }
}

function handleThemeSelection(theme) {
  if (!theme) {
    return
  }

  if (theme.unlocked) {
    themeStore.setTheme(theme.id)
    return
  }

  const planLabel = theme.requiredPlanLabel ?? THEME_PLAN_LABELS[theme.availability] ?? 'Pro'
  const copy = getEntitlementCopy('themes')
  entitlementStore.open({
    featureKey: 'themes',
    plan: planLabel,
    title: `Unlock ${theme.label}`,
    message: `Upgrade to the ${planLabel} plan to ${copy.action}.`
  })
}

const PLAN_DISPLAY_NAME = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
}

async function syncCheckoutIfNeeded() {
  if (route.query.checkout !== 'success') {
    return
  }

  const sessionIdParam = route.query.session_id
  const sessionId = Array.isArray(sessionIdParam) ? sessionIdParam[0] : sessionIdParam

  planStatusMessage.value = ''
  planErrorMessage.value = ''
  isProcessingCheckout.value = true

  try {
    if (sessionId) {
      const response = await fetch('/api/sync-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({ error: 'Unable to verify checkout' }))
        throw new Error(errorPayload.error || 'Unable to verify checkout')
      }

      const payload = await response.json()
      primeTier(payload.plan)
      const planName = PLAN_DISPLAY_NAME[payload.plan] || 'Free'
      planStatusMessage.value = `Your ${planName} plan is now active.`
    } else {
      await refreshTier(true)
      const planName = PLAN_DISPLAY_NAME[(tier.value || 'free').toLowerCase()] || 'Free'
      planStatusMessage.value = `Your ${planName} plan is now active.`
    }

    await refreshTier(true)
  } catch (error) {
    console.error('Failed to process checkout sync', error)
    planErrorMessage.value = error?.message || 'Unable to confirm your plan. Please contact support if this persists.'
  } finally {
    isProcessingCheckout.value = false

    const newQuery = { ...route.query }
    delete newQuery.checkout
    delete newQuery.session_id

    router.replace({ query: newQuery })
  }
}

const hasProfileChanges = computed(() => {
  const trimmedName = profileForm.displayName.trim()
  const trimmedAvatar = profileForm.avatarUrl.trim()
  return (
    trimmedName !== (profileInitial.value.displayName ?? '') ||
    trimmedAvatar !== (profileInitial.value.avatarUrl ?? '')
  )
})

const hasPreferenceChanges = computed(() => {
  return Object.keys(preferenceDefaults).some((key) => preferences[key] !== preferenceInitial.value[key])
})

const avatarPreview = computed(() => profileForm.avatarUrl.trim())
const avatarInitial = computed(() => {
  const name = profileForm.displayName || user.value?.user_metadata?.full_name || user.value?.email || 'SR'
  return name.trim().charAt(0).toUpperCase()
})

function handleAvatarError() {
  avatarFailed.value = true
}

function resetProfileErrors() {
  profileErrors.displayName = ''
  profileErrors.avatarUrl = ''
  profileErrorMessage.value = ''
  profileMessage.value = ''
}

function resetProfileForm() {
  profileForm.displayName = profileInitial.value.displayName ?? ''
  profileForm.avatarUrl = profileInitial.value.avatarUrl ?? ''
  avatarFailed.value = false
  resetProfileErrors()
}

function applyPreferences(source) {
  Object.entries(preferenceDefaults).forEach(([key, value]) => {
    preferences[key] = source[key] ?? value
  })
}

function loadPreferences() {
  try {
    const stored = localStorage.getItem(LOCAL_PREF_KEY)
    if (!stored) {
      preferenceInitial.value = { ...preferenceDefaults }
      applyPreferences(preferenceDefaults)
      return
    }

    const parsed = JSON.parse(stored)
    const merged = { ...preferenceDefaults, ...parsed }
    preferenceInitial.value = { ...merged }
    applyPreferences(merged)
  } catch (error) {
    console.warn('Failed to parse stored preferences', error)
    preferenceInitial.value = { ...preferenceDefaults }
    applyPreferences(preferenceDefaults)
  }
}

function resetPreferences() {
  applyPreferences(preferenceDefaults)
  preferenceMessage.value = ''
}

function savePreferences() {
  localStorage.setItem(LOCAL_PREF_KEY, JSON.stringify(preferences))
  preferenceInitial.value = { ...preferences }
  preferenceMessage.value = 'Preferences saved. Nice!'
  setTimeout(() => {
    preferenceMessage.value = ''
  }, 4000)
}

async function fetchProfile() {
  if (!user.value?.id) return

  isFetchingProfile.value = true
  resetProfileErrors()

  try {
    const { data, error, status } = await supabase
      .from('users')
      .select('display_name, avatar_url')
      .eq('id', user.value.id)
      .single()

    if (error && status !== 406) {
      throw error
    }

    const fallbackDisplay = user.value.user_metadata?.full_name || user.value.user_metadata?.name || user.value.email?.split('@')[0] || 'Roomie'
    const fallbackAvatar = user.value.user_metadata?.avatar_url || ''

    const resolvedName = data?.display_name?.trim() || fallbackDisplay
    const resolvedAvatar = data?.avatar_url || fallbackAvatar || ''

    profileForm.displayName = resolvedName
    profileForm.avatarUrl = resolvedAvatar
    avatarFailed.value = false
    profileInitial.value = {
      displayName: resolvedName,
      avatarUrl: resolvedAvatar
    }
  } catch (error) {
    console.error('Failed to fetch profile', error)
    profileErrorMessage.value = 'Unable to load profile right now. Please try again later.'
  } finally {
    isFetchingProfile.value = false
  }
}

async function saveProfile() {
  if (!user.value?.id) return

  resetProfileErrors()

  const trimmedName = profileForm.displayName.trim()
  const trimmedAvatar = profileForm.avatarUrl.trim()

  if (!trimmedName) {
    profileErrors.displayName = 'Display name is required.'
    return
  }

  if (trimmedAvatar) {
    try {
      new URL(trimmedAvatar)
    } catch (error) {
      profileErrors.avatarUrl = 'Enter a valid URL for your avatar.'
      return
    }
  }

  profileSaving.value = true
  profileMessage.value = ''

  try {
    const updates = {
      id: user.value.id,
      display_name: trimmedName,
      avatar_url: trimmedAvatar || null
    }

    const { error } = await supabase
      .from('users')
      .upsert(updates, { onConflict: 'id' })

    if (error) {
      throw error
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        full_name: trimmedName,
        avatar_url: trimmedAvatar || null
      }
    })

    if (authError) {
      console.warn('Failed to update auth metadata', authError)
    }

    localStorage.setItem('userProfile', JSON.stringify({
      display_name: trimmedName,
      avatar_url: trimmedAvatar || null
    }))

    profileInitial.value = {
      displayName: trimmedName,
      avatarUrl: trimmedAvatar
    }

    profileMessage.value = 'Profile updated!'
  } catch (error) {
    console.error('Saving profile failed', error)
    profileErrorMessage.value = 'We could not save your changes. Please try again.'
  } finally {
    profileSaving.value = false
  }
}

async function signOutCurrentSession() {
  securityMessage.value = ''
  securityError.value = ''

  const { error } = await supabase.auth.signOut()
  if (error) {
    securityError.value = 'Unable to sign out right now. Please try again.'
    console.error('Sign out failed', error)
    return
  }

  securityMessage.value = 'Signed out successfully. Redirecting to login…'
  localStorage.removeItem('userProfile')
  setTimeout(() => {
    router.push('/login')
  }, 800)
}

let lastFetchedUserId = ''

watch(
  () => ({ loaded: sessionLoaded.value, id: user.value?.id }),
  ({ loaded, id }) => {
    if (!loaded || !id) return
    if (id === lastFetchedUserId) return
    lastFetchedUserId = id
    fetchProfile()
  },
  { immediate: true }
)

watch(
  () => profileForm.avatarUrl,
  () => {
    avatarFailed.value = false
  }
)

watch(hasProfileChanges, (dirty) => {
  if (dirty) {
    profileMessage.value = ''
  }
})

watch(hasPreferenceChanges, (dirty) => {
  if (dirty) {
    preferenceMessage.value = ''
  }
})

onMounted(() => {
  loadPreferences()
  syncCheckoutIfNeeded()
})
</script>
