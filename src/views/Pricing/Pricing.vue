<template>
  <div @click.self="closeModal" class="modal-backdrop">
    <div class="modal-panel relative flex flex-col">
      <div class="modal-header-float">
        <h1 class="text-2xl font-bold tracking-tight">Choose Your Plan</h1>
        <BaseButton class="text-sm" @click="closeModal">Close</BaseButton>
      </div>
      <div class="flex-1 overflow-hidden">
        <div class="h-full overflow-y-auto px-10 pt-24 pb-10 space-y-8">
          <p class="text-sm text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto text-center">
            Upgrade to unlock more room slots, extra sound sources, and premium scheduling tools tailored for immersive sound design.
          </p>
          <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import PricingCard from '@/views/Pricing/PricingCard.vue'

const router = useRouter()

const closeModal = () => {
  router.push('/')
}

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
