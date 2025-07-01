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
    </template>
  </div>
</template>

<script setup>
import { ref, watch, toRefs } from 'vue'

const emit = defineEmits(['updated'])
const props = defineProps({
  roomId: { type: String, required: true },
  name: { type: String, default: '' },
  onUpdate: { type: Function, required: true }
})

const { name, roomId } = toRefs(props)
const isEditing = ref(false)
const localName = ref(name.value)

watch(name, (newVal) => {
  if (!isEditing.value) localName.value = newVal
})

function startEditing() {
  isEditing.value = true
  localName.value = name.value
}

function cancelEdit() {
  isEditing.value = false
  localName.value = name.value
}

async function handleBlur() {
  isEditing.value = false
  const newName = localName.value.trim()
  const oldName = name.value?.trim()

  const success = await props.onUpdate(roomId.value, newName)
  if (!success) {
    // Optionally show a toast or revert name
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
