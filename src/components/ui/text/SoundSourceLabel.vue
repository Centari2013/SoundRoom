<template>
  <div
    class="absolute pointer-events-none w-20 overflow-hidden text-xs text-center text-neutral-700 dark:text-neutral-300"
    :style="{
      top: `${y}px`,
      left: `${x}px`,
      transform: 'translate(-50%, 0)',
    }"
  >
    <Vue3Marquee :pauseOnHover="true" :duration="6" class="whitespace-nowrap">
      {{ text }}
    </Vue3Marquee>
  </div>
</template>

<script setup>
import { Vue3Marquee } from 'vue3-marquee'

defineProps({
  text: String,
  x: Number,
  y: Number
})
</script>
