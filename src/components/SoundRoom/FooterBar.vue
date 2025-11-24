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
        class="px-3 py-2 rounded bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
        type="button"
        aria-label="Open save room confirmation"
      >
        Save Room
      </BaseButton>

      <BaseButton
        @click="showNewRoomConfirm = true"
        :disabled="isSaving || isRoomEmpty"
        class="px-3 py-2 rounded bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
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

const props = defineProps({
  isSaving: { type: Boolean, required: true },
  onSave: { type: Function, required: true },
});

const router = useRouter();
const { isAuthenticated } = useAuth();
const { isRoomSaveable, isRoomEmpty } = storeToRefs(useRoomStore());

const showSaveConfirm = ref(false);
const showNewRoomConfirm = ref(false);


async function handleSaveOnly() {
  if (!isAuthenticated.value) {
    showSaveConfirm.value = false;
    router.push('/login');
    return;
  }
  try {
    await props.onSave();
  } catch (error) {
    console.error('Error saving room:', error);
  } finally {
    showSaveConfirm.value = false;
  }
}

async function handleSaveThenNewRoom() {
  if (!isAuthenticated.value) {
    showNewRoomConfirm.value = false;
    router.push('/login');
    return;
  }
  try {
    const didSave = await props.onSave();
    if (didSave) {
      resetRoomState();
      router.push('/');
    }
  } catch (error) {
    console.error('Error saving room before creating a new one:', error);
  } finally {
    showNewRoomConfirm.value = false;
  }
}

function handleSkipSaveThenNewRoom() {
  resetRoomState();
  router.push('/');
}
</script>
