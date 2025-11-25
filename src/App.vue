<!-- App.vue -->
<template>
  <SpeedInsights />
  <MobileComingSoon v-if="isMobile" />
  <div class="h-screen max-h-screen min-w-screen flex flex-col">
    <HeaderBar />
    <div class="flex-1 min-h-0 flex flex-col">
      <div
        v-if="globalError"
        class="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 bg-[var(--color-bg-app)] text-[var(--color-text-primary)]"
      >
        <p class="text-sm uppercase tracking-[0.2em] text-[var(--color-danger)] mb-3">Navigation error</p>
        <h2 class="text-2xl font-semibold mb-3">We couldn't load that page.</h2>
        <p class="max-w-md text-[var(--color-text-muted)] mb-8">
          {{ globalError.message }}
        </p>
        <div class="flex flex-wrap items-center justify-center gap-3">
          <BaseButton @click="retryGlobalError">
            Try again
          </BaseButton>
          <BaseButton
            variant="naked"
            class="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-sm font-medium"
            @click="returnHome"
          >
            Go back home
          </BaseButton>
        </div>
      </div>
      <RouterView v-else v-slot="{ Component, route }">
        <Suspense>
          <template #default>
            <ErrorBoundary :reset-on="routeKey">
              <KeepAlive :include="keepAliveViews">
                <component v-if="Component" :is="Component" :key="routeKey" />
              </KeepAlive>
            </ErrorBoundary>
          </template>
          <template #fallback>
            <div class="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 bg-[var(--color-bg-app)] text-[var(--color-text-primary)]">
              <p class="text-sm uppercase tracking-[0.2em] text-[var(--color-accent)] mb-3">Loading</p>
              <h2 class="text-2xl font-semibold mb-3">Preparing SoundRoom…</h2>
              <p class="max-w-md text-[var(--color-text-muted)]">
                Hang tight while we load the experience.
              </p>
            </div>
          </template>
        </Suspense>
      </RouterView>
    </div>
  </div>

  <portal-target name="modal" />
  <EntitlementUpsellModal />
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SpeedInsights } from '@vercel/speed-insights/vue'
import HeaderBar from '@/components/SoundRoom/HeaderBar.vue'
import MobileComingSoon from '@/views/MobileComingSoon.vue'
import { isMobileBrowser } from '@/utils/device'
import EntitlementUpsellModal from '@/components/ui/modals/EntitlementUpsellModal.vue'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'

const isMobile = isMobileBrowser()
const globalError = ref(null)
const router = useRouter()
const route = useRoute()
const routeKey = computed(() => route.matched[0]?.path ?? route.fullPath)
const keepAliveViews = ['SoundRoomRoot']

router.onError((error, to) => {
  console.error('Router navigation error:', error)
  globalError.value = {
    message: error?.message ?? "We couldn't load that page. Try refreshing or heading back home.",
    attemptedPath: to?.fullPath ?? null,
  }
})

watch(
  () => route.fullPath,
  () => {
    if (globalError.value) {
      globalError.value = null
    }
  }
)

function retryGlobalError() {
  window.location.reload()
}

function returnHome() {
  globalError.value = null
  void router.push('/')
}
</script>
