<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import DirectoryPicker from './DirectoryPicker.vue'
import FileReview from './FileReview.vue'
import { BUCKET_OPTIONS } from './utils/categoryList'
import { loadPersistedState, persistState } from './utils/localStore'
import { uploadFileAndInsert } from './utils/SoundUploader'
import { supabase } from './utils/supabaseClient'
import { PLANS } from '@app/constants/entitlements'

const supportedPlanTiers = PLANS ?? ['free', 'basic', 'pro']

function normalizeBucket(bucketValue) {
  if (!bucketValue) return ''
  return bucketValue
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}
const files = ref([])
const currentIndex = ref(0)
const uploadedMap = ref({})
const drafts = reactive({})
const toast = ref(null)
const uploading = ref(false)
const user = ref(null)
const sessionChecked = ref(false)
const directoryName = ref(null)
const email = ref('')
const password = ref('')
const authLoading = ref(false)
const authError = ref(null)

function hydrateFromPersistence() {
  const stored = loadPersistedState()
  if (typeof stored.currentIndex === 'number') {
    currentIndex.value = stored.currentIndex
  }
  if (stored.uploadedMap) {
    uploadedMap.value = { ...stored.uploadedMap }
  }
  if (stored.drafts) {
    Object.assign(drafts, stored.drafts)
  }
  if (stored.lastDirectoryName) {
    directoryName.value = stored.lastDirectoryName
  }
}

hydrateFromPersistence()

watch(
  () => currentIndex.value,
  (value) => persistState({ currentIndex: value })
)

watch(
  uploadedMap,
  (value) => {
    persistState({ uploadedMap: value })
  },
  { deep: true }
)

watch(
  drafts,
  () => persistState({ drafts: { ...drafts } }),
  { deep: true }
)

async function initAuth() {
  const { data } = await supabase.auth.getUser()
  user.value = data.user ?? null
  sessionChecked.value = true
  supabase.auth.onAuthStateChange((_event, session) => {
    user.value = session?.user ?? null
  })
}

onMounted(initAuth)

async function signIn() {
  if (!email.value || !password.value || authLoading.value) return
  authLoading.value = true
  authError.value = null
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })
    if (error) throw error
    user.value = data.user ?? data.session?.user ?? null
  } catch (error) {
    authError.value = error.message || 'Sign-in failed'
  } finally {
    authLoading.value = false
  }
}

async function signOut() {
  await supabase.auth.signOut()
  user.value = null
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

function baseFileDraft(relativePath, file, index) {
  const storedDraft = drafts[relativePath] ?? {}
  return {
    id: `${index}-${relativePath}`,
    originalName: file.name,
    name: storedDraft.name || file.name.replace(/\.[^.]+$/, ''),
    size: file.size,
    sizeLabel: formatBytes(file.size),
    mime_type: file.type,
    tags: storedDraft.tags || [],
    cone_inner: storedDraft.cone_inner ?? 30,
    cone_outer: storedDraft.cone_outer ?? 60,
    plan_tier: storedDraft.plan_tier || supportedPlanTiers.at(-1),
    bucket:
      normalizeBucket(storedDraft.bucket || storedDraft.category) ||
      BUCKET_OPTIONS[0]?.value || '',
    duration_seconds: storedDraft.duration_seconds ?? null,
    relativePath,
    uploaded: Boolean(uploadedMap.value[relativePath]),
    previewUrl: URL.createObjectURL(file),
    file,
    error: null
  }
}

function cacheDraft(relativePath, patch) {
  drafts[relativePath] = { ...(drafts[relativePath] || {}), ...patch }
}

function handleDirectoryLoaded(payload) {
  files.value.forEach((entry) => URL.revokeObjectURL(entry.previewUrl))
  const nextFiles = payload.files.map(({ file, relativePath }, index) =>
    baseFileDraft(relativePath, file, index)
  )
  files.value = nextFiles
  directoryName.value = payload.directoryName
  persistState({ lastDirectoryName: payload.directoryName })
  if (currentIndex.value >= files.value.length) {
    currentIndex.value = 0
  }
}

const currentFile = computed(() => files.value[currentIndex.value] ?? null)

const uploadBlockedReason = computed(() => {
  if (!currentFile.value) return null
  if (!user.value) return 'Sign in via Supabase before uploading.'
  if (!currentFile.value.duration_seconds) return 'Waiting for audio duration metadata.'
  return null
})

function updateField({ field, value }) {
  if (!currentFile.value) return
  currentFile.value[field] = value
  cacheDraft(currentFile.value.relativePath, { [field]: value })
}

function handleDuration(duration) {
  if (!currentFile.value) return
  const rounded = Math.round(duration * 1000) / 1000
  updateField({ field: 'duration_seconds', value: rounded })
}

function nextFile() {
  if (currentIndex.value < files.value.length - 1) {
    currentIndex.value += 1
  }
}

function prevFile() {
  if (currentIndex.value > 0) {
    currentIndex.value -= 1
  }
}

function showToast(message, variant = 'error') {
  const id = Date.now()
  toast.value = { id, message, variant }
  setTimeout(() => {
    if (toast.value?.id === id) {
      toast.value = null
    }
  }, 5000)
}

async function uploadCurrent() {
  if (!currentFile.value || uploading.value) return
  if (!user.value) {
    showToast('Please authenticate in Supabase before uploading.')
    return
  }

  const fileEntry = currentFile.value
  const normalizedBucket = normalizeBucket(fileEntry.bucket)

  const metadata = {
    name: fileEntry.name,
    tags: fileEntry.tags,
    duration_seconds: fileEntry.duration_seconds,
    cone_inner: fileEntry.cone_inner,
    cone_outer: fileEntry.cone_outer,
    plan_tier: fileEntry.plan_tier,
    bucket: normalizedBucket
  }

  if (!metadata.bucket) {
    showToast('Select a bucket before uploading.')
    return
  }

  if (!metadata.duration_seconds) {
    showToast('Duration missing — wait for audio metadata before uploading.')
    return
  }

  uploading.value = true
  try {
    await uploadFileAndInsert({
      file: fileEntry.file,
      userId: user.value.id,
      planTier: metadata.plan_tier,
      bucket: metadata.bucket,
      metadata
    })
    fileEntry.uploaded = true
    uploadedMap.value = { ...uploadedMap.value, [fileEntry.relativePath]: true }
    cacheDraft(fileEntry.relativePath, { uploaded: true })
    nextFile()
  } catch (error) {
    console.error('[admin-ingest] Upload failed', error)
    showToast(error.message || 'Upload failed')
  } finally {
    uploading.value = false
  }
}

const totalFiles = computed(() => files.value.length)
const uploadedCount = computed(() => Object.values(uploadedMap.value || {}).filter(Boolean).length)
</script>

<template>
  <main class="min-h-screen bg-gray-950 text-gray-100">
    <div class="max-w-6xl mx-auto py-14 px-6 space-y-12">
      <!-- Header -->
      <header class="space-y-2 pb-6 border-b border-gray-800">
        <h1 class="text-4xl font-bold tracking-tight">SoundRoom — Admin Ingest</h1>
        <p class="text-sm text-gray-400 leading-relaxed max-w-2xl">
          Local-only tool for bulk ingestion of curated audio assets.
          Authentication is routed through Supabase. Uploads write to Cloudflare R2 following the production directory structure.
        </p>
      </header>

      <!-- Auth helper -->
      <section class="bg-gray-900 rounded-2xl border border-gray-800 shadow-lg p-8 space-y-4">
        <div class="flex justify-between items-start gap-4 flex-col sm:flex-row sm:items-center">
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-gray-100">Supabase authentication</h2>
            <p class="text-sm text-gray-400">
              Sign in with the same credentials you use in Supabase Auth. The session is stored locally, so you only need to sign in once per browser.
            </p>
          </div>
          <span class="text-sm text-gray-300 font-medium">{{ user ? `Signed in as ${user.email}` : 'Not signed in' }}</span>
        </div>

        <div v-if="!user" class="grid gap-4 sm:grid-cols-3">
          <label class="space-y-1 text-sm text-gray-300 font-medium">
            Email
            <input
              v-model="email"
              type="email"
              class="w-full bg-gray-800/70 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 focus:(outline-none ring-2 ring-emerald-500)"
              placeholder="you@example.com"
            />
          </label>

          <label class="space-y-1 text-sm text-gray-300 font-medium">
            Password
            <input
              v-model="password"
              type="password"
              class="w-full bg-gray-800/70 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 focus:(outline-none ring-2 ring-emerald-500)"
              placeholder="••••••••"
            />
          </label>

          <div class="flex items-end">
            <button
              type="button"
              class="w-full px-4 py-2 rounded-md bg-emerald-500 text-black font-semibold hover:bg-emerald-400 disabled:opacity-50"
              :disabled="authLoading || !email || !password"
              @click="signIn"
            >
              {{ authLoading ? 'Signing in…' : 'Sign in' }}
            </button>
          </div>
        </div>

        <div v-else class="flex items-center gap-3 text-sm text-gray-300">
          <span class="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">Authenticated</span>
          <button
            type="button"
            class="px-3 py-1 rounded-md bg-gray-800 border border-gray-700 text-gray-200 hover:bg-gray-700"
            @click="signOut"
          >
            Sign out
          </button>
        </div>

        <p v-if="authError" class="text-sm text-red-300">{{ authError }}</p>
      </section>

      <!-- Directory picker -->
      <section class="bg-gray-900 rounded-2xl border border-gray-800 shadow-lg p-8">
        <DirectoryPicker @directory-loaded="handleDirectoryLoaded" />
      </section>

      <!-- File Review -->
      <section v-if="currentFile" class="space-y-8">
        <div class="flex justify-between items-center text-sm text-gray-400">
          <div>
            <span class="text-gray-500">Directory:</span>
            <span class="text-gray-300 font-medium">
              {{ directoryName || 'None selected' }}
            </span>
          </div>

          <div>
            <span class="text-gray-500">Auth:</span>
            <span v-if="sessionChecked" class="text-gray-300 font-medium">
              {{ user ? user.email : 'Sign in via Supabase Auth UI' }}
            </span>
            <span v-else class="text-gray-500">Checking session…</span>
          </div>
        </div>

        <FileReview
          :file-entry="currentFile"
          :index="currentIndex"
          :total="totalFiles"
          :plan-options="supportedPlanTiers"
          :buckets="BUCKET_OPTIONS"
          :uploading="uploading"
          :upload-blocked-reason="uploadBlockedReason"
          @update-field="updateField"
          @duration-detected="handleDuration"
          @upload="uploadCurrent"
          @next="nextFile"
          @previous="prevFile"
        />
      </section>

      <!-- Empty state -->
      <div
        v-else
        class="text-center py-24 rounded-2xl border border-dashed border-gray-700 bg-gray-900/40"
      >
        <p class="text-gray-400 text-lg font-medium mb-1">No directory selected</p>
        <p class="text-gray-500 text-sm">
          Choose a folder to begin reviewing and ingesting audio files.
        </p>
      </div>

      <!-- Progress footer -->
      <footer class="text-xs text-gray-500 pt-8">
        Progress:
        <span class="text-gray-300 font-semibold">
          {{ uploadedCount }} / {{ totalFiles }}
        </span>
        uploaded
      </footer>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div
        v-if="toast"
        class="fixed bottom-6 right-6 px-4 py-2 rounded-lg shadow-xl backdrop-blur-sm text-black"
        :class="toast.variant === 'error'
          ? 'bg-red-500/90'
          : 'bg-emerald-500/90'"
      >
        {{ toast.message }}
      </div>
    </transition>
  </main>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
