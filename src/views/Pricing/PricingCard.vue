<template>
  <div
    class="rounded-sm p-6 shadow-md border hover:shadow-lg transition-all flex flex-col justify-between bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
    :class="highlight ? 'border-black dark:border-white' : 'border-neutral-300 dark:border-neutral-800'"
  >
    <div>
      <h2 class="text-xl font-bold mb-2">{{ title }}</h2>
      <p class="text-2xl font-semibold mb-4">{{ price }}</p>
      <ul class="space-y-3 mb-6">
        <li v-for="(feature, index) in normalizedFeatures" :key="index" class="flex items-start text-sm gap-3">
          <span
            class="text-lg leading-6"
            :class="STATUS_STYLES[feature.status]?.class"
          >
            {{ STATUS_STYLES[feature.status]?.icon ?? '•' }}
          </span>
          <div class="flex-1">
            <span class="font-medium">{{ feature.label }}</span>
            <p v-if="feature.detail" class="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {{ feature.detail }}
            </p>
          </div>
        </li>
      </ul>
    </div>
    <button
      class="w-full py-2 rounded-xl font-semibold transition border border-transparent bg-[#d3d3d3e1] dark:bg-[#1a1a1a] hover:border-[#646cff] disabled:opacity-50 disabled:cursor-not-allowed disabled:dark:bg-neutral-700"
      :disabled="ctaDisabled"
      type="button"
    >
      {{ ctaLabel }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const STATUS_STYLES = {
  included: {
    icon: '+',
    class: 'text-green-600 dark:text-green-400'
  },
  limited: {
    icon: '!',
    class: 'text-amber-500 dark:text-amber-400'
  },
  unavailable: {
    icon: '-',
    class: 'text-neutral-400 dark:text-neutral-600'
  }
}

const props = defineProps({
  title: String,
  price: String,
  features: {
    type: Array,
    default: () => []
  },
  highlight: Boolean,
  ctaLabel: {
    type: String,
    default: 'Select Plan'
  },
  ctaDisabled: {
    type: Boolean,
    default: false
  }
})

const normalizedFeatures = computed(() =>
  props.features.map(feature => {
    if (typeof feature === 'string') {
      return {
        label: feature,
        detail: '',
        status: 'included'
      }
    }

    return {
      label: feature.label,
      detail: feature.detail ?? '',
      status: feature.status ?? 'included'
    }
  })
)
</script>

<style scoped>
</style>
