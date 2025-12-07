<template>
  <div
    class="room-row p-4 border border-border-subtle rounded-lg shadow-sm hover:bg-[var(--color-bg-elevated)] transition bg-surface-base text-text-primary"
    :class="{ 'opacity-60': locked }"
    :title="locked ? lockTooltip : undefined"
  >
    <div v-if="room.thumbnail" class="relative mb-3">
      <img
        :src="room.thumbnail"
        alt="Room preview"
        class="rounded w-full aspect-video object-cover border border-border-subtle"
      />
      <div
        v-if="locked"
        class="absolute inset-0 flex items-center justify-center text-2xl"
        aria-hidden="true"
      >
        🔒
      </div>
    </div>
    <div class="flex items-start justify-between gap-2">
      <EditableRoomName
        :roomId="room.id"
        :name="room.name"
        @updated="name => emit('update-name', name)"
      />
    </div>
    <div class="room-meta text-xs text-text-muted">{{ formatDate(room.updated_at) }}</div>
    <div class="room-actions mt-3 flex gap-2">
      <BaseButton
        @click="emit('load', room.id)"
        :disabled="locked"
        :title="locked ? lockTooltip : undefined"
      >
        Load
      </BaseButton>
      <BaseButton @click="emit('delete', room.id)">Delete</BaseButton>
    </div>
  </div>
</template>

<script setup>
import BaseButton from '@/components/ui/input/BaseButton.vue'
import EditableRoomName from '@/components/ui/modals/RoomManager/EditableRoomName.vue'
import { formatDate } from '@/utils/dateUtils'

const props = defineProps({
  room: Object,
  locked: Boolean,
  lockTooltip: {
    type: String,
    default: ''
  }
})
const emit = defineEmits(['update-name', 'load', 'delete'])
</script>
