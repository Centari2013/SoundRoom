<template>
  <section>
    <h5 class="text-sm font-semibold uppercase text-neutral-600 dark:text-neutral-400 mb-2">Listener</h5>
    <div class="text-xs space-y-1">
      <p>X: {{ store.listener.x }}</p>
      <p>Y: {{ store.listener.y }}</p>
      <p>Angle: {{ displayListenerAngle }}°</p>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useRoomStore } from '@/features/soundroom/stores/useRoomStore';

const store = useRoomStore()

// normalizes the angle of the listener into a 0–359° range, rotating the origin from the default right (0°) to top (0°)
const displayListenerAngle = computed(() => Math.round(((store.listener.angle - 180) % 360 + 360) % 360))
</script>