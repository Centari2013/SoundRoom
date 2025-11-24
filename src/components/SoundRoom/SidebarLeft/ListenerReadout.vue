<template>
  <section class="text-[var(--color-text-primary)]">
    <h5 class="text-sm font-semibold uppercase text-[var(--color-text-muted)] mb-2">Listener</h5>
    <div class="text-xs space-y-1">
      <p>X: {{ store.listener.x }}</p>
      <p>Y: {{ store.listener.y }}</p>
      <p>Angle: {{ displayListenerAngle }}°</p>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useListenerStore } from '@/stores/useListenerStore';

const store = useListenerStore()

// normalizes the angle of the listener into a 0–359° range, rotating the origin from the default right (0°) to top (0°)
const displayListenerAngle = computed(() => Math.round(((store.listener.angle - 180) % 360 + 360) % 360))
</script>