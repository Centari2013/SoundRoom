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
        v-bind="{ waiting, soundLibrarySources, currentlyPlayingId }"
        @toggle="$emit('toggleSound', $event)"
        @sendAudio="$emit('sendAudio', $event)"
        @updateCurrent="$emit('updateCurrent', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, defineExpose } from 'vue'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import SoundGridItem from './SoundGridItem.vue'

const props = defineProps({
  sounds: Array,
  waiting: Boolean,
  soundLibrarySources: Array,
  currentlyPlayingId: String
})

defineEmits(['close', 'toggleSound', 'sendAudio', 'updateCurrent'])

const gridScroll = ref(null)
function scrollTop() {
  gridScroll.value?.scrollTo({ top: 0 })
}

defineExpose({ scrollTop })
</script>
