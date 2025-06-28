<!-- App.vue -->
<template>
  <SpeedInsights/>
  <RouterView /> <!-- This renders SoundRoom and any children like modals -->
  <portal-target name="modal" />
</template>


<script setup>
import { SpeedInsights } from '@vercel/speed-insights/vue'


</script>
