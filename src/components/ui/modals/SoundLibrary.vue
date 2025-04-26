<template>
  <div v-if="isLibraryOpen" @click.self="emit('close')" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
    <div class="bg-white dark:bg-neutral-950 rounded-2xl w-[80vw] h-[80vh] flex overflow-hidden shadow-2xl border border-neutral-300 dark:border-neutral-800">
      
      <!-- Left Sidebar: Categories -->
      <aside class="w-60 bg-neutral-100 dark:bg-neutral-900 border-r border-neutral-300 dark:border-neutral-800 p-4 space-y-3 overflow-y-auto">
        <h2 class="font-bold text-sm mb-2">Categories</h2>
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="activeCategory = cat.id"
          :class="[
            'w-full text-left px-3 py-2 rounded text-sm',
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
          <MarqueeTitle :text="sound.name"/>

          <!-- Preview Button -->
          <SoundPreviewCircle
            :src="'/sounds/water.mp3'"
            :duration="15"
            class="mb-3"
          />

          <!-- Load Button -->
          <button
            class="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
            @click="loadSound(sound)"
          >
            Load
          </button>

          <!-- Duration -->
          <span class="text-xs text-neutral-500 mt-2">{{ sound.duration }}s</span>
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
import { ref, computed, watch, nextTick } from 'vue'

import SoundPreviewCircle from '@/components/ui/controls/SoundPreviewCircle.vue'
import MarqueeTitle from '@/components/ui/text/MarqueeTitle.vue'

const props = defineProps({
  isLibraryOpen: Boolean
})
const emit = defineEmits(['close', 'load', 'upload'])

const categories = [
  { id: 'natural', label: 'Natural' },
  { id: 'urban', label: 'Human' },
  { id: 'musical', label: 'Musical' },
  { id: 'fantasy', label: 'Fantasy' },  //split into two categories
  { id: 'sci-fi', label: 'Sci-Fi'},
  { id: 'tools', label: 'Work & Focus' },
  { id: 'layers', label: 'Atmospheric' }
]

const sounds = [
  // Natural
  { id: 'rain', name: 'Rain', categoryId: 'natural', previewUrl: '/sounds/rain-preview.mp3', duration: 15 },
  { id: 'thunder', name: 'Thunderstorms', categoryId: 'natural', previewUrl: '/sounds/thunder-preview.mp3', duration: 18 },
  { id: 'forest', name: 'Forest / Jungle', categoryId: 'natural', previewUrl: '/sounds/forest-preview.mp3', duration: 12 },
  { id: 'ocean', name: 'Ocean / Beach', categoryId: 'natural', previewUrl: '/sounds/ocean-preview.mp3', duration: 14 },
  { id: 'river', name: 'River / Creek', categoryId: 'natural', previewUrl: '/sounds/river-preview.mp3', duration: 10 },
  { id: 'wind', name: 'Wind', categoryId: 'natural', previewUrl: '/sounds/wind-preview.mp3', duration: 8 },
  { id: 'fire', name: 'Campfire', categoryId: 'natural', previewUrl: '/sounds/fire-preview.mp3', duration: 11 },
  { id: 'cave', name: 'Cave / Underground', categoryId: 'natural', previewUrl: '/sounds/cave-preview.mp3', duration: 13 },

  // Urban
  { id: 'cafe', name: 'Coffee Shop', categoryId: 'urban', previewUrl: '/sounds/cafe-preview.mp3', duration: 15 },
  { id: 'library', name: 'Library', categoryId: 'urban', previewUrl: '/sounds/library-preview.mp3', duration: 10 },
  { id: 'traffic', name: 'City Traffic', categoryId: 'urban', previewUrl: '/sounds/traffic-preview.mp3', duration: 12 },
  { id: 'subway', name: 'Subway / Train', categoryId: 'urban', previewUrl: '/sounds/subway-preview.mp3', duration: 14 },
  { id: 'factory', name: 'Industrial / Factory', categoryId: 'urban', previewUrl: '/sounds/factory-preview.mp3', duration: 13 },
  { id: 'market', name: 'Market / Crowd', categoryId: 'urban', previewUrl: '/sounds/market-preview.mp3', duration: 10 },
  { id: 'construction', name: 'Construction', categoryId: 'urban', previewUrl: '/sounds/construction-preview.mp3', duration: 16 },

  // Musical
  { id: 'lofi', name: 'Lofi Hip-Hop', categoryId: 'musical', previewUrl: '/sounds/lofi-preview.mp3', duration: 30 },
  { id: 'classical', name: 'Classical', categoryId: 'musical', previewUrl: '/sounds/classical-preview.mp3', duration: 25 },
  { id: 'jazz', name: 'Jazz', categoryId: 'musical', previewUrl: '/sounds/jazz-preview.mp3', duration: 20 },
  { id: 'ambient', name: 'Ambient / Drone', categoryId: 'musical', previewUrl: '/sounds/ambient-preview.mp3', duration: 18 },
  { id: 'piano', name: 'Piano Solos', categoryId: 'musical', previewUrl: '/sounds/piano-preview.mp3', duration: 22 },
  { id: 'guitar', name: 'Guitar Loops', categoryId: 'musical', previewUrl: '/sounds/guitar-preview.mp3', duration: 19 },
  { id: 'synth', name: 'Electronic / Synth', categoryId: 'musical', previewUrl: '/sounds/synth-preview.mp3', duration: 17 },
  { id: 'natmusic', name: 'Nature-Infused Music', categoryId: 'musical', previewUrl: '/sounds/nature-music-preview.mp3', duration: 26 },

  // Fantasy
  { id: 'magic', name: 'Magical Ambience', categoryId: 'fantasy', previewUrl: '/sounds/magic-preview.mp3', duration: 12 },
  { id: 'space', name: 'Space Station', categoryId: 'fantasy', previewUrl: '/sounds/space-preview.mp3', duration: 14 },
  { id: 'dungeon', name: 'Dungeon Echoes', categoryId: 'fantasy', previewUrl: '/sounds/dungeon-preview.mp3', duration: 10 },
  { id: 'alien', name: 'Alien World', categoryId: 'fantasy', previewUrl: '/sounds/alien-preview.mp3', duration: 13 },
  { id: 'tavern', name: 'Medieval Tavern', categoryId: 'fantasy', previewUrl: '/sounds/tavern-preview.mp3', duration: 15 },
  { id: 'haunted', name: 'Haunted / Paranormal', categoryId: 'fantasy', previewUrl: '/sounds/haunted-preview.mp3', duration: 11 },

  // Tools
  { id: 'white', name: 'White Noise', categoryId: 'tools', previewUrl: '/sounds/white-noise-preview.mp3', duration: 30 },
  { id: 'pink', name: 'Pink Noise', categoryId: 'tools', previewUrl: '/sounds/pink-noise-preview.mp3', duration: 30 },
  { id: 'brown', name: 'Brown Noise', categoryId: 'tools', previewUrl: '/sounds/brown-noise-preview.mp3', duration: 30 },
  { id: 'binaural', name: 'Binaural Beats', categoryId: 'tools', previewUrl: '/sounds/binaural-preview.mp3', duration: 20 },
  { id: 'static', name: 'Focused Static', categoryId: 'tools', previewUrl: '/sounds/static-preview.mp3', duration: 18 },

  // Layers
  { id: 'hum', name: 'Low Hum / Engine', categoryId: 'layers', previewUrl: '/sounds/hum-preview.mp3', duration: 14 },
  { id: 'bass', name: 'Deep Bass Rumble', categoryId: 'layers', previewUrl: '/sounds/bass-preview.mp3', duration: 13 },
  { id: 'high', name: 'High-pitched Textures', categoryId: 'layers', previewUrl: '/sounds/high-texture-preview.mp3', duration: 9 },
  { id: 'chimes', name: 'Wind Chimes', categoryId: 'layers', previewUrl: '/sounds/chimes-preview.mp3', duration: 10 },
  { id: 'clock', name: 'Clock Ticks / Time Loops', categoryId: 'layers', previewUrl: '/sounds/clock-preview.mp3', duration: 11 },
]

const activeCategory = ref(categories?.[0]?.id || '')
const gridScroll = ref(null)

const isLoading = ref(false)

watch(activeCategory, async () => {
  isLoading.value = true
  await nextTick()
  gridScroll.value?.scrollTo({ top: 0 })

  // Simulate async fetch
  await new Promise(resolve => setTimeout(resolve, 500)) // replace with actual fetch
  isLoading.value = false
})




const filteredSounds = computed(() =>
  sounds.filter(s => s.categoryId === activeCategory.value)
)

function loadSound(sound) {
  emit('load', sound)
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
</style>