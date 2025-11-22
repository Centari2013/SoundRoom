<template>
  <PulsingOverlay v-if="isLoggingOut" :duration="2000" :text="'Logging out...'" @done="isLoggingOut = false" />
  <header class="px-6 py-4 border-b border-neutral-300/70 dark:border-neutral-800 bg-neutral-200 dark:bg-black flex items-center justify-between relative">
    <h1 class="text-xl font-bold tracking-wide dark:text-gray-300"><RouterLink to="/" style="text-decoration: none; color: inherit;">SoundRoom</RouterLink></h1>
    
    <div v-if="shouldShowNavButtons" class="relative">
      <button
        ref="menuButton"
        type="button"
        @click="toggleMenu"
        class="flex items-center justify-center w-12 h-12 !p-1 !bg-transparent"
        :aria-expanded="isMenuOpen"
        aria-haspopup="true"
      >
        <span class="sr-only">Open navigation menu</span>
        <HamburgerIcon class="w-full h-full"/>
      </button>
      <transition name="fade">
        <div
          v-if="isMenuOpen"
          @mouseleave="closeMenu"
          ref="menuPanel"
          class="absolute right-0 mt-2 w-44 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 py-2 z-50 flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800 overflow-hidden"
        >
          <template v-for="button in visibleButtons" :key="button.label">
            <button
              class="w-full px-4 py-2 text-left text-sm text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none !bg-transparent"
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
import HamburgerIcon from '@/assets/icons/hamburger.svg';
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
    label: 'Sign In',
    action: () => router.push('/login'),
    shouldShow: !isAuthenticated.value
  },
  {
    label: 'Upgrade',
    action: () => router.push('/upgrade'),
    shouldShow: isAuthenticated.value && tier.value === 'free'
  },
  {
    label: 'Settings',
    action: () => router.push('/settings'),
    shouldShow: isAuthenticated.value
  },
  {
    label: 'Sign Out',
    action: () => handleSignOut(),
    shouldShow: isAuthenticated.value
  },

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
