<template>
  <aside
    class="flex flex-col h-full bg-[#e6e6e6] dark:bg-neutral-900 border-l border-neutral-300/40 dark:border-neutral-800 p-4 space-y-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-none"
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