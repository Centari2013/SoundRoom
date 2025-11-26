<template>
  <aside
    class="flex flex-col h-full bg-[var(--color-bg-elevated)] sr-border-l sr-border-subtle p-4 space-y-4 text-[var(--color-text-primary)]"
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