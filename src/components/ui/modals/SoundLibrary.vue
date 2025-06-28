<template>
  <div
    v-if="isLibraryOpen"
    @click.self="emit('close')"
    class="modal-backdrop"
  >
    <div
      class="modal-panel flex"
    >
      <!-- Left Sidebar: Categories -->
      <aside
        class="w-60 bg-neutral-200 dark:bg-neutral-900 border-r border-neutral-300 dark:border-neutral-800 p-4 space-y-3 overflow-y-auto"
      >
        <h2 class="font-bold text-sm mb-2">Categories</h2>
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="activeCategory = cat.id"
          :class="['sound-lib-button', { active: activeCategory === cat.id }]"
        >
          {{ cat.label }}
        </button>
      </aside>

      <!-- Main Content: Sound Grid -->
      <div class="flex-1 relative overflow-hidden">
        <!-- Floating Top Bar -->
        <div
          class="absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-6 py-4 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-300 dark:border-neutral-800"
        >
          <h2 class="text-2xl font-bold">SoundLibrary</h2>
          <button class="text-sm" @click="$emit('close')">Close</button>
        </div>

        <!-- Scrollable Sound Grid -->
        <div
          ref="gridScroll"
          class="mt-5 place-content-start p-6 pt-20 overflow-y-auto h-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          <div
            v-for="sound in filteredSounds"
            :key="sound.id"
            class="aspect-square flex flex-col items-center justify-between p-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 shadow border border-neutral-300 dark:border-neutral-700"
          >
            <!-- Title -->
            <MarqueeTitle :text="getSourceName(sound.name)" />

            <!-- Preview Button -->
            <SoundPreviewCircle
              :soundData="sound"
              :sendAudioUp="sound.send"
              :currentlyPlayingId="currentlyPlayingId"
              @sendAudio="(soundData) => { handleAudioSent(soundData, sound) }"
              @updateCurrent="currentlyPlayingId = $event"
            />

            <!-- Load Button -->
            <button
              class="load-button text-xs px-3 py-1 rounded hover:bg-blue-700 transition-colors"
              @click="() => { toggleAddSource(sound) }"
            >
              {{
                soundLibrarySources.find(
                  (s) => s.libraryId == sound.libraryId
                )
                  ? 'Remove'
                  : 'Load'
              }}
            </button>
          </div>
        </div>
      </div>

      <!-- Bottom Upload Panel -->
      <div
        v-if="false"
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

import SoundPreviewCircle from '@/components/ui/controls/SoundPreviewCircle.vue'
import MarqueeTitle from '@/components/ui/text/MarqueeTitle.vue'
import { getSourceName } from '@/composables/useSelectedSource'

const props = defineProps({
  isLibraryOpen: Boolean,
  soundLibrarySources: Object,
})
const emit = defineEmits(['close', 'load', 'upload', 'delete'])

function handleAudioSent(source, sound) {
  sound.send = false
  emit('load', source)
}

const categories = [
  { id: 'nature', label: 'Nature' },
  { id: 'human', label: 'Human' },
  { id: 'musical', label: 'Musical' },
  { id: 'tools', label: 'Work & Focus' },
  { id: 'atmospheric', label: 'Atmospheric' },
  { id: 'misc', label: 'Misc' },
]

function toggleAddSource(s) {
  // if source in soundlibrarysources (draggable sources), delete, otherwise add
  if (props.soundLibrarySources.find((sound) => s.libraryId == sound.libraryId)) {
    s.send = false
    emit('delete', s)
  } else {
    s.send = true
  }
}

const currentlyPlayingId = ref(null) // id of current sound playing to stop multiple previews playing at once

const activeCategory = ref(categories?.[0]?.id || '')
const gridScroll = ref(null) // ref to scrollable div of library sounds

const isLoading = ref(false)
const filteredSounds = ref([])
watch(
  activeCategory,
  async (newCategory) => {
    isLoading.value = true
    await nextTick()
    gridScroll.value?.scrollTo({ top: 0 }) // scroll up when new category is selected

    const sounds = await listCategoryFiles(newCategory)
    filteredSounds.value = sounds.map(({ id, ...rest }) => ({
      libraryId: id,
      ...rest,
    }))

    isLoading.value = false
  },
  { immediate: true }
) // run at least once, like a do while

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

function handleUpload(event) {
  const file = event.target.files?.[0]
  if (file) {
    emit('upload', file)
  }
}
</script>

<style>
.marquee-text-text {
  margin-left: 20px;
}

@media (prefers-color-scheme: light) {
  .load-button {
    background-color: #ffffff;
  }
}

/* Base button styling */
.sound-lib-button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem; /* text-sm */
  border-radius: 0.375rem; /* rounded */
  transition: background-color 0.2s;
}

/* Hover state */
.sound-lib-button:hover {
  background-color: #e5e5e5; /* neutral-200 */
}

@media (prefers-color-scheme: dark) {
  .sound-lib-button:hover {
    background-color: #1f2937; /* neutral-800 */
  }
}

/* Active/selected state */
.sound-lib-button.active {
  font-weight: 600;
  background-color: #d4d4d4; /* neutral-200 */
}

@media (prefers-color-scheme: dark) {
  .sound-lib-button.active {
    background-color: #1f2937; /* neutral-800 */
  }
}
</style>