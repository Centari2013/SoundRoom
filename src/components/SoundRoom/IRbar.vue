<template>
  <div class="flex items-center justify-between p-3 border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 space-x-10 w-full h-1/12">
          
    
    
    <div class="flex items-center justify-center space-x-2 w-1/3">
     
      <span class="text-xs text-neutral-500">IR Select</span>
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
import BaseInput from '@/components/ui/input/BaseInput.vue'

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
