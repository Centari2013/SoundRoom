<template>
  <div
    @click.self="canClickOutside && emit('close')"
    class="fixed inset-0 bg-surface-app/70 backdrop-blur-sm z-50 flex items-center justify-center"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="'modal-title'"
  >
    <div
      ref="modalContent"
      class="bg-surface-base text-text-primary rounded-2xl w-[90vw] max-w-md h-auto max-h-[85vh] shadow-xl border border-border-subtle relative overflow-hidden"
      tabindex="-1"
    >
      <!-- Header -->
      <div
        class="top-0 left-0 right-0 z-10 flex justify-between items-center px-4 py-3 bg-surface-base/80 backdrop-blur-md border-b border-border-subtle"
      >
        <h2 id="modal-title" class="text-lg font-semibold tracking-tight">
          {{ title }}
        </h2>
        <BaseButton
          v-if="showCloseButton"
          @click="emit('close')"
          class="text-sm hover:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          aria-label="Close modal"
        >
          Close
        </BaseButton>
      </div>

      <!-- Body -->
      <div class="flex justify-center items-center p-10 text-sm leading-relaxed space-y-4">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import BaseButton from '@/components/ui/input/BaseButton.vue'

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

const modalContent = ref(null)

// ⌨️ Focus trap and ESC close
const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  modalContent.value?.focus()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>



