<template>
  <SmallModal
    v-if="showSaveMessage"
    @close="showSaveMessage = false"
    :showCloseButton="false"
  >
    <div class="flex flex-col items-center justify-center text-center h-40 px-6 space-y-6">
      <p class="text-lg font-medium text-neutral-800 dark:text-neutral-200">
        Would you like to {{ mode }} your room?
      </p>
      <div class="flex space-x-4">
        <button v-for="button in saveOptionButtons"
          :key="button.label"
          class="px-4 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition"
          @click="button.action"
        >
          {{ button.label }}
        </button>
      
      </div>
    </div>
  </SmallModal>

  <div class="flex justify-start items-center h-15 p-2 space-x-3">
    <button @click="handleShowMessage(true, 'save')"
      :disabled="isSaving">
      Save Room
    </button>
    <button @click="handleShowMessage(true, 'load')"
      :disabled="isLoading">
      Load Room
    </button>
  </div>
</template>
  
<script setup>
import { ref } from 'vue';
import SmallModal from '@/components/ui/modals/SmallModal.vue';

const emit = defineEmits(['saveRoom','loadRoom'])
const props = defineProps({
  isSaving: {
    type: Boolean,
    required: true,
  },  
  isLoading: {
    type: Boolean,
    required: true,
  },
})

const showSaveMessage = ref(false);
const mode = ref('save'); // 'save' or 'load'

const saveOptionButtons = ref([
  { label: 'Yes', action: () => {emit(`${mode.value}Room`); showSaveMessage.value = false} },
  { label: 'No', action: () => showSaveMessage.value = false }
]);

function handleShowMessage(bool, newMode) {
  showSaveMessage.value = bool;
  mode.value = newMode;
}

</script>