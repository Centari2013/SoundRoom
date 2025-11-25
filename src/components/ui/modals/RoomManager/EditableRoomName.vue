<template>
  <div class="room-name font-medium truncate">
    <template v-if="isEditing">
      <input
        v-model="localName"
        class="w-full bg-surface-raised text-text-primary px-2 py-1 rounded border border-border-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        @blur="handleBlur"
        @keyup.enter="handleBlur"
        @keyup.esc="cancelEdit"
        autofocus
      />
    </template>
    <template v-else>
      <span @click="startEditing" class="cursor-pointer hover:underline">
        {{ name || 'Untitled Room' }}
      </span>
      <p v-if="errorMsg" class="text-status-danger text-xs">{{ errorMsg }}</p>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, toRefs } from 'vue'
import { useRoomStore } from '@/stores/useRoomStore'

const emit = defineEmits(['updated'])
const props = defineProps({
  roomId: { type: String },
  name: { default: '' },
})

const { name, roomId } = toRefs(props)
const isEditing = ref(false)
const localName = ref(name.value)
const errorMsg = ref('')
const roomStore = useRoomStore()

watch(name, (newVal) => {
  if (!isEditing.value) localName.value = newVal
})

function startEditing() {
  isEditing.value = true
  localName.value = name.value
  errorMsg.value = ''
}

function cancelEdit() {
  isEditing.value = false
  localName.value = name.value
  errorMsg.value = ''
}

async function handleBlur() {
  isEditing.value = false
  const baseName = localName.value.trim()
  const uniqueName = roomStore.generateUniqueRoomName(roomId.value, baseName)
  const oldName = name.value?.trim()

  if (uniqueName === oldName) return

  emit('updated', uniqueName)
}
</script>


<style scoped>
.room-name input {
  outline: none;
}
</style>
