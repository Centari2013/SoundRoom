<template>
  <!-- Modal -->
  <SmallModal
    :showCloseButton="false"
    :title="title"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="`modal-title-save`"
    :aria-describedby="`modal-desc-save`"
  >
    <div
      class="flex flex-col items-center justify-center text-center px-6 space-y-6"
      :id="`modal-desc-save`"
    >
      <p
        class="text-lg font-medium text-[var(--color-text-primary)]"
        :id="`modal-title-save`"
      >
        {{ message }}
      </p>
      <div class="flex space-x-4">
        <BaseButton
          ref="yesButton"
          class="px-4 py-2 text-sm font-medium rounded"
          @click="handleYes"
          type="button"
        >
          Yes
        </BaseButton>
        <BaseButton
          class="px-4 py-2 text-sm font-medium rounded"
          @click="handleNo"
          type="button"
        >
          No
        </BaseButton>
        <BaseButton
          v-if="showCancelButton"
          class="px-4 py-2 text-sm font-medium rounded"
          @click="handleCancel"
          type="button"
        >
          Cancel
        </BaseButton>
      </div>
    </div>
  </SmallModal>

</template>


<script setup>
import { onMounted, onBeforeUnmount, ref, nextTick } from 'vue';
import SmallModal from '@/components/ui/modals/SmallModalBase.vue';
import BaseButton from '@/components/ui/input/BaseButton.vue';

const emit = defineEmits(['close']);
const props = defineProps({
  yesFunction: {
    type: Function,
    required: true
  },
  noFunction: {
    type: Function,
    required: true
  },
  showCancelButton: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: 'Would you like to ___?'
  },
  title: {
    type: String,
    default: 'Confirmation'
  }
})

function handleYes() {
  props.yesFunction()
  emit('close')
}

function handleNo() {
  props.noFunction()
  emit('close')
}

function handleCancel() {
  emit('close')
}

// Keyboard shortcuts: Enter = Yes (the default action), Esc = No (cancel).
// Focusing the Yes button on mount also lets the browser's built-in
// Enter-on-focused-button behavior act as a backstop.
const yesButton = ref(null)

function handleKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    handleYes()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    handleNo()
  }
}

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown)
  await nextTick()
  // BaseButton is a component; reach into $el to focus the underlying <button>.
  const el = yesButton.value?.$el ?? yesButton.value
  el?.focus?.()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>
