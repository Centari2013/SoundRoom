<template>
  

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
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AuthModal from '@/components/ui/modals/LoginSignup/AuthModal.vue';
const emit = defineEmits(['openHelp', 'openSignUp'])


const route = useRoute()
const router = useRouter()
const showAuthModal = ref(false);
const authMode = ref('signup'); // 'login' | 'signup' | 'reset

const headerButtons = ref([
  { label: 'Help', action: () => emit('openHelp') },
  { label: 'Sign Up', action: () => router.push('/signup') },
])

const handleModeChange = (mode) => {
  authMode.value = mode;
  router.push(`/${mode}`);
}

watch(() => route.path, (val) => {
  showAuthModal.value = ['/login', '/signup', '/reset'].includes(val)
  authMode.value = val.replace('/', '') // 'login' | 'signup' | 'reset'
})


</script>