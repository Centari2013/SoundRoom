<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
      <thead class="bg-neutral-50 dark:bg-neutral-900">
        <tr>
          <th class="py-3 pl-4 pr-3 text-left font-semibold text-neutral-900 dark:text-neutral-100">Feature</th>
          <th
            v-for="plan in tablePlans"
            :key="plan.id"
            class="py-3 px-3 text-left font-semibold text-neutral-900 dark:text-neutral-100"
          >
            {{ plan.name }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
        <tr v-for="feature in features" :key="feature.key" class="align-top">
          <th class="py-4 pl-4 pr-3 text-left font-medium text-neutral-800 dark:text-neutral-100">{{ feature.label }}</th>
          <td
            v-for="plan in tablePlans"
            :key="plan.id"
            class="py-4 px-3 text-neutral-700 dark:text-neutral-300"
          >
            <div class="space-y-1">
              <span :class="STATUS_TEXT_CLASSES[getStatus(plan, feature.key)]" class="font-medium">
                {{ STATUS_LABELS[getStatus(plan, feature.key)] }}
              </span>
              <p v-if="getDetail(plan, feature.key)" class="text-xs text-neutral-500 dark:text-neutral-400">
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
  included: 'text-green-600 dark:text-green-300',
  limited: 'text-amber-600 dark:text-amber-300',
  unavailable: 'text-neutral-500 dark:text-neutral-500'
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
