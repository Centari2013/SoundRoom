<template>
  <aside class="flex flex-col h-full w-64 bg-neutral-200 dark:bg-neutral-900 border-r border-neutral-400 dark:border-neutral-800 p-4 space-y-6">
  <div class="min-h-[100px] max-h-3/5 overflow-hidden">
    <DraggableSourcePanel
      class="h-full"
      :librarySources="soundLibrarySources"
      :MAX_SOURCES="MAX_SOURCES"
      :handleDragStart="handleDragStart"
      :addSourceClick="addSourceClick"
      @deleteSource="$emit('deleteSource', $event)"
    />
  </div>

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