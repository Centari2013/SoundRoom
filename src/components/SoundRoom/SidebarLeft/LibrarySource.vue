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
import { useRoomStore } from '@/stores/useRoomStore'

const props = defineProps({
  librarySource: Object
})

onUnmounted(() => {
  const store = useRoomStore()
  store.audioCacheManager.remove(props.librarySource.libraryId)
})
</script>