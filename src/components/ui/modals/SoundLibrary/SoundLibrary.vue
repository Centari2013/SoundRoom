<template>
  <div
    @click.self="router.push('/')"
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
        @close="router.push('/')"
        @toggleSound="toggleAddSource"
        @updateCurrent="currentlyPlayingId = $event"
        @upload="showUploadPanel = true"
        @delete="promptDeleteSound"
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
import { ref, watch, nextTick } from 'vue'

import { supabase } from '@/utils/supabase'

import CategoryList from '@/components/ui/modals/SoundLibrary/CategoryList.vue'
import SoundGrid from '@/components/ui/modals/SoundLibrary/SoundGrid.vue'
import UploadPanel from '@/components/ui/modals/SoundLibrary/UploadPanel.vue'
import YesNoModal from '@/components/ui/modals/YesNoModal.vue'
import { useRouter } from 'vue-router'

import { useAudioCacheStore } from '@/stores/useAudioCacheStore'
import { useActionManagerStore } from '@/stores/useActionManagerStore'
import { useAuth } from '@/composables/useAuth'
import { storeToRefs } from 'pinia'
import deleteAudio from '@/utils/deleteAudio'


const { user, isAuthenticated } = useAuth()

const router = useRouter()
const cacheStore = useAudioCacheStore()
const actionStore = useActionManagerStore()
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
  // if source in soundlibrarysources (draggable sources), delete, otherwise add
  if (soundLibrarySources.value.find((sound) => s.libraryId == sound.libraryId)) {
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

const activeCategory = ref(categories?.[0]?.id || '')
const gridRef = ref(null) // ref to SoundGrid component
const filteredSounds = ref([])
watch(
  activeCategory,
  async (newCategory) => {
    currentlyPlayingId.value = null
    await nextTick()
    gridRef.value?.scrollTop() // scroll up when new category is selected
    let sounds = []
    if (newCategory === 'your-sounds') {
      filteredSounds.value = [] // reset filtered sounds for immediate visual feedback
      sounds = await listUserSounds()
    } else {
      sounds = await listCategoryFiles(newCategory)
    }

    filteredSounds.value = sounds.map(({ id, ...rest }) => ({
      libraryId: id,
      ...rest,
    }))

  },
  { immediate: true }
) // run at least once, like a do while

const refreshUserSounds = async () => {
  if (activeCategory.value === 'your-sounds') {
    const sounds = await listUserSounds()
    filteredSounds.value = sounds.map(({ id, ...rest }) => ({
      libraryId: id,
      ...rest,
    }))
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
    if (soundLibrarySources.value.find(sound => sound.libraryId == s.libraryId)) {
      await actionStore.deleteLibrarySoundSource(s)
    }
    await deleteAudio(s.bucket, s.path, s.plan_tier ?? 'users')
    await supabase.from('sound_files').delete().eq('id', s.libraryId)
    await refreshUserSounds()
  } catch (error) {
    console.error('Failed to delete user sound:', error)
  }
  refreshUserSounds()
  cancelDeleteSound()
  
}

/**
 * Retrieve the sounds for the currently active category from Supabase.
 *
 * @returns {Promise<Array>} list of sound metadata records
 */
async function listCategoryFiles() {
  // select rows of sound file info where bucket name matches active category name
  const { data, error } = await supabase
    .from('sound_files')
    .select()
    .eq('bucket', activeCategory.value)
  if (error) {
    console.error('Failed to list files:', error)
    return []
  }
  return data
}

/**
 * Retrieve the sounds uploaded by the authenticated user.
 */

async function listUserSounds() {
  if (!isAuthenticated.value) return []

  const { data, error } = await supabase
    .from('sound_files')
    .select()
    .eq('owner_id', user.value.id)
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
    background-color: #ffffff;
  }
}

</style>