<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-[var(--color-border-subtle)] text-sm">
      <thead class="bg-[color-mix(in_srgb,var(--color-bg-surface)_85%,transparent)]">
        <tr>
          <th class="py-3 pl-4 pr-3 text-left font-semibold text-[var(--color-text-primary)]">Feature</th>
          <th
            v-for="plan in tablePlans"
            :key="plan.id"
            class="py-3 px-3 text-left font-semibold text-[var(--color-text-primary)]"
          >
            {{ plan.name }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[var(--color-border-subtle)] bg-surface-base">
        <tr v-for="feature in features" :key="feature.key" class="align-top">
          <th class="py-4 pl-4 pr-3 text-left font-medium text-[var(--color-text-primary)]">{{ feature.label }}</th>
          <td
            v-for="plan in tablePlans"
            :key="plan.id"
            class="py-4 px-3 text-[var(--color-text-secondary)]"
          >
            <div class="space-y-1">
              <span :class="STATUS_TEXT_CLASSES[getStatus(plan, feature.key)]" class="font-medium">
                {{ STATUS_LABELS[getStatus(plan, feature.key)] }}
              </span>
              <p v-if="getDetail(plan, feature.key)" class="text-xs text-[var(--color-text-muted)]">
                {{ getDetail(plan, feature.key) }}
              </p>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const STATUS_LABELS = {
  included: 'Included',
  limited: 'Limited',
  unavailable: 'Not included'
}

const STATUS_TEXT_CLASSES = {
  included: 'text-status-success',
  limited: 'text-[var(--color-warning)]',
  unavailable: 'text-[var(--color-text-muted)]'
}

const props = defineProps({
  plans: {
    type: Array,
    default: () => []
  },
  features: {
    type: Array,
    default: () => []
  }
})

const tablePlans = computed(() =>
  props.plans.map(plan => ({
    ...plan,
    featureByKey: plan.features.reduce((acc, feature) => {
      acc[feature.key] = feature
      return acc
    }, {})
  }))
)

const getFeature = (plan, featureKey) => plan.featureByKey?.[featureKey] ?? { status: 'unavailable', detail: '' }

const getStatus = (plan, featureKey) => getFeature(plan, featureKey).status ?? 'unavailable'

const getDetail = (plan, featureKey) => getFeature(plan, featureKey).detail ?? ''
</script>
