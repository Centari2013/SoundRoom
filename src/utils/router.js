import { createRouter, createWebHistory } from 'vue-router'
import SoundRoom from '@/views/SoundRoom.vue'
import { useAuth } from '@/composables/useAuth'

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
          props: { component: () => import('@/components/ui/modals/RoomManager.vue') },
          meta: { requiresAuth: true }
        },
      ]
    },
    { path: '/terms', component: () => import('@/views/TermsOfService.vue') },
    { path: '/privacy', component: () => import('@/views/PrivacyPolicy.vue') },
    { path: '/update-password', component: () => import('@/views/UpdatePasswordPage.vue')},
    { path: '/auth/callback', component: () => import('@/views/AuthCallback.vue') },
    { path: '/auth/error', component: () => import('@/views/AuthError.vue') },
    { path: '/welcome', component: () => import('@/components/ui/modals/Welcome.vue') },
    { path: '/logged-out', component: () => import('@/views/LoggedOut.vue') },
    
  ]
})


// Guard setup
router.beforeEach(async (to, from, next) => {
  const { isAuthenticated } = await useAuth()

  // Protect routes with meta.requiresAuth
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next({ path: '/' })
  } else {
    next()
  }
})

export default router;