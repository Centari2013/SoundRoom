<template>

    <!-- Conditional rendering -->
    <Vue3Marquee
      class="text-sm font-semibold mb-3 justify-center"
      :pauseOnHover="true"
      :animate-on-overflow-only="true"
      @on-loop-complete="setDirection"
    >
      {{ text }}
    </Vue3Marquee>

</template>
<script setup>
import { Vue3Marquee } from 'vue3-marquee'


defineProps({
  text: String
})



</script>