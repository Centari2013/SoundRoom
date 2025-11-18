<template>
  <!-- Allow the inspector to scroll independently when panels stack on mobile -->
  <aside
    class="flex flex-col h-full w-full bg-neutral-100 dark:bg-neutral-900 border-t sm:border-t-0 sm:border-l border-neutral-300 dark:border-neutral-800 p-4 space-y-4 overflow-y-auto"
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