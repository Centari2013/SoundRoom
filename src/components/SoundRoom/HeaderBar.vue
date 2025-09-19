<template>
  <PulsingOverlay v-if="isLoggingOut" :duration="2000" :text="'Logging out...'" @done="isLoggingOut = false" />
  <header class="px-6 py-4 border-b border-neutral-300 dark:border-neutral-800 dark:bg-black flex items-center justify-between relative">
    <h1 class="text-xl font-bold tracking-wide dark:text-gray-300"><RouterLink to="/" style="text-decoration: none; color: inherit;">SoundRoom</RouterLink></h1>
    <div v-if="shouldShowNavButtons" class="relative">
      <button
        ref="menuButton"
        type="button"
        class="flex items-center justify-center w-10 h-10 rounded-full border border-transparent hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        @click="toggleMenu"
        :aria-expanded="isMenuOpen"
        aria-haspopup="true"
      >
        <span class="sr-only">Open navigation menu</span>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <transition name="fade">
        <div
          v-if="isMenuOpen"
          ref="menuPanel"
          class="absolute right-0 mt-2 w-44 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-2 z-50"
        >
          <template v-for="button in visibleButtons" :key="button.label">
            <button
              class="w-full px-4 py-2 text-left text-sm text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none"
              type="button"
              @click="runAction(button.action)"
            >
              {{ button.label }}
            </button>
          </template>
        </div>
      </transition>
    </div>

  </header>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { supabase } from '@/utils/supabase';
import PulsingOverlay from '@/components/ui/overlays/PulsingOverlay.vue';
const menuPanel = ref(null)
const menuButton = ref(null)
const isMenuOpen = ref(false)

const { isAuthenticated, tier } = useAuth();
const route = useRoute()
const router = useRouter()
const showAuthModal = ref(false);


const hiddenHeaderRoutes = ['/logged-out', '/fullscreen-modal']
const shouldShowNavButtons = computed(() => !hiddenHeaderRoutes.includes(route.path))

const isLoggingOut = ref(false); // Track if logging out

const authMode = ref('signup'); // 'login' | 'signup' | 'reset

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}

const runAction = (action) => {
  closeMenu()
  action?.()
}

const handleDocumentClick = (event) => {
  if (!isMenuOpen.value) return
  const target = event.target
  if (menuPanel.value?.contains(target)) return
  if (menuButton.value?.contains(target)) return
  closeMenu()
}

const handleEscape = (event) => {
  if (event.key === 'Escape') {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleEscape)
})

async function handleSignOut() {
   // Set logging out state
  
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Sign out error:', error);
  } 
  localStorage.removeItem('userProfile'); // Clear user profile from local storage
 

  isLoggingOut.value = true;
  router.push('/logged-out');
   // Reset logging out state

}

const headerButtons = computed(() => [
  {
    label: 'Help',
    action: () => router.push('/help'),
    shouldShow: true
  },
  {
    label: 'Sign Up',
    action: () => router.push('/signup'),
    shouldShow: !isAuthenticated.value
  },
  {
    label: 'Upgrade',
    action: () => router.push('/upgrade'),
    shouldShow: isAuthenticated.value && tier.value === 'free'
  },
  {
    label: 'Sign Out',
    action: () => handleSignOut(),
    shouldShow: isAuthenticated.value
  }
])

const visibleButtons = computed(() => headerButtons.value.filter(button => button.shouldShow))

watch(() => route.path, (val) => {
  showAuthModal.value = ['/login', '/signup', '/reset'].includes(val)
  authMode.value = val.replace('/', '') // 'login' | 'signup' | 'reset'
  closeMenu()
})

watch(shouldShowNavButtons, (show) => {
  if (!show) {
    closeMenu()
  }
})




</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 150ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
