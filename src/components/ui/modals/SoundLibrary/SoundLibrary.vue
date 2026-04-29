<template>
  <div
    @click.self="router.push({ name: 'app' })"
    class="modal-backdrop"
  >
    <div class="modal-panel flex">
      <CategoryList
        :categories="categories"
        :active="activeCategory"
        @update:active="val => activeCategory = val"
      />

      <SoundGrid
        ref="gridRef"
        :sounds="filteredSounds"
        :waiting="waiting"
        :soundLibrarySources="soundLibrarySources"
        :currentlyPlayingId="currentlyPlayingId"
        :activeCategory="activeCategory"
        @close="router.push({ name: 'app' })"
        @toggleSound="toggleAddSource"
        @updateCurrent="currentlyPlayingId = $event"
        @upload="showUploadPanel = true"
        @delete="promptDeleteSound"
        @locked="handleLockedSound"
        @update:activeCategory="val => activeCategory = val"
      />
     
    </div>
  <UploadPanel v-if="showUploadPanel" @close="showUploadPanel = false" @finished="refreshUserSounds" />
    <YesNoModal
      v-if="deleteSoundModalVisible"
      :yesFunction="doDeleteSound"
      :noFunction="cancelDeleteSound"
      message="Are you sure you want to delete this sound?"
      title="Delete Sound"
      @close="cancelDeleteSound"
    />
  </div>
  
  
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'

import { supabase } from '@/utils/supabase'

import CategoryList from '@/components/ui/modals/SoundLibrary/CategoryList.vue'
import SoundGrid from '@/components/ui/modals/SoundLibrary/SoundGrid.vue'
import UploadPanel from '@/components/ui/modals/SoundLibrary/UploadPanel.vue'
import YesNoModal from '@/components/ui/modals/YesNoModal.vue'
import { useRouter } from 'vue-router'

import { useAudioCacheStore } from '@/stores/useAudioCacheStore'
import { useActionManagerStore } from '@/stores/useActionManagerStore'
import { useAuth } from '@/composables/useAuth'
import { useEntitlements } from '@/composables/useEntitlements'
import { registerSoundRoomActions } from '@/composables/useSoundRoomActions'
import { storeToRefs } from 'pinia'
import deleteAudio from '@/utils/deleteAudio'
import { annotateSoundAccess } from '@/utils/soundEntitlements'
import { purgeSoundCache, removeDeletedSoundFromRooms } from '@/utils/soundIntegrity'
import { buildStorageKey } from '@/utils/downloadAudio'


const { user, isAuthenticated, tier } = useAuth()
const { canAccess, requireEntitlement } = useEntitlements()

const router = useRouter()
const cacheStore = useAudioCacheStore()
const actionStore = useActionManagerStore()
registerSoundRoomActions()
const { waiting } = storeToRefs(actionStore)
const { soundLibrarySources } = storeToRefs(cacheStore)
const showUploadPanel = ref(false)
const deleteSoundModalVisible = ref(false)
const soundToDelete = ref(null)

const categories = [
  { id: 'nature', label: 'Nature' },
  { id: 'human', label: 'Human' },
  { id: 'musical', label: 'Musical' },
  { id: 'tools', label: 'Work & Focus' },
  { id: 'atmospheric', label: 'Atmospheric' },
  { id: 'misc', label: 'Misc' },
]

/**
 * Toggle whether a sound is included in the current library selection.
 * Removes it when already present otherwise marks it for sending.
 *
 * @param {Object} s - sound record from the grid
 * @returns {Promise<void>}
 */
async function toggleAddSource(s) {
  const existing = soundLibrarySources.value.find((sound) => s.libraryId == sound.libraryId)
  if (!existing && s.locked) {
    handleLockedSound(s)
    return
  }
  // if source in soundlibrarysources (draggable sources), delete, otherwise add
  if (existing) {
    s.send = true
    await actionStore.deleteLibrarySoundSource(s)
    s.send = false
  } else {
    s.send = true
    await actionStore.addLibrarySoundSource(s)
    s.send = false
  }
}

const currentlyPlayingId = ref(null) // id of current sound playing to stop multiple previews playing at once

function handleLockedSound(sound) {
  if (sound.accessReason === 'ownership') {
    console.info('This sound belongs to another user.')
    return
  }

  const feature = sound.entitlementFeature
  if (!feature) return

  requireEntitlement(feature, {
    requiredPlan: sound.requiredPlan ?? sound.plan_tier,
    title: `Unlock ${sound.name}`
  })
}

const activeCategory = ref('')
const gridRef = ref(null) // ref to SoundGrid component
const rawSounds = ref([])
const categorySoundCache = ref([])
const hasFetchedCategorySounds = ref(false)
const filteredSounds = computed(() => {
  const userTier = tier.value
  const userId = user.value?.id
  const canUpload = canAccess('canUpload')
  return rawSounds.value.map(sound => annotateSoundAccess(sound, { userTier, userId, canUpload }))
})
watch(
  activeCategory,
  async (newCategory) => {
    currentlyPlayingId.value = null
    await nextTick()
    gridRef.value?.scrollTop() // scroll up when new category is selected

    if (newCategory === 'your-sounds') {
      rawSounds.value = []
      const userSounds = await listUserSounds()
      rawSounds.value = mapLibraryRows(userSounds)
      return
    }

    await ensureCategorySoundsLoaded()
    const cachedCategorySounds = newCategory
      ? categorySoundCache.value.filter((sound) => sound.bucket === newCategory)
      : categorySoundCache.value
    rawSounds.value = mapLibraryRows(cachedCategorySounds)
  },
  { immediate: true }
) // run at least once, like a do while

const refreshUserSounds = async () => {
  if (activeCategory.value === 'your-sounds') {
    const sounds = await listUserSounds()
    rawSounds.value = mapLibraryRows(sounds)
  }
}

function promptDeleteSound(sound) {
  soundToDelete.value = sound
  deleteSoundModalVisible.value = true
}

function cancelDeleteSound() {
  deleteSoundModalVisible.value = false
  soundToDelete.value = null
}

async function doDeleteSound() {
  if (!soundToDelete.value) return
  const s = soundToDelete.value
  try {
    const cacheEntry = soundLibrarySources.value.find(sound => sound.libraryId == s.libraryId)
    if (soundLibrarySources.value.find(sound => sound.libraryId == s.libraryId)) {
      await actionStore.deleteLibrarySoundSource(s)
    }
    const storageKey = s.bucket && s.path ? buildStorageKey(s.plan_tier ?? 'users', s.bucket, s.path) : cacheEntry?.storageKey
    await deleteAudio(s.bucket, s.path, s.plan_tier ?? 'users')
    await supabase.from('sound_files').delete().eq('id', s.libraryId)
    await purgeSoundCache(s.libraryId)
    if (storageKey) await purgeSoundCache(storageKey)
    if (cacheEntry?.audioPath) await purgeSoundCache(cacheEntry.audioPath)
    await removeDeletedSoundFromRooms(s.libraryId)
    await refreshUserSounds()
  } catch (error) {
    console.error('Failed to delete user sound:', error)
  }
  cancelDeleteSound()
  
}

/**
 * Retrieve the sounds for the currently active category from Supabase.
 *
 * @returns {Promise<Array>} list of sound metadata records
 */
async function ensureCategorySoundsLoaded() {
  if (hasFetchedCategorySounds.value) return

  const categoryIds = categories.map(({ id }) => id)
  const { data, error } = await supabase
    .from('sound_files')
    .select('id, name, bucket, tags, description, path, preview_url, duration_seconds, preview_duration_seconds, owner_id, plan_tier, required_plan, base')
    .in('bucket', categoryIds)

  if (error) {
    console.error('Failed to list category files:', error)
    categorySoundCache.value = []
    return
  }

  categorySoundCache.value = data ?? []
  hasFetchedCategorySounds.value = true
}

function normalizeTags(rawTags) {
  if (Array.isArray(rawTags)) {
    return rawTags.map((tag) => String(tag).trim()).filter(Boolean)
  }

  if (typeof rawTags === 'string') {
    return rawTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }

  return []
}

function mapLibraryRows(rows = []) {
  return rows.map(({ id, tags, ...rest }) => ({
    libraryId: id,
    tags: normalizeTags(tags),
    ...rest
  }))
}

/**
 * Retrieve the sounds uploaded by the authenticated user.
 */

async function listUserSounds() {
  const userId = user.value?.id
  if (!isAuthenticated.value || !userId) return []

  const { data, error } = await supabase
    .from('sound_files')
    .select('id, name, bucket, tags, description, path, preview_url, duration_seconds, preview_duration_seconds, owner_id, plan_tier, required_plan, base')
    .eq('owner_id', userId)
  if (error) {
    console.error('Failed to list user sounds:', error)
    return []
  }
  return data
}

</script>

<style scoped>
.marquee-text-text {
  margin-left: 20px;
}

@media (prefers-color-scheme: light) {
  .load-button {
    background-color: var(--color-panel);
  }
}

</style>
