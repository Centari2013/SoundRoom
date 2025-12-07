<template>
  <li
    class="bg-surface-raised text-text-primary border border-border-subtle p-1 rounded text-center"
    :class="{
      'cursor-move': !librarySource.locked,
      'cursor-not-allowed opacity-60': librarySource.locked
    }"
    :draggable="!librarySource.locked"
    :aria-disabled="librarySource.locked"
  >
    {{ librarySource.name }}
  </li>
</template>
<script setup>


const props = defineProps({
  librarySource: Object
})


</script>