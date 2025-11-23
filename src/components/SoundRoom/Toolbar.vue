<template>
  <div class="flex items-center justify-between p-3 border-[var(--sr-panel-border)] dark:border-[var(--sr-panel-border)] bg-[var(--sr-bg-2)] dark:bg-[var(--sr-bg-0)] space-x-10 w-full shadow-[var(--sr-shadow)] dark:shadow-none">
          
    <div class="flex space-x-2 w-1/3">
      <BaseButton
      :disabled="audioEngine.soundSources.value.length === 0"
      @click="isPlaying ? audioEngine.pauseAll() : audioEngine.playAll()"
      class="px-3 py-1 rounded text-sm bg-[var(--sr-bg-1)] hover:bg-[var(--sr-bg-2)] text-[var(--sr-text-0)] dark:bg-[var(--sr-bg-2)] dark:hover:bg-[var(--sr-bg-1)]"
      > 
        
        <component :is="isPlaying ? Pause : Play" class="h-4 w-4 fill-[var(--sr-text-0)] dark:fill-[var(--sr-text-0)]" />
      </BaseButton>
      <BaseButton
        :disabled="actionStackEmpty || waiting"
        @click="actionManager.undoLastAction"
        class="px-3 py-1 rounded text-sm bg-[var(--sr-bg-1)] hover:bg-[var(--sr-bg-2)] text-[var(--sr-text-0)] dark:bg-[var(--sr-bg-2)] dark:hover:bg-[var(--sr-bg-1)]"
      >
        <UndoRedo class="h-4 w-4 fill-[var(--sr-text-0)] dark:fill-[var(--sr-text-0)]"/>
      </BaseButton>
      <BaseButton
        :disabled="redoStackEmpty || waiting"
        @click="actionManager.redoLastAction"
        class="px-3 py-1 rounded text-sm bg-[var(--sr-bg-1)] hover:bg-[var(--sr-bg-2)] text-[var(--sr-text-0)] dark:bg-[var(--sr-bg-2)] dark:hover:bg-[var(--sr-bg-1)]"
      >
        <UndoRedo class="h-4 w-4 scale-x-[-1] fill-[var(--sr-text-0)] dark:fill-[var(--sr-text-0)]"/>
      </BaseButton>
    </div>
    <EditableRoomName
      v-if="isAuthenticated"
      :roomId="room.id"
      :name="room.name"
      class="w-1/3"
      @updated="handleRoomNameUpdate"
    />
    <div class="flex items-center justify-center space-x-2 w-1/3">
     
      <span class="text-xs text-[var(--sr-text-1)]">Master</span>
      <VueSlider 
        v-model="audioEngine.masterVolume.value"
        :min="0" 
        :max="1" 
        :interval="0.01"
        :width="100"
        :height="4"
        tooltip="none"
        class="mr-3"
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
