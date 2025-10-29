import { createApp } from 'vue'
import '@/style.css'
import App from '@/App.vue'
import VueKonva from 'vue-konva';
import PortalVue from 'portal-vue'
import { createPinia } from 'pinia';
import router from '@/utils/router.js'
import '@/composables/useAuth.js' // Ensure auth is initialized before app mounts
import * as Sentry from "@sentry/vue";
import { useThemeStore } from '@/stores/useThemeStore.js'

const app = createApp(App);
const pinia = createPinia()

Sentry.init({
  app,
  dsn: "https://b56e70467391993e18ece8ec50872188@o4510087125008384.ingest.us.sentry.io/4510087127629824",

  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/vue/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  integrations: [
  ],
});

function mountApp() {
  app
    .use(VueKonva)
    .use(PortalVue)
    .use(router)
    .use(pinia)

  if (typeof window !== 'undefined') {
    const themeStore = useThemeStore(pinia)
    themeStore.initialize()

    if (import.meta.env.DEV) {
      window.__SOUNDROOM_THEME__ = {
        ...(window.__SOUNDROOM_THEME__ ?? {}),
        store: themeStore
      }
    }
  }

  app.mount('#app')
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  import('@/dev/setupThemePreview.js').finally(mountApp)
} else {
  mountApp()
}
