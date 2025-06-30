<template>
  <BaseInput v-model="roomName" placeholder="Your Room Name" class="text-center"/>
</template>
<script setup>
import { ref } from 'vue'
import BaseInput from '@/components/ui/input/BaseInput.vue'


const roomName = ref('')

</script>