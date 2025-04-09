<template>
  <div
    v-if="visible"
    :style="{ top: `${pos.y}px`, left: `${pos.x}px` }"
    class="absolute z-50 bg-white dark:bg-neutral-800 border-none rounded shadow p-2 text-sm"
    @mouseleave="$emit('close')"
  >
    <ul class="space-y-1">
      <li
        v-for="f in functionList"
        :key="f.label"
        @click="f.function"
        class="px-2 py-1 rounded cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
      >
        {{ f.label }}
      </li>
    </ul>
  </div>
</template>

<script setup>
defineProps({
  visible: Boolean,
  pos: Object,
  functionList: Array
})

defineEmits(['close'])
</script>
