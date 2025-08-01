<template>
  <aside class="w-60 bg-neutral-200 dark:bg-neutral-900 border-r border-neutral-300 dark:border-neutral-800 p-4 space-y-3 overflow-y-auto">
    <h2 class="font-bold text-sm mb-2">Categories</h2>
    <BaseButton
      v-if="isAuthenticated && userTier === 'pro'"
      :key="'your-sounds'"
      @click="$emit('update:active', 'your-sounds')"
      :class="['sound-lib-button', { active: active === 'your-sounds' }]"
    >
    Your Sounds
    </BaseButton>
    <hr v-if="isAuthenticated && userTier === 'pro'" class="text-neutral-300 dark:text-neutral-800"/>
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
import { useAuth } from '@/composables/useAuth'

const props = defineProps({
  categories: Array,
  active: String
})

defineEmits(['update:active'])

const { isAuthenticated, tier: userTier } = useAuth()

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
.sound-lib-button:hover { background-color: #e5e5e5; }
@media (prefers-color-scheme: dark) {
  .sound-lib-button:hover { background-color: #1f2937; }
}
.sound-lib-button.active {
  font-weight: 600;
  background-color: #d4d4d4;
}
@media (prefers-color-scheme: dark) {
  .sound-lib-button.active { background-color: #1f2937; }
}
</style>
