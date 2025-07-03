<template>
  <div class="room-name font-medium truncate">
    <template v-if="isEditing">
      <input
        v-model="localName"
        class="w-full bg-neutral-700 text-white px-2 py-1 rounded"
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
      <p v-if="errorMsg" class="text-red-400 text-xs">{{ errorMsg }}</p>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, toRefs } from 'vue'

const emit = defineEmits(['updated'])
const props = defineProps({
  roomId: { type: String, required: true },
  name: { type: String, default: '' },
  onUpdate: { type: Function, required: true },
  existingNames: { type: Array, default: () => [] } // All current names
})

const { name, roomId, existingNames } = toRefs(props)
const isEditing = ref(false)
const localName = ref(name.value)
const errorMsg = ref('')

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
  const newName = localName.value.trim()
  const oldName = name.value?.trim()

  if (newName === oldName || !newName) return

  // Check for duplicates, excluding this room's current name
  const isDuplicate = existingNames.value
    .filter(n => n !== oldName.toLowerCase())
    .includes(newName.toLowerCase())

  if (isDuplicate) {
    errorMsg.value = 'A room with that name already exists.'
    localName.value = name.value
    return
  }

  const success = await props.onUpdate(roomId.value, newName)
  if (!success) {
    localName.value = name.value
    return
  }

  emit('updated', newName)
}
</script>


<style scoped>
.room-name input {
  outline: none;
}
</style>
