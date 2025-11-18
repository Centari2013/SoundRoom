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
  <div class="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 py-3">
    <div class="flex flex-wrap items-center justify-center gap-3 md:justify-start">
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
        :disabled="isSaving || isRoomEmpty"
        class="px-3 py-2 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        type="button"
        aria-label="Open new room confirmation"
      >
        New Room +
      </BaseButton>
    </div>
    <div class="flex justify-center md:hidden">
      <IRSelect />
    </div>

    <div class="hidden md:block absolute left-1/2 -translate-x-1/2">
      <IRSelect />
    </div>

    <div v-if="isAuthenticated" class="flex justify-center md:justify-end">
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
