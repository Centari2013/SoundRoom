<template>
  <div class="flex-1 relative overflow-hidden">
    <div class="absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-6 py-4 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-300 dark:border-neutral-800">
      <h2 class="text-2xl font-bold">SoundLibrary</h2>
      <BaseButton class="text-sm" @click="$emit('close')">Close</BaseButton>
    </div>
    <div ref="gridScroll" class="mt-5 place-content-start p-6 pt-20 overflow-y-auto h-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <SoundGridItem
        v-for="sound in sounds"
        :key="sound.id"
        :sound="sound"
        :userSound="activeCategory === 'your-sounds'"
        v-bind="{ waiting, soundLibrarySources, currentlyPlayingId }"
        @toggle="$emit('toggleSound', $event)"
        @updateCurrent="$emit('updateCurrent', $event)"
        @contextmenu="showContextMenu"
      />
      <template v-if="userTier === 'pro' && activeCategory === 'your-sounds' && sounds.length === 0">
          <div class="col-span-full text-center text-neutral-400 mt-32">
            <div class="text-xl font-semibold mb-2">Nothing to hear!</div>
            <div class="mb-4">Upload your first sound below and it'll show up here.</div>
          </div>
        </template>
    </div>
     <div
        v-if="isAuthenticated && userTier === 'pro' && activeCategory == 'your-sounds'"
        class="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-neutral-950 border-t border-neutral-300 dark:border-neutral-800"
      >
        <div class="flex justify-between items-center">
          <label class="text-sm cursor-pointer"
            @click="$emit('upload')">
            Upload your own sound
          </label>
        </div>
      </div>
  </div>
  
</template>

<script setup>
import { ref } from 'vue'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import SoundGridItem from './SoundGridItem.vue'
import { useAuth } from '@/composables/useAuth'

const props = defineProps({
  sounds: Array,
  waiting: Boolean,
  soundLibrarySources: Array,
  currentlyPlayingId: String,
  activeCategory: String
})

const { isAuthenticated, tier: userTier } = useAuth()
const emit = defineEmits(['close', 'toggleSound', 'updateCurrent', 'upload'])

const gridScroll = ref(null)
function scrollTop() {
  gridScroll.value?.scrollTo({ top: 0 })
}

defineExpose({ scrollTop })
</script>
