<template>
    <div class="space-x-2">
      <button
      :disabled="!canPlay"
      @click="$emit('togglePlay')"
      class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700"
      >
        {{ playing ? 'Pause All' : 'Play All' }}
      </button>
      <button
        :disabled="!canUndo"
        @click="$emit('undo')"
        class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700"
      >
        Undo
      </button>
      <button
        :disabled="!canRedo"
        @click="$emit('redo')"
        class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700"
      >
        Redo
      </button>

    
  </div>
</template>

<script setup>
defineProps({
  canPlay: Boolean,
  canUndo: Boolean,
  canRedo: Boolean,
  playing: Boolean
})

defineEmits(['undo', 'redo', 'togglePlay'])
</script>
