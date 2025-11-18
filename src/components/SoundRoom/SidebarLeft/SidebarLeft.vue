<template>
  <aside
    class="flex flex-col h-full w-full bg-neutral-200 dark:bg-neutral-900 border-r border-neutral-400 dark:border-neutral-800 p-4 space-y-6"
    role="region"
    aria-labelledby="library-panel-label"
  >
    <h2 id="library-panel-label" class="sr-only">Sound Library Panel</h2>

    <!-- Allow the library to scroll independently on mobile while preserving desktop height cap -->
    <div class="min-h-[100px] max-h-[50vh] sm:max-h-3/5 overflow-y-auto">
      <DraggableSourcePanel
        class="h-full"
        v-bind="{
          MAX_SOURCES,
          handleDragStart
        }"
      />
    </div>

    <ListenerReadout
      aria-label="Listener position and orientation"
    />
  </aside>
</template>


<script setup>
import DraggableSourcePanel from '@/components/SoundRoom/SidebarLeft/DraggableSourcePanel.vue'
import ListenerReadout from '@/components/SoundRoom/SidebarLeft/ListenerReadout.vue'

defineProps([
  'MAX_SOURCES',
  'handleDragStart'
])
</script>