<template>
  <div class="flex justify-start items-center h-15 p-2 space-x-3">
    <button @click="saveRoom">
      Save Room
    </button>
    <button @click="loadRoom" v-if="false">
      Load Room
    </button>
  </div>
</template>
  
<script setup>
import { saveRoomLocal } from '@/utils/saveRoom'

const emit = defineEmits(['saveRoom', 'loadRoom'])
const props = defineProps({
  room: {
    type: Object,
    required: true
  },
  listener: {
    type: Object,
    required: true
  },
  soundLibrarySources: {
    type: Object,
    required: true
  },
  audioEngine: {
    type: Object,
    required: true
  }
})

const saveRoom = () => {
  console.log('Room saved:', props.room);
  console.log('Listener:', props.listener);
  console.log('Sound Library Sources:', props.soundLibrarySources);
  console.log('Audio Engine:', props.audioEngine);
  //saveRoomLocal(props.room, props.listener, props.soundLibrarySources, props.audioEngine);
}

const loadRoom = () => {
  // Logic to load room
}
</script>