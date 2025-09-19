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
              v-for="plan in displayPlans"
              :key="plan.id"
              :title="plan.name"
              :price="plan.price"
              :features="plan.features"
              :highlight="plan.highlight"
              :cta-label="plan.ctaLabel"
              :cta-disabled="plan.ctaDisabled"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import PricingCard from '@/views/Pricing/PricingCard.vue'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { tier } = useAuth()

const closeModal = () => {
  router.push('/')
}

const basePlans = [
  {
    id: 'free',
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
    id: 'plus',
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
    id: 'pro',
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
    id: 'creator',
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

const PLAN_ORDER = basePlans.map(plan => plan.id)

const currentTier = computed(() => {
  const normalized = (tier?.value ?? 'free').toLowerCase()
  return PLAN_ORDER.includes(normalized) ? normalized : 'free'
})

const displayPlans = computed(() => {
  const userIndex = PLAN_ORDER.indexOf(currentTier.value)
  return basePlans.map(plan => {
    const planIndex = PLAN_ORDER.indexOf(plan.id)
    let ctaLabel = 'Upgrade'
    let ctaDisabled = false

    if (plan.id === currentTier.value) {
      ctaLabel = 'Current Plan'
      ctaDisabled = true
    } else if (userIndex !== -1 && planIndex < userIndex) {
      ctaLabel = 'Downgrade'
    } else if (userIndex === -1) {
      ctaLabel = 'Select Plan'
    }

    return {
      ...plan,
      ctaLabel,
      ctaDisabled
    }
  })
})
</script>

<style scoped>
</style>
