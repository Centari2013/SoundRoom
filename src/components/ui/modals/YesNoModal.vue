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
        class="text-lg font-medium text-neutral-800 dark:text-neutral-200"
        :id="`modal-title-save`"
      >
        {{ message }}
      </p>
      <div class="flex space-x-4">
        <BaseButton
          v-for="button in buttons"
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

</template>

  
<script setup>
import { ref } from 'vue';
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
  message: {
    type: String,
    default: 'Would you like to ___?'
  },
  title: {
    type: String,
    default: 'Confirmation'
  }
})


const buttons = ref([
  { label: 'Yes', action: () => {props.yesFunction(); emit('close')} },
  { label: 'No', action: () => {props.noFunction(); emit('close')} }
]);

</script>