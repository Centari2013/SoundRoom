<template>
  <PulsingOverlay
    v-if="isLoggingOut"
    :duration="2000"
    text="Logging out..."
    @done="isLoggingOut = false"
  />

  <header
    class="px-6 py-4 border-b border-[var(--color-border-subtle)]
           bg-[color-mix(in_srgb,var(--color-bg-surface)_95%,black_5%)]
           backdrop-blur-sm
           flex items-center justify-between sticky top-0 z-40
           shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
  >
    <!-- Left: Logo -->
    <RouterLink
      to="/"
      class="text-4xl font-semibold tracking-tight hover:opacity-90 transition"
    >
      <span
        class="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-success)]
               bg-clip-text text-transparent
               select-none"
      >
        SoundRoom
      </span>
    </RouterLink>

    <!-- Right: Menu -->
    <div v-if="shouldShowNavButtons" class="relative">
      <button
        ref="menuButton"
        type="button"
        @click.stop="toggleMenu"
        class="flex items-center justify-center w-12 h-12 rounded-lg !p-1
               hover:bg-[color-mix(in_srgb,var(--color-bg-surface)_85%,transparent)]
               !bg-transparent !border-none
               transition"
        :aria-expanded="isMenuOpen"
      >
        <span class="sr-only">Open navigation menu</span>
        <HamburgerIcon class="w-full h-full text-[var(--color-text-primary)]" />
      </button>

      <!-- Menu panel -->
      <transition name="fade">
        <div
          v-if="isMenuOpen"
          ref="menuPanel"
          @mouseleave="closeMenu"
          class="absolute right-0 mt-2 w-48 rounded-xl overflow-hidden
                 border border-[var(--color-border-subtle)]
                 bg-[color-mix(in_srgb,var(--color-bg-elevated)_94%,black_6%)]
                 shadow-[0_12px_30px_rgba(0,0,0,0.35)]
                 backdrop-blur-md
                 flex flex-col divide-y divide-[var(--color-border-subtle)]
                 z-50"
        >
          <template v-for="button in visibleButtons" :key="button.label">
            <button
              class="px-4 py-3 text-left text-sm font-medium
                    !bg-transparent
                     text-[var(--color-text-primary)]
                     hover:bg-[color-mix(in_srgb,var(--color-bg-surface)_85%,transparent)]
                     transition"
              @click="runAction(button.action)"
              type="button"
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
import { toggleTheme } from '@/utils/theme';
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
  if (!visibleButtons.value.length) return
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
  router.push({ name: 'logged-out' });
   // Reset logging out state

}

const visibleButtons = computed(() => {
  const authed = isAuthenticated.value

  const buttons = [
    {
      label: 'Switch Themes',
      action: () => toggleTheme(),
      shouldShow: !authed,
    },
    {
      label: 'Help',
      action: () => router.push({ name: 'help' }),
      shouldShow: true
    },
    {
      label: 'Sign In',
      action: () => router.push({ name: 'login' }),
      shouldShow: !authed
    },
    {
      label: 'Upgrade',
      action: () => router.push({ name: 'upgrade' }),
      shouldShow: authed && tier.value === 'free'
    },
    {
      label: 'Settings',
      action: () => router.push({ name: 'settings' }),
      shouldShow: authed
    },
    {
      label: 'Sign Out',
      action: () => handleSignOut(),
      shouldShow: authed
    },
  ]

  return buttons.filter(button => button.shouldShow)
})

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
