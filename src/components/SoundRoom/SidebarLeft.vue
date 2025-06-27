<template>
  <aside class="flex flex-col h-full bg-neutral-200 dark:bg-neutral-900 border-r border-neutral-400 dark:border-neutral-800 p-4 space-y-6">
  <div class="min-h-[100px] max-h-3/5 overflow-hidden">
    <DraggableSourcePanel
      class="h-full"
      v-bind="{
        librarySources: soundLibrarySources,
        MAX_SOURCES,
        handleDragStart,
        addSourceClick
      }"
      @deleteSource="$emit('deleteSource', $event)"
    />
  </div>

  <ListenerReadout v-bind="{ listener }" />
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