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
      <LibrarySource 
      v-for="s in librarySources"
      :librarySource="s" 
      @contextmenu="(e) => openContextMenu(e, s)"
      @dragstart="(e) => handleDragStart(e, s)"
      />
    </ul>
    <button :disabled="librarySources.length == MAX_SOURCES"
    @click="addSourceClick"
     class="mt-4 w-full bg-neutral-300 dark:bg-neutral-800 text-xs py-1 rounded hover:bg-neutral-400 dark:hover:bg-neutral-700">
      + Add Source
    </button>
  </section>
</template>

<script setup>
import { ref } from 'vue'

import LibrarySource from '@/components/ui/panels/parts/librarySource.vue'
import ContextMenu from '@/components/ui/context/ContextMenu.vue'

const props = defineProps({
  librarySources: Array,
  MAX_SOURCES: Number,
  handleDragStart: Function,
  addSourceClick: Function
})

const emit = defineEmits(['deleteSource'])

const menuRef = ref(null)
const contextSound = ref(null)

function openContextMenu(e, source) {
  e.preventDefault()
  e.stopPropagation();
  
  contextSound.value = source
  menuRef.value.show({ x: e.clientX, y: e.clientY })
}

function deleteSound() {
  emit('deleteSource', contextSound.value)
  contextSound.value = null
}

</script>