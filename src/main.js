import { createApp } from 'vue'

// Polyfill crypto.randomUUID for iOS Safari on HTTP (non-secure context) and
// any older browser that lacks it. Must run before any module that calls it.
if (typeof crypto.randomUUID !== 'function') {
  crypto.randomUUID = function randomUUID() {
    // RFC 4122 version-4 UUID via getRandomValues — available everywhere.
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => {
      const n = parseInt(c)
      return (n ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (n / 4)))).toString(16)
    })
  }
}

import '@/style.css'
import App from '@/App.vue'
import PortalVue from 'portal-vue'
import { createPinia } from 'pinia'
import router from '@/utils/router.js'
import '@/composables/useAuth.js' // Ensure auth is initialized before app mounts
import '@globalhive/vuejs-tour/dist/style.css'
import { useThemeStore } from '@/stores/useThemeStore'
import { installSiteMediaSessionHandlers } from '@/lib/siteAudioTransport'
import * as Sentry from "@sentry/vue";

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)

const themeStore = useThemeStore(pinia)
themeStore.hydrateFromStorage()
themeStore.watchAuthTheme()

installSiteMediaSessionHandlers()



Sentry.init({
  app,
  dsn: "https://5a5715b629b8d52b7fc6e09b5a06694d@o4510087173242880.ingest.us.sentry.io/4511340458606592",
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
