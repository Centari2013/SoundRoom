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
  <div class="relative flex items-center justify-between h-15 p-2">
    <div class="flex space-x-3">
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
        :disabled="isSaving"
        class="px-3 py-2 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        type="button"
        aria-label="Open new room confirmation"
      >
        New Room +
      </BaseButton>
    </div>
    <div class="absolute left-1/2 -translate-x-1/2">
      <IRSelect />
    </div>

    <div v-if="isAuthenticated" class="ml-auto">
      <RouterLink
        to="/room-manager"
        aria-label="Open Room Manager"
      >
        <BaseButton class="w-full">
          RoomManager
        </BaseButton>
      </RouterLink>
    </div>
  </div>
  
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useRoomStore } from '@/stores/useRoomStore';
import { useAuth } from '@/composables/useAuth';
import { resetRoomState } from '@/utils/resetRoomState';
import BaseButton from '@/components/ui/input/BaseButton.vue';
import YesNoModal from '@/components/ui/modals/YesNoModal.vue';
import IRSelect from '@/components/SoundRoom/IRSelect.vue';

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
  resetRoomState();
  router.push('/');
}

function handleSkipSaveThenNewRoom() {
  resetRoomState();
  router.push('/');
}
</script>
