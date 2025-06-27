<template>
  <div
    @click.self="canClickOutside && emit('close')"
    class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
  >
    <div
      class="bg-white dark:bg-neutral-950 rounded-2xl w-[90vw] max-w-md h-auto max-h-[85vh] shadow-xl border border-neutral-300 dark:border-neutral-800 relative overflow-hidden"
    >
      <!-- Header -->
      <div
        class=" top-0 left-0 right-0 z-10 flex justify-between items-center px-4 py-3 bg-white/70 dark:bg-neutral-950/70 backdrop-blur-md border-b border-neutral-300 dark:border-neutral-800"
      >
        <h2 class="text-lg font-semibold tracking-tight">{{ title }}</h2>
        <button
          v-if="showCloseButton"
          @click="emit('close')"
          class="text-sm underline hover:text-neutral-600 dark:hover:text-neutral-400"
        >
          Close
        </button>
      </div>

      <!-- Body -->
      <div class="flex justify-center items-center p-10  text-sm leading-relaxed space-y-4">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    default: 'Message',
  },
  canClickOutside: {
    type: Boolean,
    default: false,
  },
  showCloseButton: {
    type: Boolean,
    default: true,
  },
})
const emit = defineEmits(['close'])


</script>
