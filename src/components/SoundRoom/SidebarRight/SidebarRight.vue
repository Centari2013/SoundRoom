<template>
  <aside
  class="flex flex-col h-full bg-[var(--sr-bg-2)] dark:bg-neutral-900 border-l border-[var(--sr-border)] dark:border-neutral-800 p-4 space-y-4"
    role="region"
    aria-labelledby="selected-sound-panel-label"
  >
    <h2 id="selected-sound-panel-label" class="sr-only">
      Selected Sound Settings Panel
    </h2>

    <SelectedSourcePanel v-bind="{ selectedSource }" />
    
  </aside>
</template>


<script setup>
import SelectedSourcePanel from '@/components/SoundRoom/SidebarRight/SelectedSourcePanel.vue'
defineProps(['selectedSource'])


</script>