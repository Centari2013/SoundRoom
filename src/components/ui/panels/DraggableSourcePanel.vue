<template>
  <section>
    <ContextMenu ref="menuRef" :functionList="[
      {
        label: 'Delete',
        function: deleteSound
      }
    ]"/>

    <h5 class="text-sm font-semibold uppercase text-neutral-600 dark:text-neutral-400 mb-2">Sound Sources</h5>
    <ul class="space-y-2 text-sm">
      <li
        v-for="s in librarySources"
        class="cursor-move bg-neutral-300 dark:bg-neutral-700 p-1 rounded text-center"
        draggable="true"
        @dragstart="(e) => handleDragStart(e, s)"
        @contextmenu="(e) => openContextMenu(e, s)"
      >
        {{ getSourceName(s.name) }}
      </li>
    </ul>
    <button :disabled="audioEngine.soundSources.length == MAX_SOURCES"
    @click="addSourceClick"
     class="mt-4 w-full bg-neutral-300 dark:bg-neutral-800 text-xs py-1 rounded hover:bg-neutral-400 dark:hover:bg-neutral-700">
      + Add Source
    </button>
  </section>
</template>

<script setup>
import { ref } from 'vue'

import { getSourceName } from '@/composables/useSelectedSource'
import ContextMenu from '@/components/ui/context/ContextMenu.vue'

const props = defineProps({
  librarySources: Array,
  MAX_SOURCES: Number,
  audioEngine: Object,
  handleDragStart: Function,
  addSourceClick: Function
})

const librarySources = props.librarySources
const MAX_SOURCES = props.MAX_SOURCES
const audioEngine = props.audioEngine

const emit = defineEmits(['deleteSource'])

const menuRef = ref(null)
const contextSound = ref(null)

function openContextMenu(e, source) {
  e.preventDefault()
  e.stopPropagation();
  
  contextSound.value = source
  console.log(e)
  menuRef.value.show({ x: e.clientX, y: e.clientY })
}

function deleteSound() {
  emit('deleteSource', contextSound.value)
  contextSound.value = null
}

</script>