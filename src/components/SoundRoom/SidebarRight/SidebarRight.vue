<template>
  <aside
    class="flex flex-col h-full bg-neutral-200 dark:bg-neutral-900 border-l border-neutral-300/70 dark:border-neutral-800 p-4 space-y-4 shadow-[-4px_0_12px_rgba(0,0,0,0.06)]"
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