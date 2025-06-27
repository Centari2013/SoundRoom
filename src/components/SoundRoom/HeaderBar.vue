<template>
  <LoginModal v-if="showLogin" 
  @close="showLogin = false"/>

  <header class="px-6 py-4 border-b border-neutral-300 dark:border-neutral-800 flex items-center justify-between">
    <h1 class="text-xl font-bold tracking-wide dark:text-gray-300">SoundRoom</h1>
    <nav class="space-x-4">
      <button v-for="button in headerButtons" :key="button.label" class="px-3 py-1 text-sm rounded hover:bg-neutral-200 dark:hover:bg-neutral-800" @click="button.action">
        {{ button.label }}
      </button>
    </nav>
  </header>
</template>

<script setup>
import { ref } from 'vue';

import LoginModal from '@/components/ui/modals/LoginModal.vue';
const emit = defineEmits(['openHelp', 'openSignUp'])

const showLogin = ref(false);

const headerButtons = ref([
  { label: 'Help', action: () => emit('openHelp') },
  { label: 'Sign Up', action: () => showLogin.value = true },
])


</script>