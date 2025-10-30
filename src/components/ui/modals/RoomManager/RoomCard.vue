<template>
  <div class="room-row p-4 border border-base rounded-lg shadow-sm hover:bg-panel-overlay transition bg-panel-raised text-panel-raised">
    <img
      v-if="room.thumbnail"
      :src="room.thumbnail"
      alt="Room preview"
      class="rounded mb-3 w-full aspect-video object-cover border border-base"
    />
    <EditableRoomName
      :roomId="room.id"
      :name="room.name"
      @updated="name => emit('update-name', name)"
    />
    <div class="room-meta text-xs text-muted">{{ formatDate(room.updated_at) }}</div>
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
