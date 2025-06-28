import { createRouter, createWebHistory } from 'vue-router';
import SoundRoom from '@/views/SoundRoom.vue';
import UpdatePasswordPage from '@/views/UpdatePasswordPage.vue';
import PrivacyPolicy from '@/views/PrivacyPolicy.vue';
import TermsOfService from '@/views/TermsOfService.vue';

const routes = [
  { name: 'home', path: '/', component: SoundRoom },
  { name: 'login', path: '/login' },
  { name: 'signup', path: '/signup' },
  { name: 'reset', path: '/reset' },
  { name: 'terms', path: '/terms', component: TermsOfService },
  { name: 'privacy', path: '/privacy', component: PrivacyPolicy },
  { name: 'about', path: '/about' },
  { name: 'contact', path: '/contact' },
  { name: 'update-password', path: '/update-password', component: UpdatePasswordPage },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})