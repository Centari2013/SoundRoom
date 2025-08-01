<template>
  <div class="relative aspect-square flex flex-col items-center justify-between p-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 shadow border border-neutral-300 dark:border-neutral-700">
    <button
      class="absolute top-1 right-1 text-neutral-400 hover:text-red-500"
      @click="$emit('delete', sound)"
    >
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
      </svg>
    </button>
    <MarqueeTitle :text="getSourceName(sound.name)" />
    <SoundPreviewCircle
      :soundData="sound"
      :currentlyPlayingId="currentlyPlayingId"
      @updateCurrent="$emit('updateCurrent', $event)"
    />
  </div>
</template>

<script setup>
import MarqueeTitle from '@/components/ui/text/MarqueeTitle.vue'
import SoundPreviewCircle from '@/components/ui/modals/SoundLibrary/SoundPreviewCircle.vue'
import { getSourceName } from '@/composables/useSelectedSource'

const props = defineProps({
  sound: Object,
  currentlyPlayingId: String
})

defineEmits(['delete', 'updateCurrent'])
</script>
