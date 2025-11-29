<template>
  <div class="h-full flex flex-col items-center justify-center text-center px-6 py-12 bg-surface-app text-text-primary">
    <h2 class="text-2xl font-semibold mb-2">You've been signed out</h2>
    <p class="text-text-muted mb-6">We hope you come back soon.</p>
    <BaseButton @click="$router.push({ name: 'login' })">Sign In Again</BaseButton>
  </div>
</template>
<script setup>
import BaseButton from '@/components/ui/input/BaseButton.vue';

</script>