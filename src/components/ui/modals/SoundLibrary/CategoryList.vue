<template>
  <aside class="w-60 bg-[var(--color-bg-elevated)] text-text-primary border-r border-border-strong p-4 space-y-3 overflow-y-auto shadow-strong">
    <h2 class="font-bold text-sm mb-2">Categories</h2>
    <BaseButton
      v-if="isAuthenticated"
      :key="'your-sounds'"
      @click="handleSelectYourSounds"
      variant="naked"
      :class="['sound-lib-button', { active: active === 'your-sounds', locked: !canUpload }]"
    >
      <span class="button-inner">
        <span>Your Sounds</span>
        <span v-if="!canUpload" class="badge">Pro</span>
      </span>
    </BaseButton>
    <hr v-if="isAuthenticated" class="border-t border-border-subtle"/>
    <BaseButton
      v-for="cat in categories"
      :key="cat.id"
      @click="$emit('update:active', cat.id)"
      variant="naked"
      :class="['sound-lib-button', { active: active === cat.id }]"
    >
      {{ cat.label }}
    </BaseButton>
  </aside>
</template>

<script setup>
import BaseButton from '@/components/ui/input/BaseButton.vue'
import { computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useEntitlements } from '@/composables/useEntitlements'

const props = defineProps({
  categories: Array,
  active: String
})

const emit = defineEmits(['update:active'])

const { isAuthenticated } = useAuth()
const { canAccess, requireEntitlement } = useEntitlements()

const canUpload = computed(() => canAccess('canUpload'))

function handleSelectYourSounds() {
  if (!requireEntitlement('canUpload')) return
  // Only emit when the user can actually reach their sounds
  // to avoid switching the grid without access.
  emit('update:active', 'your-sounds')
}

</script>

<style scoped>
.sound-lib-button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border-radius: 0.5rem;
  color: var(--color-text-primary);
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  box-shadow: var(--color-shadow-soft);
  transition: background-color 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s;
}
.sound-lib-button:hover {
  background-color: var(--color-bg-elevated);
  border: 1px solid var(--color-border-strong);
  box-shadow: var(--color-shadow-soft);
}
.sound-lib-button:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
.sound-lib-button.active {
  font-weight: 700;
  background-color: var(--color-accent-soft);
  border: 1px solid var(--color-accent);
  color: var(--color-text-inverse);
  box-shadow: 0 0 0 3px rgba(var(--color-accent-rgb), 0.22);
}

.sound-lib-button.locked {
  opacity: 0.75;
}

.button-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.badge {
  font-size: 0.625rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-accent-strong);
}
</style>
