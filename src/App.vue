<!-- App.vue -->
<template>
  <SpeedInsights/>
  <HeaderBar/>
  <RouterView/>
  <portal-target name="modal" />
</template>


<script setup>
import { SpeedInsights } from '@vercel/speed-insights/vue'
import HeaderBar from './components/SoundRoom/HeaderBar.vue';

</script>
