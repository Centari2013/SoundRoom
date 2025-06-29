import { createApp } from 'vue'
import '@/style.css'
import App from '@/App.vue'
import VueKonva from 'vue-konva';
import PortalVue from 'portal-vue'
import router from '@/utils/router.js'
import '@/utils/userAuth.js' // Ensure auth is initialized before app mounts

createApp(App)
.use(VueKonva)
.use(PortalVue)
.use(router)
.mount('#app')
