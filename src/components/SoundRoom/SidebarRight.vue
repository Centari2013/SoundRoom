<template>
  <aside class="bg-neutral-100 dark:bg-neutral-900 border-l border-neutral-300 dark:border-neutral-800 p-4 space-y-4">
    <SelectedSourcePanel v-bind="{ listener, actionManager, selectedSource }" />
  </aside>
</template>

<script setup>
import SelectedSourcePanel from '@/components/ui/panels/SelectedSourcePanel.vue'

defineProps(['selectedSource', 'listener', 'actionManager'])
</script>