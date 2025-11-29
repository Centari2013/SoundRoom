import { createApp } from 'vue'
import '@/style.css'
import App from '@/App.vue'
import VueKonva from 'vue-konva'
import PortalVue from 'portal-vue'
import { createPinia } from 'pinia'
import router from '@/utils/router.js'
import '@/composables/useAuth.js' // Ensure auth is initialized before app mounts
import * as Sentry from '@sentry/vue'
import '@globalhive/vuejs-tour/dist/style.css'
import { useThemeStore } from '@/stores/useThemeStore'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

const themeStore = useThemeStore(pinia)
themeStore.hydrateFromStorage()
themeStore.watchAuthTheme()

Sentry.init({
  app,
  dsn: 'https://b56e70467391993e18ece8ec50872188@o4510087125008384.ingest.us.sentry.io/4510087127629824',
  integrations: [],
})

app
  .use(VueKonva)
  .use(PortalVue)
  .use(router)
  .mount('#app')
