<template>
  <div
    v-if="isLibraryOpen"
    @click.self="emit('close')"
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
        @close="$emit('close')"
        @toggleSound="toggleAddSource"
        @updateCurrent="currentlyPlayingId = $event"
      />

      <!-- Bottom Upload Panel -->
      <div
        v-if="isAuthenticated"
        class="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-neutral-950 border-t border-neutral-300 dark:border-neutral-800"
      >
        <div class="flex justify-between items-center">
          <label class="text-sm cursor-pointer">
            Upload your own sound
            <input
              type="file"
              accept="audio/*"
              class="hidden"
              @change="handleUpload"
            />
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

import { supabase } from '@/utils/supabase'

import CategoryList from '@/components/ui/modals/SoundLibrary/CategoryList.vue'
import SoundGrid from '@/components/ui/modals/SoundLibrary/SoundGrid.vue'

import { useAudioCacheStore } from '@/stores/useAudioCacheStore'
import { useActionManagerStore } from '@/stores/useActionManagerStore'
import { useAuth } from '@/composables/useAuth'
import { storeToRefs } from 'pinia'

const props = defineProps({
  isLibraryOpen: Boolean
})

const { isAuthenticated } = useAuth()

const cacheStore = useAudioCacheStore()
const actionStore = useActionManagerStore()
const { waiting } = storeToRefs(actionStore)
const { soundLibrarySources } = storeToRefs(cacheStore)
const emit = defineEmits(['close'])



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

    const sounds = await listCategoryFiles(newCategory)
    filteredSounds.value = sounds.map(({ id, ...rest }) => ({
      libraryId: id,
      ...rest,
    }))

  },
  { immediate: true }
) // run at least once, like a do while

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
 * Handler for the (currently disabled) upload input.
 *
 * @param {Event} event - change event from the file input
 * @returns {void}
 */
function handleUpload(event) {
  const file = event.target.files?.[0]
  if (file) {

  }
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