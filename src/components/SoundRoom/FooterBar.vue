<template>
  <!-- Modal -->
  <YesNoModal
   v-if="showSaveMessage"
   @close="showSaveMessage = false"
   v-bind="{
    yesFunction,
    noFunction,
    message: 'Would you like to save your room?',
    title: 'Save Room'
   }"
   />


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
import BaseButton from '@/components/ui/input/BaseButton.vue';
import YesNoModal from  '@/components/ui/modals/YesNoModal.vue';

const emit = defineEmits(['saveRoom'])
const props = defineProps({
  isSaving: {
    type: Boolean,
    required: true,
  }
})

const showSaveMessage = ref(false);

const yesFunction = () => {
  emit('saveRoom');
  showSaveMessage.value = false;
};
const noFunction = () => {
  showSaveMessage.value = false;
};


</script>