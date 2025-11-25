<template>
  <section class="flex flex-col h-full">
  <ContextMenu ref="menuRef" :functionList="[{ label: 'Delete', function: deleteSound }]" />

  <h5 class="text-sm font-semibold uppercase text-[var(--color-text-muted)]">
    Sound Sources
  </h5>

  <ul class="overflow-y-auto space-y-2 text-sm text-[var(--color-text-primary)]"
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
    @click="() => { router.push('/sound-library') }"
    class="w-full mt-4 text-xs rounded bg-[var(--color-accent)] hover:bg-[var(--color-accent-strong)] text-[var(--color-text-inverse)] border border-[var(--color-border-strong)] shadow-[var(--color-shadow-soft)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-surface)]"
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
import { useRouter } from 'vue-router'

const props = defineProps({
  MAX_SOURCES: Number,
  handleDragStart: Function,
})

const router = useRouter()
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