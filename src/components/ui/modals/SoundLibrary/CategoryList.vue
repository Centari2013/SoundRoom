<template>
  <aside class="w-60 bg-neutral-200 dark:bg-neutral-900 border-r border-neutral-300 dark:border-neutral-800 p-4 space-y-3 overflow-y-auto">
    <h2 class="font-bold text-sm mb-2">Categories</h2>
    <BaseButton
      v-if="isAuthenticated"
      :key="'your-sounds'"
      @click="handleSelectYourSounds"
      :class="['sound-lib-button', { active: active === 'your-sounds', locked: !canUpload }]"
    >
      <span class="button-inner">
        <span>Your Sounds</span>
        <span v-if="!canUpload" class="badge">Pro</span>
      </span>
    </BaseButton>
    <hr v-if="isAuthenticated" class="text-neutral-300 dark:text-neutral-800"/>
    <BaseButton
      v-for="cat in categories"
      :key="cat.id"
      @click="$emit('update:active', cat.id)"
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
  border-radius: 0.375rem;
  transition: background-color 0.2s;
}
.sound-lib-button:hover { background-color: var(--sr-neutral-200); }
@media (prefers-color-scheme: dark) {
  .sound-lib-button:hover { background-color: var(--sr-outline-strong); }
}
.sound-lib-button.active {
  font-weight: 600;
  background-color: var(--sr-neutral-300);
}
@media (prefers-color-scheme: dark) {
  .sound-lib-button.active { background-color: var(--sr-outline-strong); }
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
  color: var(--sr-purple-600);
}

@media (prefers-color-scheme: dark) {
  .badge {
    color: var(--sr-purple-500);
  }
}
</style>
