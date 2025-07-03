<template>
  <div class="flex items-center justify-between p-3 border-b border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 space-x-10 w-full">
          
    <div class="flex space-x-2 w-1/3">
      <BaseButton
      :disabled="audioEngine.soundSources.value.length === 0"
      @click="isPlaying ? audioEngine.pauseAll() : audioEngine.playAll()"
      class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700"
      >
        {{ isPlaying ? 'Pause All' : 'Play All' }}
      </BaseButton>
      <BaseButton
        :disabled="actionStackEmpty || waiting"
        @click="actionManager.undoLastAction"
        class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700"
      >
        Undo
      </BaseButton>
      <BaseButton
        :disabled="redoStackEmpty || waiting"
        @click="actionManager.redoLastAction"
        class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700"
      >
        Redo
      </BaseButton>
    </div>
    <div v-if="isAuthenticated" class=" w-1/3">
      <BaseInput v-model="room.name" class="text-center"/>
    </div>
    <div class="flex items-center justify-center space-x-2 w-1/3">
     
      <span class="text-xs text-neutral-500">Master</span>
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
import BaseInput from '@/components/ui/input/BaseInput.vue'
import VueSlider from 'vue-3-slider-component'
import { useAuth } from '@/composables/useAuth'

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

</script>
