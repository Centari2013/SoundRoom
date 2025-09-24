<template>
  <div
    class="rounded-sm p-6 shadow-md border hover:shadow-lg transition-all flex flex-col justify-between bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
    :class="highlight ? 'border-black dark:border-white' : 'border-neutral-300 dark:border-neutral-800'"
  >
    <div>
      <h2 class="text-xl font-bold mb-2">{{ title }}</h2>
      <p class="text-2xl font-semibold">{{ price }}</p>
      <p v-if="tagline" class="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{{ tagline }}</p>
      <div v-if="highlightItems.length" class="mt-5 flex flex-wrap gap-2 justify-center pb-3">
        <span
          v-for="(feature, index) in highlightItems"
          :key="index"
          class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
          :class="STATUS_STYLES[feature.status]?.chip"
        >
          <span class="h-2 w-2 rounded-full" :class="STATUS_STYLES[feature.status]?.dot"></span>
          <span>{{ feature.label }}</span>
          <span v-if="feature.status === 'limited'" class="uppercase tracking-wider text-[0.6rem]">Limited</span>
        </span>
      </div>
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
    chip: 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
    dot: 'bg-green-500 dark:bg-green-300'
  },
  limited: {
    chip: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300',
    dot: 'bg-amber-500 dark:bg-amber-300'
  },
  unavailable: {
    chip: 'border-neutral-200 bg-neutral-100 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400',
    dot: 'bg-neutral-400 dark:bg-neutral-500'
  }
}

const props = defineProps({
  title: String,
  price: String,
  features: {
    type: Array,
    default: () => []
  },
  tagline: {
    type: String,
    default: ''
  },
  spotlightFeatures: {
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

const normalizeFeature = feature => {
  if (typeof feature === 'string') {
    return {
      label: feature,
      status: 'included',
      detail: ''
    }
  }

  return {
    label: feature.label,
    status: feature.status ?? 'included',
    detail: feature.detail ?? ''
  }
}

const highlightItems = computed(() => {
  const source = props.spotlightFeatures.length ? props.spotlightFeatures : props.features

  return source
    .map(normalizeFeature)
    .filter(feature => feature.status !== 'unavailable')
    .slice(0, 4)
})
</script>

<style scoped>
</style>
