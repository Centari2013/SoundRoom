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
      :disabled="isSaving || !isRoomSaveable"
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
import { useAuth } from '@/composables/useAuth';
import { useRouter } from 'vue-router';
import { useRoomStore } from '@/features/soundroom/stores/useRoomStore';
import { storeToRefs } from 'pinia';

const emit = defineEmits(['saveRoom'])
const props = defineProps({
  isSaving: {
    type: Boolean,
    required: true,
  }
})

const router = useRouter();
const { isRoomSaveable } = storeToRefs(useRoomStore());

const { isAuthenticated } = useAuth();
const showSaveMessage = ref(false);

const yesFunction = () => {
  if (!isAuthenticated.value) {
    showSaveMessage.value = false;
    router.push('/login');
    return
  }
  emit('saveRoom');
  showSaveMessage.value = false;
};
const noFunction = () => {
  showSaveMessage.value = false;
};


</script>