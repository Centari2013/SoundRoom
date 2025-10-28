<template>
  <main class="flex-1 overflow-y-auto bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
    <div class="max-w-5xl mx-auto px-6 py-10 space-y-10">
      <section class="space-y-4">
        <div class="flex items-center justify-between gap-6 flex-wrap">
          <div class="space-y-2">
            <h1 class="text-3xl font-semibold tracking-tight">Settings</h1>
            <p class="text-sm text-neutral-600 dark:text-neutral-400 max-w-xl">
              Update how you appear in SoundRoom, adjust playback preferences, and keep your account secure.
            </p>
          </div>
          <div class="flex items-center gap-3 rounded-full border border-neutral-200 dark:border-neutral-800 px-4 py-2 bg-white/70 dark:bg-neutral-900/70">
            <span class="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Plan</span>
            <span class="text-sm font-medium">{{ planLabel }}</span>
            <RouterLink :to="tier.value === 'free' ? '/upgrade' : 'https://billing.stripe.com/p/login/7sY9AScjvcjKayEfItbsc00'" class="ml-2">
              <BaseButton type="button">
                {{ tier.value === 'free' ? 'Upgrade Plan' : 'Manage Plan' }}
              </BaseButton>
            </RouterLink>
          </div>
        </div>

        <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">Signed in as</p>
            <p class="text-lg font-medium break-all">{{ userEmail }}</p>
          </div>
          <div class="flex items-center gap-4">
            <div class="relative w-16 h-16 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center overflow-hidden text-xl font-semibold">
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

      <section class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 p-6 shadow-sm space-y-6">
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

      <section class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 p-6 shadow-sm space-y-6">
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
              <span class="absolute left-1 top-1 block w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-6"></span>
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
              <span class="absolute left-1 top-1 block w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-6"></span>
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

      <section class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 p-6 shadow-sm space-y-6">
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
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import BaseInput from '@/components/ui/input/BaseInput.vue'
import { useAuth } from '@/composables/useAuth'
import { supabase } from '@/utils/supabase'

const router = useRouter()
const { user, sessionLoaded, tier } = useAuth()

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

const LOCAL_PREF_KEY = 'soundroom.userPreferences'

const userEmail = computed(() => user.value?.email ?? 'Unknown user')
const formattedUserId = computed(() => user.value?.id ?? '—')

const planLabel = computed(() => {
  const value = tier.value || 'free'
  return value === 'free'
    ? 'Free'
    : value.charAt(0).toUpperCase() + value.slice(1)
})

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
})
</script>
