<template>
  <div class="w-full h-full flex flex-col">
    <h1 class="flex text-3xl font-bold justify-center p-10">Choose Your Plan</h1>
    <div class="grid md:grid-cols-4 gap-10 min-h-8/11 p-10 pt-5 mb-10">
      <PricingCard
        v-for="plan in plans"
        :key="plan.name"
        :title="plan.name"
        :price="plan.price"
        :features="plan.features"
        :highlight="plan.highlight"
      />
    </div>
  </div>
</template>

<script setup>
import PricingCard from '@/views/Pricing/PricingCard.vue'

const plans = [
  {
    name: 'Free',
    price: '$0/mo',
    features: [
      'Access to public library',
      'Create 1 room',
      '3 sound sources',
      'Basic 3D spatialization',
      'Session-only use'
    ],
    highlight: false
  },
  {
    name: 'Plus',
    price: '$5/mo',
    features: [
      'Unlimited session time',
      'Save up to 3 rooms',
      '15 sound sources',
      'Basic scheduling (3 events)',
      'Custom backgrounds + themes'
    ],
    highlight: false
  },
  {
    name: 'Pro',
    price: '$10/mo',
    features: [
      'Unlimited rooms & sources',
      'Full scheduler access',
      'User uploads (200MB)',
      'Favorite sound saving',
      'Cone direction + output EQ'
    ],
    highlight: true
  },
  {
    name: 'Creator',
    price: '$20/mo',
    features: [
      '1GB audio upload',
      'AI-based tagging (beta)',
      'Room export + sharing',
      'Preset import/export',
      'Future collab mode'
    ],
    highlight: false
  }
]
</script>

<style scoped>
</style>
