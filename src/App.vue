<!-- App.vue -->
<template>
  <SpeedInsights/>
  <RouterView/>
  <portal-target name="modal" />
</template>


<script setup>
import { SpeedInsights } from '@vercel/speed-insights/vue'
import SoundRoom from '@/views/SoundRoom.vue'

</script>
