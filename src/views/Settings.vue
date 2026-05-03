<template>
  <main class="flex-1 overflow-y-auto bg-surface-app text-text-primary">
    <div class="max-w-5xl mx-auto px-6 py-10 space-y-10">
      <section class="space-y-4">
        <div class="flex items-center justify-between gap-6 flex-wrap">
          <div class="flex items-start gap-4 flex-wrap">
            <RouterLink :to="{ name: 'app' }">
              <BaseButton
                type="button"
                variant="naked"
                class="flex items-center gap-2 text-text-muted hover:text-text-primary"
              >
                <span aria-hidden="true">←</span>
                <span>Back</span>
              </BaseButton>
            </RouterLink>
            <div class="space-y-2">
              <h1 class="text-3xl font-semibold tracking-tight">Settings</h1>
              <p class="text-sm text-text-muted max-w-xl">
                Update how you appear in SoundRoom, adjust playback preferences, and keep your account secure.
              </p>
            </div>
          </div>
          <div class="flex items-center gap-3 rounded-full border border-border-subtle px-4 py-2 bg-[color-mix(in_srgb,var(--color-bg-surface)_85%,transparent)]">
            <span class="text-xs uppercase tracking-wide text-text-muted">Plan</span>
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
            isProcessingCheckout ? 'border-accent-soft bg-[rgba(var(--color-accent-rgb),0.12)] text-text-primary' : '',
            planStatusMessage && !isProcessingCheckout ? 'border-status-success bg-[rgba(var(--color-success-rgb),0.12)] text-text-primary' : '',
            planErrorMessage ? 'border-status-danger bg-[rgba(var(--color-danger-rgb),0.12)] text-text-primary' : '',
          ]"
        >
          <p v-if="isProcessingCheckout" class="text-sm font-medium">Processing your plan change…</p>
          <p v-else-if="planStatusMessage" class="text-sm font-medium">{{ planStatusMessage }}</p>
          <p v-else-if="planErrorMessage" class="text-sm font-medium">{{ planErrorMessage }}</p>
        </div>

        <div class="rounded-2xl border border-border-subtle bg-[color-mix(in_srgb,var(--color-bg-surface)_85%,transparent)] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p class="text-sm text-text-muted">Signed in as</p>
            <p class="text-lg font-medium break-all">{{ userEmail }}</p>
          </div>
          <div class="flex items-center gap-4">
            <div class="relative w-16 h-16 rounded-full bg-surface-raised flex items-center justify-center overflow-hidden text-xl font-semibold border border-border-subtle">
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
              <p class="text-sm text-text-muted">Display name</p>
              <p class="text-base font-medium">{{ profileForm.displayName || '—' }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-border-subtle bg-[color-mix(in_srgb,var(--color-bg-surface)_88%,transparent)] p-6 shadow-sm space-y-6">
        <header class="space-y-2">
          <h2 class="text-xl font-semibold">Profile</h2>
          <p class="text-sm text-text-muted">Set how collaborators (coming soon) see you.</p>
        </header>

        <div v-if="isFetchingProfile" class="space-y-4 animate-pulse">
          <div class="h-4 bg-[var(--color-bg-elevated)] rounded"></div>
          <div class="h-4 bg-[var(--color-bg-elevated)] rounded w-2/3"></div>
          <div class="h-40 bg-[var(--color-bg-elevated)] rounded"></div>
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
              :disabled="profileSaving || true"
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
              class="text-sm text-text-muted hover:text-text-primary transition"
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

          <p v-if="profileMessage" class="text-sm text-status-success">{{ profileMessage }}</p>
          <p v-if="profileErrorMessage" class="text-sm text-status-danger">{{ profileErrorMessage }}</p>
        </form>
      </section>

      <ThemeSelector />

      <section class="rounded-2xl border border-border-subtle bg-[color-mix(in_srgb,var(--color-bg-surface)_88%,transparent)] p-6 shadow-sm space-y-6">
        <header class="space-y-2">
          <h2 class="text-xl font-semibold">Playback Preferences</h2>
          <p class="text-sm text-text-muted">These settings are stored locally in your browser.</p>
        </header>

        <div class="space-y-6">
          <div class="flex items-start justify-between gap-6">
            <div>
              <h3 class="text-base font-medium">Auto-resume sessions</h3>
              <p class="text-sm text-text-muted">Automatically reload your last SoundRoom when you sign back in.</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer select-none">
              <input type="checkbox" class="sr-only peer" v-model="preferences.autoResumePlayback">
              <span class="block w-12 h-6 rounded-full bg-[var(--color-border-subtle)] transition-colors peer-focus:outline peer-focus:outline-2 peer-focus:outline-[var(--color-focus-ring)] peer-checked:bg-accent-strong"></span>
              <span class="absolute left-1 top-1 block w-4 h-4 rounded-full bg-text-inverse shadow transition-transform peer-checked:translate-x-6"></span>
            </label>
          </div>

          <div class="flex items-start justify-between gap-6">
            <div>
              <h3 class="text-base font-medium">Show interface tips</h3>
              <p class="text-sm text-text-muted">Keep lightweight reminders visible for keyboard shortcuts and best practices.</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer select-none">
              <input type="checkbox" class="sr-only peer" v-model="preferences.showInterfaceTips">
              <span class="block w-12 h-6 rounded-full bg-[var(--color-border-subtle)] transition-colors peer-focus:outline peer-focus:outline-2 peer-focus:outline-[var(--color-focus-ring)] peer-checked:bg-accent-strong"></span>
              <span class="absolute left-1 top-1 block w-4 h-4 rounded-full bg-text-inverse shadow transition-transform peer-checked:translate-x-6"></span>
            </label>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            class="text-sm text-text-muted hover:text-text-primary transition"
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
        <p v-if="preferenceMessage" class="text-sm text-status-success">{{ preferenceMessage }}</p>
      </section>

      <section class="rounded-2xl border border-border-subtle bg-[color-mix(in_srgb,var(--color-bg-surface)_88%,transparent)] p-6 shadow-sm space-y-6">
        <header class="space-y-2">
          <h2 class="text-xl font-semibold">Security</h2>
          <p class="text-sm text-text-muted">Keep your account protected and up to date.</p>
        </header>

        <div class="space-y-6">
          <div class="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h3 class="text-base font-medium">Password</h3>
              <p class="text-sm text-text-muted">Use a strong password to protect your SoundRoom sessions and purchases.</p>
            </div>
            <RouterLink to="/update-password">
              <BaseButton type="button">Update password</BaseButton>
            </RouterLink>
          </div>

          <div class="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h3 class="text-base font-medium">Sign out</h3>
              <p class="text-sm text-text-muted">Need to switch devices? Sign out to end your session on this browser.</p>
            </div>
            <BaseButton type="button" @click="signOutCurrentSession">Sign out of this device</BaseButton>
          </div>
        </div>

        <p v-if="securityMessage" class="text-sm text-status-success">{{ securityMessage }}</p>
        <p v-if="securityError" class="text-sm text-status-danger">{{ securityError }}</p>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import BaseInput from '@/components/ui/input/BaseInput.vue'
import ThemeSelector from '@/components/Settings/ThemeSelector.vue'
import { useAuth } from '@/composables/useAuth'
import { supabase } from '@/utils/supabase'
import { resetRoomState } from '@/utils/resetRoomState'

const router = useRouter()
const route = useRoute()
const { user, sessionLoaded, tier, refreshTier, primeTier } = useAuth()

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
  router.push({ name: 'manage-plan'})
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

function loadPreferencesFromLocal() {
  try {
    const stored = localStorage.getItem(LOCAL_PREF_KEY)
    if (!stored) {
      preferenceInitial.value = { ...preferenceDefaults }
      applyPreferences(preferenceDefaults)
      return preferenceDefaults
    }

    const parsed = JSON.parse(stored)
    const merged = { ...preferenceDefaults, ...parsed }
    preferenceInitial.value = { ...merged }
    applyPreferences(merged)
    return merged
  } catch (error) {
    console.warn('Failed to parse stored preferences', error)
    preferenceInitial.value = { ...preferenceDefaults }
    applyPreferences(preferenceDefaults)
    return preferenceDefaults
  }
}

async function loadPreferences() {
  const localPreferences = loadPreferencesFromLocal()

  if (!user.value?.id) {
    return
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('settings')
      .eq('id', user.value.id)
      .maybeSingle()

    if (error) throw error

    const remotePreferences = {
      ...preferenceDefaults,
      ...(data?.settings?.preferences ?? {}),
    }

    preferenceInitial.value = { ...remotePreferences }
    applyPreferences(remotePreferences)
    localStorage.setItem(LOCAL_PREF_KEY, JSON.stringify(remotePreferences))
  } catch (error) {
    console.warn('Failed to load preferences from Supabase, keeping local copy', error)
    preferenceInitial.value = { ...localPreferences }
    applyPreferences(localPreferences)
  }
}

function resetPreferences() {
  applyPreferences(preferenceDefaults)
  preferenceMessage.value = ''
}

async function savePreferences() {
  // save to local storage first
  localStorage.setItem(LOCAL_PREF_KEY, JSON.stringify(preferences))
  preferenceInitial.value = { ...preferences }

  // now sync to supabase
  if (user.value?.id) {
    try {
      // fetch current settings
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('settings')
        .eq('id', user.value.id)
        .single()

      if (fetchError) throw fetchError

      const currentSettings = data?.settings ?? {}

      const newSettings = {
        ...currentSettings,
        preferences: {
          ...currentSettings.preferences,
          ...preferences,
        }
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ settings: newSettings })
        .eq('id', user.value.id)

      if (updateError) throw updateError

      preferenceMessage.value = 'Preferences saved.'
      setTimeout(() => (preferenceMessage.value = ''), 4000)

    } catch (err) {
      console.error('Failed to sync preferences', err)
      preferenceMessage.value = 'Preferences saved locally (sync failed).'
    }
  } else {
    // user not logged in
    preferenceMessage.value = 'Preferences saved locally.'
  }
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
      display_name: trimmedName,
      avatar_url: trimmedAvatar || null
    }

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.value.id)

    if (error) {
      throw error
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
  resetRoomState()

  const { error } = await supabase.auth.signOut()
  if (error) {
    securityError.value = 'Unable to sign out right now. Please try again.'
    console.error('Sign out failed', error)
    return
  }

  securityMessage.value = 'Signed out successfully. Redirecting to login…'
  localStorage.removeItem('userProfile')
  setTimeout(() => {
    router.push({ name: 'login' })
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
