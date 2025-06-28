<template>
  <header class="px-6 py-4 border-b border-neutral-300 dark:border-neutral-800 dark:bg-black flex items-center justify-between">
    <h1 class="text-xl font-bold tracking-wide dark:text-gray-300 ">SoundRoom</h1>
    <nav class="space-x-4">
      <BaseButton
        v-for="button in headerButtons"
        :key="button.label"
        class="px-3 py-1 text-sm rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        @click="button.action"
        type="button"
      >
        {{ button.label }}
      </BaseButton>
    </nav>

  </header>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BaseButton from '@/components/ui/input/BaseButton.vue';
const emit = defineEmits(['openHelp', 'openSignUp'])


const route = useRoute()
const router = useRouter()
const showAuthModal = ref(false);
const authMode = ref('signup'); // 'login' | 'signup' | 'reset

const headerButtons = ref([
  { label: 'Help', action: () => router.push('/help') },
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