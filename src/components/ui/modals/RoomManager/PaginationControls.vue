<template>
  <div class="absolute flex bottom-0 left-0 right-0 p-4 phone:p-2.5 bg-surface-base border-t border-border-subtle text-text-primary">
    <span class="w-1/4"></span>
    <div class="flex items-center justify-center w-1/2 space-x-3" :class="{ invisible: loading }">
      <BaseButton class="px-3 py-1 phone:py-2 phone:px-4" :disabled="currentPage === 0" @click="emit('prev')">← Prev</BaseButton>
      <span class="text-sm phone:text-xs">Page {{ currentPage + 1 }} / {{ totalPages === 0 ? 1 : totalPages }}</span>
      <BaseButton class="px-3 py-1 phone:py-2 phone:px-4" :disabled="currentPage + 1 === totalPages" @click="emit('next')">Next →</BaseButton>
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
