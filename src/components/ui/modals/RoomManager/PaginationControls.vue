<template>
  <div class="absolute flex bottom-0 left-0 right-0 p-4 bg-white dark:bg-neutral-950 border-t border-neutral-300 dark:border-neutral-800">
    <span class="w-1/4"></span>
    <div class="flex items-center justify-center w-1/2 space-x-3" :class="{ invisible: loading }">
      <BaseButton class="px-3 py-1" :disabled="currentPage === 0" @click="emit('prev')">← Prev</BaseButton>
      <span>Page {{ currentPage + 1 }} of {{ totalPages === 0 ? 1 : totalPages }}</span>
      <BaseButton class="px-3 py-1" :disabled="currentPage + 1 === totalPages" @click="emit('next')">Next →</BaseButton>
    </div>
    <span class="w-1/4"></span>
  </div>
</template>

<script setup>
import BaseButton from '@/components/ui/input/BaseButton.vue'
const props = defineProps({
  loading: Boolean,
  currentPage: Number,
  totalPages: Number
})
const emit = defineEmits(['prev', 'next'])
</script>
