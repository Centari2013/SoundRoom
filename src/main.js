import { createApp } from 'vue'
import '@/style.css'
import App from '@/App.vue'
import VueKonva from 'vue-konva';
import PortalVue from 'portal-vue'
import { createPinia } from 'pinia';
import router from '@/utils/router.js'
import '@/composables/useAuth.js' // Ensure auth is initialized before app mounts

import * as Sentry from "@sentry/vue";


const app = createApp(App);

Sentry.init({
  app,
  dsn: "https://b56e70467391993e18ece8ec50872188@o4510087125008384.ingest.us.sentry.io/4510087127629824",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true
});

app
.use(VueKonva)
.use(PortalVue)
.use(router)
.use(createPinia())
.mount('#app')

