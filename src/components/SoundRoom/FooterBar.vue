<template>
  <!-- Save Confirmation Modal -->
  <YesNoModal
    v-if="showSaveConfirm"
    @close="showSaveConfirm = false"
    :yesFunction="handleSaveOnly"
    :noFunction="() => (showSaveConfirm = false)"
    message="Would you like to save your room?"
    title="Save Room"
  />

  <!-- New Room Confirmation Modal -->
  <YesNoModal
    v-if="showNewRoomConfirm"
    @close="showNewRoomConfirm = false"
    :yesFunction="handleSaveThenNewRoom"
    :noFunction="handleSkipSaveThenNewRoom"
    :showCancelButton="true"
    message="Would you like to save this room first?"
    title="New Room"
  />

  <!-- Footer Buttons -->
  <div class="flex justify-start items-center h-15 p-2 space-x-3">
    <BaseButton
      @click="showSaveConfirm = true"
      :disabled="isSaving || !isRoomSaveable"
      class="px-3 py-2 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      type="button"
      aria-label="Open save room confirmation"
    >
      Save Room
    </BaseButton>

    <BaseButton
      @click="showNewRoomConfirm = true"
      :disabled="isSaving || !isRoomSaveable"
      class="px-3 py-2 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      type="button"
      aria-label="Open new room confirmation"
    >
      New Room +
    </BaseButton>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useRoomStore } from '@/stores/useRoomStore';
import { useAuth } from '@/composables/useAuth';
import BaseButton from '@/components/ui/input/BaseButton.vue';
import YesNoModal from '@/components/ui/modals/YesNoModal.vue';

const emit = defineEmits(['saveRoom']);
const props = defineProps({
  isSaving: { type: Boolean, required: true },
});

const router = useRouter();
const { isAuthenticated } = useAuth();
const { isRoomSaveable } = storeToRefs(useRoomStore());

const showSaveConfirm = ref(false);
const showNewRoomConfirm = ref(false);

function handleSaveOnly() {
  if (!isAuthenticated.value) {
    showSaveConfirm.value = false;
    router.push('/login');
    return;
  }
  emit('saveRoom');
  showSaveConfirm.value = false;
}

function handleSaveThenNewRoom() {
  if (!isAuthenticated.value) {
    showNewRoomConfirm.value = false;
    router.push('/login');
    return;
  }
  emit('saveRoom');
  router.push('/');
}

function handleSkipSaveThenNewRoom() {
  router.push('/');
}
</script>
