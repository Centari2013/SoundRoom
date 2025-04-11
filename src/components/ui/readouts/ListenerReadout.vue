<template>
  <section>
    <h5 class="text-sm font-semibold uppercase text-neutral-600 dark:text-neutral-400 mb-2">Listener</h5>
    <div class="text-xs space-y-1">
      <p>X: {{ listener.x }}</p>
      <p>Y: {{ listener.y }}</p>
      <p>Angle: {{ displayListenerAngle }}°</p>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({
  listener: Object
})

const displayListenerAngle = computed(() => ((props.listener.angle % 360 + 360) % 360))
</script>