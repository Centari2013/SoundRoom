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
  dsn: "https://f8bcee8dd2c0389848650e810aa8f391@o4510087173242880.ingest.us.sentry.io/4510087984513024",
  integrations: [],
  sendDefaultPii: true,
})

app
  .use(VueKonva)
  .use(PortalVue)
  .use(router)
  .mount('#app')
