<template>
  <div class="flex items-center justify-between p-3 border-b border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 space-x-10 w-full">
          
    <div class="flex space-x-2 w-1/3">
      <BaseButton
      :disabled="!canPlay"
      @click="$emit('togglePlay')"
      class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700"
      >
        {{ playing ? 'Pause All' : 'Play All' }}
      </BaseButton>
      <BaseButton
        :disabled="!canUndo"
        @click="$emit('undo')"
        class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700"
      >
        Undo
      </BaseButton>
      <BaseButton
        :disabled="!canRedo"
        @click="$emit('redo')"
        class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700"
      >
        Redo
      </BaseButton>
    </div>
    <div v-if="isAuthenticated" class=" w-1/3">
      <BaseInput v-model="roomNameProxy" class="text-center"/>
    </div>
    <div class="flex items-center justify-center space-x-2 w-1/3">
     
      <span class="text-xs text-neutral-500">Master</span>
      <VueSlider 
        v-model="masterVolumeProxy"
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

import { computed } from 'vue'


const emit = defineEmits(['undo', 'redo', 'togglePlay', 'update:roomName', 'update:masterVolume'])
const props = defineProps({
  audioEngine: {
    type: Object,
    required: true
  },
  roomName: {
    type: String,
    default: ''
  },
  masterVolume: {
    type: Number,
    default: 1
  },
  canPlay: Boolean,
  canUndo: Boolean,
  canRedo: Boolean,
  playing: Boolean
})

const { isAuthenticated } = useAuth()

const roomNameProxy = computed({
  get: () => props.roomName,
  set: (val) => emit('update:roomName', val)
})

const masterVolumeProxy = computed({
  get: () => props.audioEngine.masterVolume.value,
  set: (v) => emit('update:masterVolume', v)
})



</script>
