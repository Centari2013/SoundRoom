<template>
  <div class="relative aspect-square flex flex-col items-center justify-between p-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 shadow border border-neutral-300 dark:border-neutral-700">

    <MarqueeTitle :text="getSourceName(sound.name)" />

    <SoundPreviewCircle
      :soundData="sound"
      :currentlyPlayingId="currentlyPlayingId"
      @updateCurrent="$emit('updateCurrent', $event)"
    />

    <BaseButton
      class="load-BaseButton text-xs px-3 py-1 rounded hover:bg-blue-700 transition-colors mt-2"
      @click="$emit('toggle', sound)"
      :disabled="waiting || sound.send"
    >
      {{ soundLibrarySources.find((s) => s.libraryId == sound.libraryId) ? 'Remove' : 'Load' }}
    </BaseButton>
    <BaseButton v-if="userSound" class="hover:underline !bg-transparent !border-none hover:text-red-500 !text-xs">
    Delete
    </BaseButton>
  </div>
</template>


<script setup>
import BaseButton from '@/components/ui/input/BaseButton.vue'
import SoundPreviewCircle from '@/components/ui/modals/SoundLibrary/SoundPreviewCircle.vue'
import MarqueeTitle from '@/components/ui/text/MarqueeTitle.vue'
import { getSourceName } from '@/composables/useSelectedSource'

const props = defineProps({
  sound: Object,
  waiting: Boolean,
  soundLibrarySources: Array,
  currentlyPlayingId: String,
  userSound: Boolean
})

defineEmits(['toggle', 'updateCurrent'])
</script>
<style>
.close-button {
  background: transparent;
  border: transparent;
  color: inherit;

}




</style>
