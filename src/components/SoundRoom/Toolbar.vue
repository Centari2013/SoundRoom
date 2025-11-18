<template>
  <div
    class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-3 border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 w-full"
  >

    <!-- Button row stacks on small screens to keep tap targets large -->
    <div class="flex flex-wrap gap-3 w-full sm:w-auto">
      <BaseButton
      :disabled="audioEngine.soundSources.value.length === 0"
      @click="isPlaying ? audioEngine.pauseAll() : audioEngine.playAll()"
      class="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700"
      >

        <component :is="isPlaying ? Pause : Play" class="h-4 w-4 fill-black dark:fill-white" />
      </BaseButton>
      <BaseButton
        :disabled="actionStackEmpty || waiting"
        @click="actionManager.undoLastAction"
        class="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700"
      >
        <UndoRedo class="h-4 w-4 fill-black dark:fill-white"/>
      </BaseButton>
      <BaseButton
        :disabled="redoStackEmpty || waiting"
        @click="actionManager.redoLastAction"
        class="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700"
      >
        <UndoRedo class="h-4 w-4 scale-x-[-1] fill-black dark:fill-white"/>
      </BaseButton>
    </div>
    <EditableRoomName
      v-if="isAuthenticated"
      :roomId="room.id"
      :name="room.name"
      class="w-full sm:w-1/3"
      @updated="handleRoomNameUpdate"
    />
    <!-- Master slider drops below controls on mobile to prevent crowding -->
    <div class="flex items-center justify-between gap-3 w-full sm:w-1/3">

      <span class="text-xs text-neutral-500">Master</span>
      <VueSlider
        v-model="audioEngine.masterVolume.value"
        :min="0" 
        :max="1" 
        :interval="0.01"
        :width="140"
        :height="4"
        tooltip="none"
        class="flex-1"
      />
    </div>
  </div>
</template>

<script setup>
import BaseButton from '@/components/ui/input/BaseButton.vue'
import EditableRoomName from '@/components/ui/modals/RoomManager/EditableRoomName.vue'

import UndoRedo from '@/assets/icons/undo-redo.svg'
import Pause from '@/assets/icons/pause.svg'
import Play from '@/assets/icons/play.svg'

import VueSlider from 'vue-3-slider-component'
import { useAuth } from '@/composables/useAuth'
import { useSaveAndLoadRoom } from '@/composables/useSaveAndLoadRoom'

import { useRoomStore } from '@/stores/useRoomStore'
import { useAudioEngineStore } from '@/stores/useAudioEngineStore'
import { useActionManagerStore } from '@/stores/useActionManagerStore'
import { storeToRefs } from 'pinia'

const roomStore = useRoomStore()
const engineStore = useAudioEngineStore()
const actionStore = useActionManagerStore()
const { room } = storeToRefs(roomStore)
const { audioEngine, isPlaying } = storeToRefs(engineStore)
const { actionManager, actionStackEmpty, redoStackEmpty, waiting } = storeToRefs(actionStore)

const { isAuthenticated } = useAuth()

const { updateRoomName } = useSaveAndLoadRoom()

async function handleRoomNameUpdate(newName) {
  // Skip if the name didn't actually change
  if (room.value.name.value === newName) return

  room.value.name.value = newName

  if (room.value.id) {
    const success = await updateRoomName(room.value.id, newName)
    if (!success) {
      console.error('Failed to update room name')
    }
  } else {
    roomStore.commitRoomName(room.value.id, newName)
  }
}
</script>
