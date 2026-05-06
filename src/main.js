import { createApp } from 'vue'
import '@/style.css'
import App from '@/App.vue'
import PortalVue from 'portal-vue'
import { createPinia } from 'pinia'
import router from '@/utils/router.js'
import '@/composables/useAuth.js' // Ensure auth is initialized before app mounts
import '@globalhive/vuejs-tour/dist/style.css'
import { useThemeStore } from '@/stores/useThemeStore'
import * as Sentry from "@sentry/vue";

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)

const themeStore = useThemeStore(pinia)
themeStore.hydrateFromStorage()
themeStore.watchAuthTheme()



Sentry.init({
  app,
  dsn: "https://406d3b12b2a8cd441ed785b4152b2acf@o4511340484493312.ingest.us.sentry.io/4511340491505664",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  integrations: [
    Sentry.browserTracingIntegration({ router })
  ],
  // Tracing
  tracesSampleRate: 1.0, // Capture 100% of the transactions
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/]
});

app
  .use(PortalVue)
  .use(router)
  .mount('#app')

