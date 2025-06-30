<template>
  <!-- Modal -->
  <SmallModal
    v-if="showSaveMessage"
    @close="showSaveMessage = false"
    :showCloseButton="false"
    title="Save Room"
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
        class="text-lg font-medium text-neutral-800 dark:text-neutral-200"
        :id="`modal-title-save`"
      >
        Would you like to save your room?
      </p>
      <div class="flex space-x-4">
        <BaseButton
          v-for="button in saveOptionButtons"
          :key="button.label"
          class="px-4 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          @click="button.action"
          type="button"
        >
          {{ button.label }}
        </BaseButton>
      </div>
    </div>
  </SmallModal>

  <!-- Footer Buttons -->
  <div class="flex justify-start items-center h-15 p-2 space-x-3">
    <BaseButton
      @click="showSaveMessage = true"
      :disabled="isSaving"
      class="px-3 py-2 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      type="button"
      aria-label="Open save room confirmation"
    >
      Save Room
    </BaseButton>
    
  </div>
</template>

  
<script setup>
import { ref } from 'vue';
import SmallModal from '@/components/ui/modals/SmallModalBase.vue';
import BaseButton from '@/components/ui/input/BaseButton.vue';

const emit = defineEmits(['saveRoom'])
const props = defineProps({
  isSaving: {
    type: Boolean,
    required: true,
  }
})

const showSaveMessage = ref(false);

const saveOptionButtons = ref([
  { label: 'Yes', action: () => {emit('saveRoom'); showSaveMessage.value = false} },
  { label: 'No', action: () => showSaveMessage.value = false }
]);

</script>