import { createRouter, createWebHistory } from 'vue-router'
import SoundRoom from '@/views/SoundRoom.vue'
import { useAuth } from '@/composables/useAuth'
import { watch } from 'vue'

/**
 * Main application router instance.
 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: SoundRoom,
      children: [
        {
          path: 'login',
          component: () => import('@/components/ui/modals/ModalWrapper.vue'),
          props: { component: () => import('@/components/ui/modals/LoginSignup/AuthModal.vue') },
        },
        {
          path: 'signup',
          component: () => import('@/components/ui/modals/ModalWrapper.vue'),
          props: { component: () => import('@/components/ui/modals/LoginSignup/AuthModal.vue') },
        },
        {
          path: 'reset',
          component: () => import('@/components/ui/modals/ModalWrapper.vue'),
          props: { component: () => import('@/components/ui/modals/LoginSignup/AuthModal.vue') },
        },
        {
          path: 'help',
          component: () => import('@/components/ui/modals/ModalWrapper.vue'),
          props: { component: () => import('@/components/ui/modals/Help.vue') },
        },
        { path: '/room-manager',
          component: () => import('@/components/ui/modals/ModalWrapper.vue'),
          props: { component: () => import('@/components/ui/modals/RoomManager/RoomManager.vue') },
          meta: { requiresAuth: true }
        },
        { path: '/sound-library',
          component: () => import('@/components/ui/modals/ModalWrapper.vue'),
          props: { component: () => import('@/components/ui/modals/SoundLibrary/SoundLibrary.vue') },
        },
        {
          path: 'upgrade',
          component: () => import('@/components/ui/modals/ModalWrapper.vue'),
          props: { component: () => import('@/views/Pricing/Pricing.vue') },
        },
      ]
    },
    { path: '/terms', component: () => import('@/views/TermsOfService.vue') },
    { path: '/privacy', component: () => import('@/views/PrivacyPolicy.vue') },
    { path: '/settings', component: () => import('@/views/Settings.vue'), meta: { requiresAuth: true } },
    { path: '/manage-plan', component: () => import('@/views/ManagePlan.vue'), meta: { requiresAuth: true } },
    { path: '/update-password', component: () => import('@/views/UpdatePasswordPage.vue')},
    { path: '/auth/callback', component: () => import('@/views/AuthCallback.vue') },
    { path: '/auth/error', component: () => import('@/views/AuthError.vue') },
    { path: '/welcome', component: () => import('@/components/ui/modals/Onboarding.vue') },
    { path: '/logged-out', component: () => import('@/views/LoggedOut.vue') },
  ]
})


// Guard setup
/**
 * Resolve once the authentication state has finished loading.
 *
 * @returns {Promise<void>}
 */
function waitForSessionLoaded() {
  return new Promise(resolve => {
    const { sessionLoaded } = useAuth()
    if (sessionLoaded.value) return resolve()

    const unwatch = watch(sessionLoaded, (loaded) => {
      if (loaded) {
        unwatch()
        resolve()
      }
    })
  })
}

/**
 * Navigation guard that ensures authentication is ready and verifies access
 * to protected routes.
 */
router.beforeEach(async (to, from, next) => {
  await waitForSessionLoaded()

  const { isAuthenticated } = useAuth()

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next({ path: '/' })
  } else {
    next()
  }
})



export default router;
