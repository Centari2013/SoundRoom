<template>
  <section class="flex flex-col h-full">
  <ContextMenu ref="menuRef" :functionList="[{ label: 'Delete', function: deleteSound }]" />

  <h5 class="text-sm font-semibold uppercase text-[var(--color-text-muted)]">
    Sound Sources
  </h5>

  <ul id="library-sound-list" data-tour="library-sound-list" class="overflow-y-auto space-y-2 text-sm text-[var(--color-text-primary)]"
  :class="{ 'flex-1 mt-4': soundLibrarySources.length > 0 }">
    <LibrarySource
      v-for="s in soundLibrarySources"
      :key="s.id || s.name"
      :librarySource="s"
      @contextmenu="(e) => openContextMenu(e, s)"
      @dragstart="(e) => { if (!s.locked) handleDragStart(e, s) }"
      @click="() => { if (handleTap && !s.locked) handleTap(s) }"
    />
  </ul>

  <button
    :disabled="soundLibrarySources.length == MAX_SOURCES"
    @click="openSoundLibrary"
    id="add-source-btn"
    class="w-full mt-4 bg-[var(--color-bg-surface)] text-xs rounded hover:bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)]"
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
  handleTap: { type: Function, default: null },
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

function openSoundLibrary() {
  if (import.meta.env.DEV) {
    console.time('open-sound-library')
  }

  router.push({ name: 'sound-library' }).finally(() => {
    if (!import.meta.env.DEV) return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        console.timeEnd('open-sound-library')
      })
    })
  })
}

</script>
