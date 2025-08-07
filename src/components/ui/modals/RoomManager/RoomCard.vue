<template>
  <div class="room-row p-4 border border-neutral-700 rounded-lg shadow-sm hover:bg-neutral-800 transition">
    <img
      v-if="room.thumbnail"
      :src="room.thumbnail"
      alt="Room preview"
      class="rounded mb-3 w-full aspect-video object-cover border border-neutral-800"
    />
    <EditableRoomName
      :roomId="room.id"
      :name="room.name"
      @updated="name => emit('update-name', name)"
    />
    <div class="room-meta text-xs text-neutral-400">{{ formatDate(room.updated_at) }}</div>
    <div class="room-actions mt-3 flex gap-2">
      <BaseButton @click="emit('load', room.id)">Load</BaseButton>
      <BaseButton @click="emit('delete', room.id)">Delete</BaseButton>
    </div>
  </div>
</template>

<script setup>
import BaseButton from '@/components/ui/input/BaseButton.vue'
import EditableRoomName from '@/components/ui/modals/RoomManager/EditableRoomName.vue'
import { formatDate } from '@/utils/dateUtils'

const props = defineProps({
  room: Object
})
const emit = defineEmits(['update-name', 'load', 'delete'])
</script>
