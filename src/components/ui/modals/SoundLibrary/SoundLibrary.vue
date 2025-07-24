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
import { getFileDuration, stripExtension, ALLOWED_AUDIO_TYPES } from '@/utils/audioFileUtils'

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
async function handleUpload(event) {
  const input = event.target
  const files = Array.from(input.files || [])

  if (files.length === 0) return

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  await Promise.all(
    files.map(async (file) => {
      if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
        console.warn(`Skipping unsupported file type: ${file.name}`)
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        console.warn(`Skipping ${file.name} – file is larger than 10MB`)
        return
      }

      const filePath = `${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase
        .storage
        .from('pending')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Failed to upload file:', uploadError)
        return
      }

      let duration_seconds = 0
      try {
        duration_seconds = await getFileDuration(file)
      } catch (err) {
        console.error(`Failed to decode ${file.name}:`, err)
      }

      const { error: dbError } = await supabase
        .from('sound_files')
        .insert({
          path: filePath,
          bucket: 'pending',
          status: 'pending',
          duration_seconds,
          size: file.size,
          mime_type: file.type,
          name: stripExtension(file.name),
          tags: null,
          cone_inner: null,
          cone_outer: null,
          vibe: null,
          ai_generated: null,
        })

      if (dbError) {
        console.error('Failed to insert metadata for', file.name, dbError)
      }
    })
  )

  input.value = ''
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