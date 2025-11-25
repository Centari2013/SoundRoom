<template>
  <li
    class="cursor-move bg-surface-raised text-text-primary border border-border-subtle p-1 rounded text-center"
    draggable="true"
  >
    {{ librarySource.name }}
  </li>
</template>
<script setup>


const props = defineProps({
  librarySource: Object
})


</script>