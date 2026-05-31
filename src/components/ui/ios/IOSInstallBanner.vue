<template>
  <Transition name="slide-up">
    <div
      v-if="visible"
      class="fixed inset-x-0 bottom-0 z-[9999] flex items-end justify-center
             pb-[max(1rem,env(safe-area-inset-bottom))]
             px-4 pointer-events-none"
    >
      <div
        class="pointer-events-auto w-full max-w-sm rounded-2xl p-4
               bg-[color-mix(in_srgb,var(--color-bg-elevated)_96%,black_4%)]
               border border-[var(--color-border-subtle)]
               shadow-[0_-4px_30px_rgba(0,0,0,0.4)] backdrop-blur-md
               flex items-start gap-3"
        role="dialog"
        aria-label="Install SoundRoom"
      >
        <!-- App icon -->
        <img src="/apple-touch-icon.png" alt="" class="w-12 h-12 rounded-xl flex-shrink-0" aria-hidden="true" />

        <!-- Message -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-[var(--color-text-primary)]">Install SoundRoom</p>
          <p class="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
            Tap <span class="inline-block align-middle text-base">⎋</span> then
            <strong class="text-[var(--color-text-primary)]">"Add to Home Screen"</strong>
            for the full experience.
          </p>
        </div>

        <!-- Dismiss -->
        <button
          class="flex-shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]
                 text-xl leading-none p-1"
          aria-label="Dismiss"
          @click="dismiss"
        >×</button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const DISMISS_KEY = 'soundroom.iosInstallBannerDismissed'
const visible = ref(false)

onMounted(() => {
  const alreadyDismissed = localStorage.getItem(DISMISS_KEY)
  if (alreadyDismissed) return

  // Only show on iOS Safari, not in standalone mode (already installed)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  const isSafari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent)

  if (isIOS && !isStandalone && isSafari) {
    // Small delay so the app has settled before showing the banner
    setTimeout(() => { visible.value = true }, 2500)
  }
})

function dismiss() {
  visible.value = false
  localStorage.setItem(DISMISS_KEY, '1')
}
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
