<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import DirectoryPicker from './DirectoryPicker.vue'
import FileReview from './FileReview.vue'
import { CATEGORY_OPTIONS } from './utils/categoryList'
import { loadPersistedState, persistState } from './utils/localStore'
import { uploadFileAndInsert } from './utils/SoundUploader'
import { supabase } from './utils/supabaseClient'
import { PLANS } from '@app/constants/entitlements'

const supportedPlanTiers = PLANS ?? ['free', 'basic', 'pro']
const files = ref([])
const currentIndex = ref(0)
const uploadedMap = ref({})
const drafts = reactive({})
const toast = ref(null)
const uploading = ref(false)
const user = ref(null)
const sessionChecked = ref(false)
const directoryName = ref(null)

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
    category: storedDraft.category || CATEGORY_OPTIONS[0],
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
  const metadata = {
    name: fileEntry.name,
    tags: fileEntry.tags,
    duration_seconds: fileEntry.duration_seconds,
    cone_inner: fileEntry.cone_inner,
    cone_outer: fileEntry.cone_outer,
    plan_tier: fileEntry.plan_tier,
    category: fileEntry.category
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
  <main class="min-h-screen bg-gray-900 text-gray-100">
    <div class="max-w-6xl mx-auto py-10 px-6 space-y-6">
      <h1 class="text-3xl font-bold">SoundRoom Admin Ingest</h1>
      <p class="text-sm text-gray-400">
        Local-only helper for bulk ingesting cleaned libraries. Auth is routed through Supabase, uploads
        mirror the production path (Cloudflare R2 → public.sound_files).
      </p>

      <DirectoryPicker @directory-loaded="handleDirectoryLoaded" />

      <section v-if="currentFile" class="space-y-4">
        <div class="flex items-center justify-between text-sm text-gray-400">
          <div>{{ directoryName ? `Directory: ${directoryName}` : 'No directory selected yet' }}</div>
          <div>
            Auth: <span v-if="sessionChecked">{{ user ? user.email : 'Sign in via Supabase Auth UI' }}</span>
            <span v-else>Checking session…</span>
          </div>
        </div>

        <FileReview
          :file-entry="currentFile"
          :index="currentIndex"
          :total="totalFiles"
          :plan-options="supportedPlanTiers"
          :categories="CATEGORY_OPTIONS"
          :uploading="uploading"
          @update-field="updateField"
          @duration-detected="handleDuration"
          @upload="uploadCurrent"
          @next="nextFile"
          @previous="prevFile"
        />
      </section>

      <div v-else class="text-center text-gray-500 py-20 border border-dashed border-gray-700 rounded-xl">
        Select a directory to begin.
      </div>

      <div class="text-xs text-gray-500">Progress: {{ uploadedCount }} / {{ totalFiles }} uploaded.</div>
    </div>

    <transition name="fade">
      <div
        v-if="toast"
        class="fixed bottom-6 right-6 px-4 py-2 rounded-lg"
        :class="toast?.variant === 'error' ? 'bg-red-500/90 text-black' : 'bg-emerald-500/90 text-black'"
      >
        {{ toast?.message }}
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
