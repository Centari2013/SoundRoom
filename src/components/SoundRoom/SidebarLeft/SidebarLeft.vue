<template>
  <aside
    id="sidebar-left"
    class="flex flex-col h-full w-full bg-[var(--color-bg-elevated)] border-r border-[var(--color-border-subtle)] p-4 space-y-6 text-[var(--color-text-primary)]"
    role="region"
    aria-labelledby="library-panel-label"
  >
    <h2 id="library-panel-label" class="sr-only">Sound Library Panel</h2>

    <div class="min-h-[100px] max-h-3/5 overflow-hidden">
      <DraggableSourcePanel
        class="h-full"
        v-bind="{
          MAX_SOURCES,
          handleDragStart,
          handleTap,
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
  'handleDragStart',
  'handleTap',
])
</script>