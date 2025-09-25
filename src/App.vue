<!-- App.vue -->
<template>
  <SpeedInsights/>
  <MobileComingSoon v-if="isMobile"/>
  <div class="h-screen max-h-screen min-w-screen flex flex-col">
    <HeaderBar/>
    <RouterView/>
  </div>
  
  <portal-target name="modal" />
  <EntitlementUpsellModal />
</template>


<script setup>
import { SpeedInsights } from '@vercel/speed-insights/vue'
import HeaderBar from '@/components/SoundRoom/HeaderBar.vue';
import MobileComingSoon from '@/views/MobileComingSoon.vue';
import { isMobileBrowser } from "@/utils/device";
import EntitlementUpsellModal from '@/components/ui/modals/EntitlementUpsellModal.vue';

const isMobile = isMobileBrowser();
</script>
