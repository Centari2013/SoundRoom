<template>
  <teleport to="body">
    <div
      v-if="isOpen"
      class="modal-backdrop"
      @click.self="handleClose"
    >
      <div class="modal-panel" role="dialog" aria-modal="true">
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
  router.push({ name: 'upgrade' })
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(var(--base-black-rgb), 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.modal-panel {
  width: min(480px, 90vw);
  background-color: var(--color-bg-surface);
  color: var(--color-text-primary);
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--color-shadow-strong);
}
</style>
