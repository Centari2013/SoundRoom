<template>
  <li
    class="cursor-move bg-surface-raised text-text-primary sr-border sr-border-subtle p-1 rounded text-center"
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