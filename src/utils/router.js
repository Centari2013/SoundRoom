import { createRouter, createWebHistory } from 'vue-router'
import SoundRoom from '@/views/SoundRoom.vue'
import LandingPage from '@/views/LandingPage.vue'
import { useAuth } from '@/composables/useAuth'
import { watch } from 'vue'
import { applySeo } from '@/utils/seo'

/**
 * Main application router instance.
 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      name: 'landing',
      path: '/',
      component: LandingPage,
      meta: {
        seo: {
          title: 'SoundRoom | Spatial audio playground',
          description: 'Explore SoundRoom, a browser-based canvas for crafting immersive spatial audio rooms with drag-and-drop sources and real-time binaural mixing.',
        },
      },
    },
    {
      name: 'app',
      path: '/app',
      component: SoundRoom,
      meta: {
        seo: {
          title: 'SoundRoom Studio',
          description: 'Design and layer immersive spatial audio scenes in your browser. Drag directional sources, sculpt ambient mixes, and save custom rooms with SoundRoom.',
        },
      },
      children: [
        {
          name: 'login',
          path: 'login',
          component: () => import('@/components/ui/modals/ModalWrapper.vue'),
          props: { component: () => import('@/components/ui/modals/LoginSignup/AuthModal.vue') },
          meta: {
            seo: {
              title: 'Log In | SoundRoom',
              description: 'Log in to SoundRoom to resume building personalized spatial soundscapes and manage your saved rooms.',
            },
          },
        },
        {
          name: 'signup',
          path: 'signup',
          component: () => import('@/components/ui/modals/ModalWrapper.vue'),
          props: { component: () => import('@/components/ui/modals/LoginSignup/AuthModal.vue') },
          meta: {
            seo: {
              title: 'Create an Account | SoundRoom',
              description: 'Create a free SoundRoom account and start sculpting immersive 3D sound environments in minutes.',
            },
          },
        },
        {
          name: 'reset',
          path: 'reset',
          component: () => import('@/components/ui/modals/ModalWrapper.vue'),
          props: { component: () => import('@/components/ui/modals/LoginSignup/AuthModal.vue') },
          meta: {
            seo: {
              title: 'Reset Password | SoundRoom',
              description: 'Reset your SoundRoom password and regain access to your saved ambient rooms and preferences.',
            },
          },
        },
        {
          name: 'help',
          path: 'help',
          component: () => import('@/components/ui/modals/ModalWrapper.vue'),
          props: { component: () => import('@/components/ui/modals/Help.vue') },
          meta: {
            seo: {
              title: 'Help & Shortcuts | SoundRoom',
              description: 'Browse keyboard shortcuts, tips, and FAQs for getting the most out of the SoundRoom spatial audio designer.',
            },
          },
        },
        {
          name: 'room-manager',
          path: 'room-manager',
          component: () => import('@/components/ui/modals/ModalWrapper.vue'),
          props: { component: () => import('@/components/ui/modals/RoomManager/RoomManager.vue') },
          meta: {
            requiresAuth: true,
            seo: {
              title: 'Room Manager | SoundRoom',
              description: 'Load and organize your saved SoundRoom scenes to keep creative sessions flowing.',
            },
          },
        },
        {
          name: 'sound-library',
          path: 'sound-library',
          component: () => import('@/components/ui/modals/ModalWrapper.vue'),
          props: { component: () => import('@/components/ui/modals/SoundLibrary/SoundLibrary.vue') },
          meta: {
            seo: {
              title: 'Sound Library | SoundRoom',
              description: 'Explore curated ambient samples and drop spatial audio sources into your SoundRoom scene in seconds.',
            },
          },
        },
        {
          name: 'upgrade',
          path: 'upgrade',
          component: () => import('@/components/ui/modals/ModalWrapper.vue'),
          props: { component: () => import('@/views/Pricing/Pricing.vue') },
          meta: {
            seo: {
              title: 'Pricing & Plans | SoundRoom',
              description: 'Compare SoundRoom plans to unlock expanded sound libraries, room saves, and upcoming collaboration features.',
            },
          },
        },
      ],
    },
    {
      path: '/login',
      redirect: '/app/login',
    },
    {
      path: '/signup',
      redirect: '/app/signup',
    },
    {
      path: '/reset',
      redirect: '/app/reset',
    },
    {
      path: '/help',
      redirect: '/app/help',
    },
    {
      path: '/room-manager',
      redirect: '/app/room-manager',
    },
    {
      path: '/sound-library',
      redirect: '/app/sound-library',
    },
    {
      path: '/upgrade',
      redirect: '/app/upgrade',
    },
    {
      name: 'terms',
      path: '/terms',
      component: () => import('@/views/TermsOfService.vue'),
      meta: {
        seo: {
          title: 'Terms of Service | SoundRoom',
          description: 'Review the SoundRoom Terms of Service covering usage guidelines, licensing, and account responsibilities.',
        },
      },
    },
    {
      name: 'privacy',
      path: '/privacy',
      component: () => import('@/views/PrivacyPolicy.vue'),
      meta: {
        seo: {
          title: 'Privacy Policy | SoundRoom',
          description: 'Understand how SoundRoom handles your account data, audio uploads, and privacy preferences.',
        },
      },
    },
    {
      name: 'settings',
      path: '/settings',
      component: () => import('@/views/Settings.vue'),
      meta: {
        requiresAuth: true,
        seo: {
          title: 'Account Settings | SoundRoom',
          description: 'Adjust SoundRoom preferences, audio defaults, and account details to tailor your workspace.',
        },
      },
    },
    {
      name: 'manage-plan',
      path: '/manage-plan',
      component: () => import('@/views/ManagePlan.vue'),
      meta: {
        requiresAuth: true,
        seo: {
          title: 'Manage Plan | SoundRoom',
          description: 'View and manage your SoundRoom subscription plan and billing details.',
        },
      },
    },
    {
      name: 'update-password',
      path: '/update-password',
      component: () => import('@/views/UpdatePasswordPage.vue'),
      meta: {
        seo: {
          title: 'Update Password | SoundRoom',
          description: 'Secure your SoundRoom account with a new password to keep your ambient rooms protected.',
        },
      },
    },
    {
      name: 'auth-callback',
      path: '/auth/callback',
      component: () => import('@/views/AuthCallback.vue'),
      meta: {
        seo: {
          title: 'Authenticating… | SoundRoom',
          description: 'Completing your SoundRoom sign-in. You will be redirected momentarily.',
        },
      },
    },
    {
      name: 'auth-error',
      path: '/auth/error',
      component: () => import('@/views/AuthError.vue'),
      meta: {
        seo: {
          title: 'Authentication Error | SoundRoom',
          description: 'We could not complete your SoundRoom login. Review the error details and try again.',
        },
      },
    },
    {
      name: 'welcome',
      path: '/welcome',
      component: () => import('@/components/ui/context/Onboarding.vue'),
      meta: {
        seo: {
          title: 'Welcome to SoundRoom',
          description: 'Follow an interactive onboarding tour to learn the core controls of SoundRoom and start sculpting audio.',
        },
      },
    },
    {
      name: 'logged-out',
      path: '/logged-out',
      component: () => import('@/views/LoggedOut.vue'),
      meta: {
        seo: {
          title: 'Logged Out | SoundRoom',
          description: 'You have safely signed out of SoundRoom. Come back anytime to keep crafting immersive soundscapes.',
        },
      },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFound.vue'),
      meta: {
        seo: {
          title: 'Page Not Found | SoundRoom',
          description: 'We couldn\'t find the page you requested. Return to SoundRoom to continue creating spatial audio scenes.',
        },
      },
    },
  ],
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

router.afterEach((to) => {
  applySeo(to)
})

export default router
