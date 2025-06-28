<template>
  <SpeedInsights />
  <div id="app">
    <RouterView/>
    
  </div>
</template>

<script setup>
import { SpeedInsights } from '@vercel/speed-insights/vue';
import SoundRoom from '@/views/SoundRoom.vue'

</script>
