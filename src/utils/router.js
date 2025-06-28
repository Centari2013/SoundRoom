import { createRouter, createWebHistory } from 'vue-router';
import SoundRoom from '@/views/SoundRoom.vue';
import UpdatePasswordPage from '@/views/UpdatePasswordPage.vue';

const routes = [
  { name: 'home', path: '/', component: SoundRoom },
  { name: 'login', path: '/login' },
  { name: 'signup', path: '/signup' },
  { name: 'reset', path: '/reset' },
  { name: 'update-password', path: '/update-password', component: UpdatePasswordPage },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})