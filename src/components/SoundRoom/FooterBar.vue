<template>
  <div class="flex justify-start items-center h-15 p-2 space-x-3">
    <button @click="emit('saveRoom')">
      Save Room
    </button>
    <button @click="emit('loadRoom')">
      Load Room
    </button>
  </div>
</template>
  
<script setup>

const emit = defineEmits(['saveRoom','loadRoom'])
const props = defineProps({

})

</script>