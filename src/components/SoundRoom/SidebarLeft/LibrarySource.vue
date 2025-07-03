<template>
  <li
    class="cursor-move bg-neutral-300 dark:bg-neutral-700 p-1 rounded text-center"
    draggable="true"
  >
    {{ librarySource.name }}
  </li>
</template>
<script setup>
import { onUnmounted } from 'vue'
import { useAudioCacheStore } from '@/stores/useAudioCacheStore'

const props = defineProps({
  librarySource: Object
})

onUnmounted(() => {
  const cacheStore = useAudioCacheStore()
  cacheStore.audioCacheManager.remove(props.librarySource.libraryId)
})
</script>