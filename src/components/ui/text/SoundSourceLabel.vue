<template>
  <div
    class="absolute pointer-events-none w-20 overflow-hidden text-xs text-text-muted"
    :style="{
      top: `${y}px`,
      left: `${x}px`,
      transform: 'translate(-50%, 0)',
    }"
  >
    <Vue3Marquee :pauseOnHover="true" :duration="6" :animate-on-overflow-only="true" class="whitespace-nowrap italic justify-around">
      {{ name }}
    </Vue3Marquee>
  </div>
</template>

<script setup>
import { Vue3Marquee } from 'vue3-marquee'

defineProps({
  name: String,
  x: Number,
  y: Number
})
</script>
