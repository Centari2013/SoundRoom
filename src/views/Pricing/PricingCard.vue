<template>
  <div
    :class="cardClasses"
  >
    <div>
      <h2 class="text-xl font-bold mb-2">{{ title }}</h2>
      <p class="text-2xl font-semibold">{{ price }}</p>
      <p v-if="tagline" class="mt-2 text-sm text-text-muted">{{ tagline }}</p>
      <div v-if="highlightItems.length" class="mt-5 flex flex-col gap-2 justify-center items-center pb-3">
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
      :class="ctaClasses"
      :disabled="ctaDisabled || ctaBusy"
      type="button"
      @click="$emit('select-plan')"
    >
      {{ ctaText }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getPlanTheme } from '@/constants/planThemes'

const STATUS_STYLES = {
  included: {
    chip: 'border-status-success bg-[rgba(var(--color-success-rgb),0.15)] text-status-success',
    dot: 'bg-status-success'
  },
  limited: {
    chip: 'border-status-warning bg-[rgba(var(--color-warning-rgb),0.15)] text-status-warning',
    dot: 'bg-status-warning'
  },
  unavailable: {
    chip: 'border-border-subtle bg-surface-raised text-text-muted',
    dot: 'bg-text-muted'
  }
}

defineEmits(['select-plan'])

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
  ctaLabel: {
    type: String,
    default: 'Select Plan'
  },
  ctaDisabled: {
    type: Boolean,
    default: false
  },
  ctaBusy: {
    type: Boolean,
    default: false
  },
  planId: {
    type: String,
    default: 'free'
  }
})

const BASE_CARD_CLASS = 'group rounded-sm p-6 shadow-md transition-all duration-200 ease-out transform flex flex-col justify-between bg-surface-base text-text-primary hover:bg-surface-raised hover:shadow-xl hover:-translate-y-1 hover:scale-[1.03] focus-within:shadow-xl focus-within:-translate-y-1 focus-within:scale-[1.03]'

const BASE_CTA_CLASS = 'w-full py-2 rounded-xl font-semibold transition border border-transparent disabled:opacity-50 disabled:cursor-not-allowed'

const planTheme = computed(() => getPlanTheme(props.planId))

const cardClasses = computed(() => [
  BASE_CARD_CLASS,
  planTheme.value.card
])

const ctaClasses = computed(() => [
  BASE_CTA_CLASS,
  planTheme.value.cta
])

const ctaText = computed(() => (props.ctaBusy ? 'Redirecting…' : props.ctaLabel))

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
