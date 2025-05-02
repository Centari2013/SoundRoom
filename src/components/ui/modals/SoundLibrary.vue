<template>
  <div v-if="isLibraryOpen" @click.self="emit('close')" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
    <div class="bg-white dark:bg-neutral-950 rounded-2xl w-[80vw] h-[80vh] flex overflow-hidden shadow-2xl border border-neutral-300 dark:border-neutral-800">
      
      <!-- Left Sidebar: Categories -->
      <aside class="w-60 bg-neutral-200 dark:bg-neutral-900 border-r border-neutral-300 dark:border-neutral-800 p-4 space-y-3 overflow-y-auto">
        <h2 class="font-bold text-sm mb-2">Categories</h2>
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="activeCategory = cat.id"
          :class="[
            'w-full text-left px-3 py-2 rounded text-sm sound-lib-button',
            activeCategory === cat.id
              ? 'bg-neutral-200 dark:bg-neutral-800 font-semibold'
              : 'hover:bg-neutral-200 dark:hover:bg-neutral-800'
          ]"
        >
          {{ cat.label }}
        </button>
      </aside>

      <!-- Main Content: Sound Grid -->
      <div class="flex-1 relative overflow-hidden">
        <!-- Floating Top Bar -->
        <div class="absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-6 py-4 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-300 dark:border-neutral-800">
          <h2 class="text-lg font-bold">Choose a Sound</h2>
          <button class="text-sm underline" @click="$emit('close')">Close</button>
        </div>

        <!-- Scrollable Sound Grid -->
        <div ref="gridScroll" class="mt-5 place-content-start p-6 pt-20 overflow-y-auto h-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div
          v-for="sound in filteredSounds"
          :key="sound.id"
          class="aspect-square flex flex-col items-center justify-between p-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 shadow border border-neutral-300 dark:border-neutral-700"
        >
          <!-- Title -->
          <MarqueeTitle :text="getSourceName(sound.name)"/>

          <!-- Preview Button -->
          <SoundPreviewCircle
            :soundData="sound"
            :sendAudioUp="sound.send"
            :currentlyPlayingId="currentlyPlayingId"
            @sendAudio="(soundData) => {handleAudioSent(soundData, sound)}"
            @updateCurrent="currentlyPlayingId = $event"
          />

          <!-- Load Button -->
          <button
            class="sound-lib-button text-xs  px-3 py-1 rounded hover:bg-blue-700 transition-colors"
            @click="sound.send = true"
          >
            Load
          </button>

          
        </div>

        </div>
      </div>


      <!-- Bottom Upload Panel -->
      <div v-if="false" class="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-neutral-950 border-t border-neutral-300 dark:border-neutral-800">
        <div class="flex justify-between items-center">
          <label class="text-sm cursor-pointer">
            Upload your own sound
            <input type="file" accept="audio/*" class="hidden" @change="handleUpload" />
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
  isLibraryOpen: Boolean
})
const emit = defineEmits(['close', 'load', 'upload'])

function handleAudioSent(source, sound) {
  sound.send = false
  emit('load', source)
}

const categories = [
  { id: 'nature', label: 'Nature' },
  { id: 'human', label: 'Human' },
  { id: 'musical', label: 'Musical' },
  { id: 'fantasy', label: 'Fantasy' },  //split into two categories
  { id: 'sci-fi', label: 'Sci-Fi'},
  { id: 'tools', label: 'Work & Focus' },
  { id: 'layers', label: 'Atmospheric' }
]
//TODO: fix button selection color not triggering 
//TODO: fix play/pause triggered by OS
const sounds = [
  
  { "id": "subway", "name": "Subway Platform", "categoryId": "urban", "previewUrl": "/sounds/subway.wav", "duration": 14 },

  // MUSICAL
  { "id": "lofi", "name": "Lofi Chill", "categoryId": "musical", "previewUrl": "/sounds/lofi.wav", "duration": 30 },
  { "id": "ambient", "name": "Ambient Drone", "categoryId": "musical", "previewUrl": "/sounds/ambient.wav", "duration": 25 },
  { "id": "piano", "name": "Piano Solo", "categoryId": "musical", "previewUrl": "/sounds/piano.wav", "duration": 20 },
  { "id": "guitar", "name": "Guitar Loop", "categoryId": "musical", "previewUrl": "/sounds/guitar.wav", "duration": 22 },
  { "id": "classical", "name": "Classical Piece", "categoryId": "musical", "previewUrl": "/sounds/classical.wav", "duration": 28 },
  { "id": "synth", "name": "Synthwave Loop", "categoryId": "musical", "previewUrl": "/sounds/synth.wav", "duration": 26 },

  // FANTASY
  { "id": "magic", "name": "Magical Ambience", "categoryId": "fantasy", "previewUrl": "/sounds/magic.wav", "duration": 14 },
  { "id": "dungeon", "name": "Dungeon Echoes", "categoryId": "fantasy", "previewUrl": "/sounds/dungeon.wav", "duration": 13 },
  { "id": "haunted", "name": "Haunted Hallway", "categoryId": "fantasy", "previewUrl": "/sounds/haunted.wav", "duration": 12 },
  { "id": "tavern", "name": "Medieval Tavern", "categoryId": "fantasy", "previewUrl": "/sounds/tavern.wav", "duration": 16 },

  // SCI-FI
  { "id": "space", "name": "Space Station", "categoryId": "sci-fi", "previewUrl": "/sounds/space.wav", "duration": 15 },
  { "id": "alien", "name": "Alien World", "categoryId": "sci-fi", "previewUrl": "/sounds/alien.wav", "duration": 13 },
  { "id": "computer", "name": "Computer Beeps", "categoryId": "sci-fi", "previewUrl": "/sounds/computer.wav", "duration": 10 },
  { "id": "teleport", "name": "Teleport Glitch", "categoryId": "sci-fi", "previewUrl": "/sounds/teleport.wav", "duration": 11 },

  // TOOLS (WORK & FOCUS)
  { "id": "white", "name": "White Noise", "categoryId": "tools", "previewUrl": "/sounds/white.wav", "duration": 30 },
  { "id": "pink", "name": "Pink Noise", "categoryId": "tools", "previewUrl": "/sounds/pink.wav", "duration": 30 },
  { "id": "brown", "name": "Brown Noise", "categoryId": "tools", "previewUrl": "/sounds/brown.wav", "duration": 30 },
  { "id": "binaural", "name": "Binaural Beats", "categoryId": "tools", "previewUrl": "/sounds/binaural.wav", "duration": 20 },

  // LAYERS (ATMOSPHERIC)
  { "id": "hum", "name": "Low Engine Hum", "categoryId": "layers", "previewUrl": "/sounds/hum.wav", "duration": 15 },
  { "id": "bass", "name": "Deep Bass Rumble", "categoryId": "layers", "previewUrl": "/sounds/bass.wav", "duration": 14 },
  { "id": "high", "name": "High Frequency Buzz", "categoryId": "layers", "previewUrl": "/sounds/high.wav", "duration": 9 },
  { "id": "chimes", "name": "Wind Chimes", "categoryId": "layers", "previewUrl": "/sounds/chimes.wav", "duration": 10 },
  { "id": "clock", "name": "Clock Ticking", "categoryId": "layers", "previewUrl": "/sounds/clock.wav", "duration": 11 }
]

const currentlyPlayingId = ref(null)


const activeCategory = ref(categories?.[0]?.id || '')
const gridScroll = ref(null)

const isLoading = ref(false)
const filteredSounds = ref([])
watch(activeCategory, async (newCategory) => {
  isLoading.value = true
  await nextTick()
  gridScroll.value?.scrollTo({ top: 0 })

  const sounds = await listCategoryFiles(newCategory)
  filteredSounds.value = sounds

  isLoading.value = false
}, { immediate: true })



async function listCategoryFiles(){
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
  .sound-lib-button {
    background-color: #ffffff;
  }

}
</style>