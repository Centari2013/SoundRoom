<template>
    <div class="space-x-2">
      <BaseButton
      :disabled="!canPlay"
      @click="$emit('togglePlay')"
      class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700"
      >
        {{ playing ? 'Pause All' : 'Play All' }}
      </BaseButton>
      <BaseButton
        :disabled="!canUndo"
        @click="$emit('undo')"
        class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700"
      >
        Undo
      </BaseButton>
      <BaseButton
        :disabled="!canRedo"
        @click="$emit('redo')"
        class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700"
      >
        Redo
      </BaseButton>

    
  </div>
</template>

<script setup>
import BaseButton from '@/components/ui/input/BaseButton.vue'
defineProps({
  canPlay: Boolean,
  canUndo: Boolean,
  canRedo: Boolean,
  playing: Boolean
})

defineEmits(['undo', 'redo', 'togglePlay'])
</script>
