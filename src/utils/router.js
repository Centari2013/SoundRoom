import { createRouter, createWebHistory } from 'vue-router'
import SoundRoom from '@/views/SoundRoom.vue'
import ModalWrapper from '@/components/ui/modals/ModalWrapper.vue'
import AuthModal from '@/components/ui/modals/LoginSignup/AuthModal.vue'
import UpdatePasswordPage from '@/views/UpdatePasswordPage.vue'
import TermsOfService from '@/views/TermsOfService.vue'
import PrivacyPolicy from '@/views/PrivacyPolicy.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: SoundRoom,
      children: [
        {
          path: 'login',
          component: ModalWrapper,
          props: { component: AuthModal },
        },
        {
          path: 'signup',
          component: ModalWrapper,
          props: { component: AuthModal },
        },
        {
          path: 'reset',
          component: ModalWrapper,
          props: { component: AuthModal },
        },
      ]
    },
    { path: '/terms', component: TermsOfService },
    { path: '/privacy', component: PrivacyPolicy },
    { path: '/update-password', component: UpdatePasswordPage },
  ]
})
