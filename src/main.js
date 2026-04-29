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

Sentry.init({
  app,
  dsn: "https://b21091cd57d3ee756ad1623c5fe73033@o4510087173242880.ingest.us.sentry.io/4511303805894656",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true
});


const pinia = createPinia()
app.use(pinia)

const themeStore = useThemeStore(pinia)
themeStore.hydrateFromStorage()
themeStore.watchAuthTheme()



app
  .use(VueKonva)
  .use(PortalVue)
  .use(router)
  .mount('#app')
