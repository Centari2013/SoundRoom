<template>
  <teleport to="body">
    <div
      v-if="isOpen"
      class="modal-backdrop"
      @click.self="handleClose"
    >
      <div class="modal-panel glass-panel max-w-[min(480px,90vw)]" role="dialog" aria-modal="true">
        <h2 class="text-2xl font-semibold mb-3">{{ title }}</h2>
        <p class="text-[var(--color-text-muted)] mb-6">{{ message }}</p>
        <div class="flex flex-wrap gap-3">
          <BaseButton @click="handleUpgrade">See plans</BaseButton>
          <BaseButton variant="naked" @click="handleClose">Maybe later</BaseButton>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import { useEntitlementStore } from '@/stores/useEntitlementStore'

const router = useRouter()
const entitlementStore = useEntitlementStore()
const { isOpen, title, message } = storeToRefs(entitlementStore)

function handleClose() {
  entitlementStore.close()
}

function handleUpgrade() {
  entitlementStore.close()
  router.push('/upgrade')
}
</script>

<style scoped>
.modal-backdrop {
  background-color: color-mix(in srgb, var(--glass-bg) 70%, rgba(var(--base-black-rgb), 0.35));
  backdrop-filter: blur(14px);
}

.modal-panel {
  @apply w-full text-text-primary p-8 shadow-[var(--color-shadow-strong)];
}
</style>
