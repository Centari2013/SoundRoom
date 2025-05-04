<template>
  <aside class="w-64 h-full bg-neutral-200 dark:bg-neutral-900 border-r border-neutral-400 dark:border-neutral-800 p-4 space-y-6">
    <DraggableSourcePanel
      :librarySources="soundLibrarySources"
      :MAX_SOURCES="MAX_SOURCES"
      :handleDragStart="handleDragStart"
      :addSourceClick="addSourceClick"
      @deleteSource="$emit('deleteSource', $event)"
    />
    <ListenerReadout :listener="listener" />
  </aside>
</template>

<script setup>
import DraggableSourcePanel from '@/components/ui/panels/DraggableSourcePanel.vue'
import ListenerReadout from '@/components/ui/readouts/ListenerReadout.vue'

defineProps([
  'soundLibrarySources',
  'MAX_SOURCES',
  'handleDragStart',
  'addSourceClick',
  'listener'
])
</script>