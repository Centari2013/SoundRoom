<template>
  <PulsingOverlay v-if="isLoggingOut" :duration="2000" :text="'Logging out...'" @done="isLoggingOut = false" />
  <header class="px-6 py-4 border-b border-neutral-300 dark:border-neutral-800 dark:bg-black flex items-center justify-between">
    <h1 class="text-xl font-bold tracking-wide dark:text-gray-300"><RouterLink to="/" style="text-decoration: none; color: inherit;">SoundRoom</RouterLink></h1>
    <nav v-if="shouldShowNavButtons" class="space-x-4">
      <BaseButton
        v-if="!isAuthenticated"
        v-for="button in headerButtons"
        :key="button.label"
        class="px-3 py-1 text-sm rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        @click="button.action"
        type="button"
      >
        {{ button.label }}
      </BaseButton>

      <BaseButton
        v-if="isAuthenticated"
        class="px-3 py-1 text-sm rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        @click="handleSignOut"
        type="button"
      >
        Sign Out
      </BaseButton>
    </nav>

  </header>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { supabase } from '@/utils/supabase';
import BaseButton from '@/components/ui/input/BaseButton.vue';
import PulsingOverlay from '@/components/ui/overlays/PulsingOverlay.vue';
const emit = defineEmits(['openHelp', 'openSignUp'])

const { isAuthenticated } = useAuth();
console.log('HeaderBar mounted, authenticated:', isAuthenticated);
const route = useRoute()
const router = useRouter()
const showAuthModal = ref(false);


const hiddenHeaderRoutes = ['/logged-out', '/fullscreen-modal']
const shouldShowNavButtons = computed(() => !hiddenHeaderRoutes.includes(route.path))

const isLoggingOut = ref(false); // Track if logging out

const authMode = ref('signup'); // 'login' | 'signup' | 'reset

const headerButtons = ref([
  { label: 'Help', action: () => router.push('/help') },
  { label: 'Sign Up', action: () => router.push('/signup') },
])

const handleSignOut = async () => {
   // Set logging out state
  
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Sign out error:', error);
  } 
  localStorage.removeItem('userProfile'); // Clear user profile from local storage
  console.log('User signed out successfully');

  isLoggingOut.value = true;
  router.push('/logged-out');
   // Reset logging out state

};

watch(() => route.path, (val) => {
  showAuthModal.value = ['/login', '/signup', '/reset'].includes(val)
  authMode.value = val.replace('/', '') // 'login' | 'signup' | 'reset'
})




</script>