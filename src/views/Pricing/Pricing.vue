<template>
  <div @click.self="closeModal" class="modal-backdrop">
    <div class="modal-panel relative flex flex-col">
      <div class="modal-header-float">
        <h1 class="text-2xl font-bold tracking-tight">Choose Your Plan</h1>
        <BaseButton class="text-sm" @click="closeModal">Close</BaseButton>
      </div>
      <div class="flex-1 overflow-hidden">
        <div class="h-full overflow-y-auto px-10 pt-24 pb-10 space-y-8">
          <p class="text-sm text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto text-center pt-4">
            Pick the tier that matches how you build, perform, or collaborate inside SoundRoom.
          </p>
          <div class="grid mx-auto max-w-6xl justify-items-center md:grid-cols-2 xl:grid-cols-3">
            <PricingCard
              v-for="plan in displayPlans"
              class="max-w-75"
              :key="plan.id"
              :title="plan.name"
              :price="plan.price"
              :features="plan.features"
              :tagline="plan.tagline"
              :spotlight-features="plan.spotlightFeatures"
              :highlight="plan.highlight"
              :cta-label="plan.ctaLabel"
              :cta-disabled="plan.ctaDisabled"
            />
          </div>
          <details class="max-w-5xl mx-auto rounded-md border border-neutral-200 bg-white p-4 text-left shadow-sm dark:border-neutral-800 dark:bg-neutral-950" data-testid="pricing-feature-comparison">
            <summary class="text-sm font-semibold cursor-pointer select-none text-neutral-800 dark:text-neutral-200">Full feature comparison</summary>
            <PlanComparisonTable class="mt-4" :plans="basePlans" :features="FEATURE_DEFINITIONS" />
          </details>
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
import PlanComparisonTable from '@/views/Pricing/PlanComparisonTable.vue'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { tier } = useAuth()

const closeModal = () => {
  router.push('/')
}

const STATUS_DETAIL_FALLBACK = {
  unavailable: 'Not included',
  limited: 'Limited access',
  included: ''
}

const FEATURE_DEFINITIONS = [
  {
    key: 'drag-drop',
    label: 'Drag & Drop Sound Sources',
    tiers: {
      free: { status: 'included' },
      basic: { status: 'included' },
      pro: { status: 'included' }
    }
  },
  {
    key: 'listener-cone',
    label: 'Directional Listener Cone',
    tiers: {
      free: { status: 'included' },
      basic: { status: 'included' },
      pro: { status: 'included' }
    }
  },
  {
    key: 'room-saving',
    label: 'Room Saving',
    tiers: {
      free: { status: 'limited', detail: 'Save 1 room' },
      basic: { status: 'included', detail: 'Unlimited saved rooms' },
      pro: { status: 'included', detail: 'Unlimited saved rooms' }
    }
  },
  {
    key: 'multi-room',
    label: 'Multi-Room Support',
    tiers: {
      free: { status: 'unavailable', detail: 'Single room workspace' },
      basic: { status: 'included', detail: 'Create and manage multiple rooms' },
      pro: { status: 'included', detail: 'Create and manage multiple rooms' }
    }
  },
  {
    key: 'custom-uploads',
    label: 'Upload Custom Sounds',
    tiers: {
      free: { status: 'unavailable', detail: 'Pro unlocks uploads' },
      basic: { status: 'unavailable', detail: 'Pro unlocks uploads' },
      pro: { status: 'included', detail: 'Upload your own audio library' }
    }
  },
  {
    key: 'ai-tags',
    label: 'AI Tag Suggestions',
    tiers: {
      free: { status: 'unavailable', detail: 'Pro unlocks AI tags' },
      basic: { status: 'unavailable', detail: 'Pro unlocks AI tags' },
      pro: { status: 'included', detail: 'Automatic sound labeling' }
    }
  },
  {
    key: 'timed-loops',
    label: 'Timed Loop Controls',
    tiers: {
      free: { status: 'unavailable', detail: 'Basic unlocks timed loops' },
      basic: { status: 'included', detail: 'Per-source loop timing' },
      pro: { status: 'included', detail: 'Per-source loop timing & chaining' }
    }
  },
  {
    key: 'room-presets',
    label: 'Room Presets (Reverb)',
    tiers: {
      free: { status: 'included', detail: 'Core preset collection' },
      basic: { status: 'included', detail: 'Full preset library' },
      pro: { status: 'included', detail: 'Full preset library' }
    }
  },
  {
    key: 'sound-packs',
    label: 'Sound Packs (Premium Bundles)',
    tiers: {
      free: { status: 'unavailable', detail: 'Basic unlocks curated packs' },
      basic: { status: 'included', detail: 'Curated monthly packs' },
      pro: { status: 'included', detail: 'All packs + early drops' }
    }
  },
  {
    key: 'schedule-playback',
    label: 'Schedule Playback (Future)',
    tiers: {
      free: { status: 'unavailable', detail: 'Coming soon with Pro' },
      basic: { status: 'unavailable', detail: 'Coming soon with Pro' },
      pro: { status: 'included', detail: 'Early access when it launches' }
    }
  },
  {
    key: 'mobile-optimized',
    label: 'Mobile Touch Optimization',
    tiers: {
      free: { status: 'included', detail: 'Dialed in for phones and tablets' },
      basic: { status: 'included', detail: 'Dialed in for phones and tablets' },
      pro: { status: 'included', detail: 'Dialed in for phones and tablets' }
    }
  },
  {
    key: 'sound-uploader',
    label: 'Access to SoundUploader Tool',
    tiers: {
      free: { status: 'unavailable', detail: 'Pro unlocks bulk uploader' },
      basic: { status: 'unavailable', detail: 'Pro unlocks bulk uploader' },
      pro: { status: 'included', detail: 'Desktop bulk upload companion' }
    }
  },
  {
    key: 'save-presets',
    label: 'Save Room Preset (e.g. “Forest”)',
    tiers: {
      free: { status: 'unavailable', detail: 'Basic unlocks preset saving' },
      basic: { status: 'included', detail: 'Save custom preset snapshots' },
      pro: { status: 'included', detail: 'Save and share presets' }
    }
  }
]

const planDefinitions = [
  {
    id: 'free',
    name: 'Free',
    price: '$0/mo',
    tagline: 'Save your go-to room layout and sync across devices.',
    spotlightKeys: ['room-saving', 'drag-drop', 'mobile-optimized'],
    highlight: false
  },
  {
    id: 'basic',
    name: 'Basic',
    price: '$5/mo',
    tagline: 'Grow into multi-room mixes with deeper timing control.',
    spotlightKeys: ['multi-room', 'timed-loops', 'save-presets'],
    highlight: false
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$10/mo',
    tagline: 'Unlock uploads, AI tools, and pro scheduling workflows.',
    spotlightKeys: ['custom-uploads', 'ai-tags', 'sound-uploader'],
    highlight: true
  }
]

const PLAN_ORDER = planDefinitions.map(plan => plan.id)

const basePlans = planDefinitions.map(plan => {
  const features = FEATURE_DEFINITIONS.map(feature => {
    const tierConfig = feature.tiers[plan.id] ?? { status: 'unavailable' }
    return {
      key: feature.key,
      label: feature.label,
      status: tierConfig.status,
      detail: tierConfig.detail ?? STATUS_DETAIL_FALLBACK[tierConfig.status] ?? ''
    }
  })

  const featuresByKey = features.reduce((acc, feature) => {
    acc[feature.key] = feature
    return acc
  }, {})

  const spotlightFeatures = (plan.spotlightKeys ?? [])
    .map(key => featuresByKey[key])
    .filter(feature => feature && feature.status !== 'unavailable')

  return {
    ...plan,
    features,
    spotlightFeatures
  }
})

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
