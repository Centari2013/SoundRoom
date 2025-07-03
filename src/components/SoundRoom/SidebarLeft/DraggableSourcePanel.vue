<template>
  <section class="flex flex-col h-full">
  <ContextMenu ref="menuRef" :functionList="[{ label: 'Delete', function: deleteSound }]" />

  <h5 class="text-sm font-semibold uppercase text-neutral-600 dark:text-neutral-400">
    Sound Sources
  </h5>

  <ul class="overflow-y-auto space-y-2 text-sm"
  :class="{ 'flex-1 mt-4': soundLibrarySources.length > 0 }">
    <LibrarySource 
      v-for="s in soundLibrarySources"
      :key="s.id || s.name"
      :librarySource="s" 
      @contextmenu="(e) => openContextMenu(e, s)"
      @dragstart="(e) => handleDragStart(e, s)"
    />
  </ul>

  <button
    :disabled="soundLibrarySources.length == MAX_SOURCES"
    @click="addSourceClick"
    class="w-full mt-4 bg-neutral-300 dark:bg-neutral-800 text-xs rounded hover:bg-neutral-400 dark:hover:bg-neutral-700"
  >
    + Add Source
  </button>
</section>

</template>

<script setup>
import { ref } from 'vue'

import LibrarySource from '@/components/SoundRoom/SidebarLeft/LibrarySource.vue'
import ContextMenu from '@/components/ui/context/ContextMenu.vue'
import { useAudioCacheStore } from '@/stores/useAudioCacheStore'
import { useActionManagerStore } from '@/stores/useActionManagerStore'
import { storeToRefs } from 'pinia'

const props = defineProps({
  MAX_SOURCES: Number,
  handleDragStart: Function,
  addSourceClick: Function
})

const cacheStore = useAudioCacheStore()
const actionStore = useActionManagerStore()
const { soundLibrarySources } = storeToRefs(cacheStore)


const menuRef = ref(null)
const contextSound = ref(null)

function openContextMenu(e, source) {
  // prevent default browser context menu
  e.preventDefault()
  e.stopPropagation();
  
  contextSound.value = source
  menuRef.value.show({ x: e.clientX, y: e.clientY })
}

function deleteSound() {
  actionStore.deleteLibrarySoundSource(contextSound.value)
  contextSound.value = null
}

</script>