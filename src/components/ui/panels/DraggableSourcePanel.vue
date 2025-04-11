<template>
  <section>
    <h5 class="text-sm font-semibold uppercase text-neutral-600 dark:text-neutral-400 mb-2">Sound Sources</h5>
    <ul class="space-y-2 text-sm">
      <li
        v-for="s in librarySources"
        :key="s.audioPath"
        class="cursor-move bg-neutral-300 dark:bg-neutral-700 p-1 rounded text-center"
        draggable="true"
        @dragstart="(e) => handleDragStart(e, s)"
      >
        {{ getSourceName(s.audioPath) }}
      </li>
    </ul>
    <button :disabled="audioEngine.soundSources.length == MAX_SOURCES" class="mt-4 w-full bg-neutral-300 dark:bg-neutral-800 text-xs py-1 rounded hover:bg-neutral-400 dark:hover:bg-neutral-700">
      + Add Source
    </button>
  </section>
</template>

<script setup>
import { getSourceName } from '@/composables/useSelectedSource'

const props = defineProps({
  librarySources: Array,
  MAX_SOURCES: Number,
  audioEngine: Object,
  handleDragStart: Function
})

const librarySources = props.librarySources
const MAX_SOURCES = props.MAX_SOURCES
const audioEngine = props.audioEngine

</script>