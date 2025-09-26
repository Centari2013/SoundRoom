<template>
  <main class="flex-1 overflow-y-auto bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
    <div class="max-w-4xl mx-auto px-6 py-10 space-y-10">
      <section class="space-y-4">
        <div class="flex items-center justify-between gap-6 flex-wrap">
          <div class="space-y-2">
            <h1 class="text-3xl font-semibold tracking-tight">Manage Plan</h1>
            <p class="text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl">
              Review what is included in your subscription, explore upgrade options, or reach out for billing support.
            </p>
          </div>
          <span
            class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
            :class="planBadgeClass"
          >
            <span class="uppercase tracking-wide text-xs">Current Plan</span>
            <span>{{ currentPlan.name }}</span>
          </span>
        </div>

        <div
          class="rounded-2xl bg-white/80 dark:bg-neutral-900/80 p-6 shadow-sm border"
          :class="planTheme.card"
        >
          <header class="flex flex-wrap items-center justify-between gap-4">
            <div class="space-y-1">
              <h2 class="text-2xl font-semibold">{{ currentPlan.name }}</h2>
              <p class="text-sm text-neutral-600 dark:text-neutral-400">{{ currentPlan.tagline }}</p>
            </div>
            <div class="text-right">
              <span class="text-lg font-semibold">{{ currentPlan.price }}</span>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">Billed monthly — cancel anytime.</p>
            </div>
          </header>

          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <div v-for="feature in currentPlan.highlights" :key="feature" class="flex items-start gap-3">
              <span class="mt-1 h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400"></span>
              <p class="text-sm text-neutral-700 dark:text-neutral-300">{{ feature }}</p>
            </div>
          </div>

          <div class="mt-8 flex flex-wrap items-center gap-3">
            <RouterLink v-if="currentPlan.nextCta" :to="currentPlan.nextCta.to">
              <BaseButton :class="planTheme.cta">
                {{ currentPlan.nextCta.label }}
              </BaseButton>
            </RouterLink>
            <BaseButton
              v-if="currentPlan.manageAction"
              variant="naked"
              class="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              @click="currentPlan.manageAction.handler"
            >
              {{ currentPlan.manageAction.label }}
            </BaseButton>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 p-6 shadow-sm space-y-6">
        <header class="space-y-1">
          <h2 class="text-xl font-semibold">Billing & Receipts</h2>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            SoundRoom uses Stripe under the hood. A full self-service billing portal is coming soon — in the meantime, reach out and we will take care of any changes for you.
          </p>
        </header>

        <div class="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-100/80 dark:bg-neutral-950/50 px-5 py-6 text-sm text-neutral-600 dark:text-neutral-300">
          <p>Need an invoice, tax receipt, or want to change your payment method?</p>
          <p class="mt-3">Email <a class="underline" :href="supportEmailHref">{{ SUPPORT_EMAIL }}</a> and include the email tied to your SoundRoom account.</p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <BaseButton @click="contactBilling">
            Contact billing support
          </BaseButton>
          <BaseButton variant="naked" class="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200" @click="openFAQ">
            View plan FAQ
          </BaseButton>
        </div>
      </section>

      <section class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 p-6 shadow-sm space-y-6">
        <header class="space-y-1">
          <h2 class="text-xl font-semibold">Upcoming Features</h2>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">We are actively building deeper collaboration and scheduling tools. Here is what is landing next for paying members.</p>
        </header>

        <ul class="grid gap-4 md:grid-cols-2">
          <li v-for="item in roadmapHighlights" :key="item.title" class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-5 space-y-2">
            <p class="text-sm uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{{ item.badge }}</p>
            <h3 class="text-lg font-medium">{{ item.title }}</h3>
            <p class="text-sm text-neutral-600 dark:text-neutral-400">{{ item.copy }}</p>
          </li>
        </ul>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import { useAuth } from '@/composables/useAuth'
import { getPlanTheme, getPlanBadgeClass } from '@/constants/planThemes'

const SUPPORT_EMAIL = 'support@soundroom.app'

const { tier } = useAuth()
const router = useRouter()
const route = useRoute()

const normalizedTier = computed(() => (tier.value || 'free').toLowerCase())

const PLAN_MAP = {
  free: {
    id: 'free',
    name: 'Free',
    price: '$0/mo',
    tagline: 'Experiment without limits. Upgrade when you need more power.',
    highlights: [
      'Save your favorite ambient room layout in the cloud',
      'Access rotating starter sound packs curated by SoundRoom',
      'Invite-only access to upcoming live mix showcases'
    ],
    nextCta: {
      label: 'Upgrade to Pro',
      to: '/upgrade'
    },
    manageAction: null
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: '$5/mo',
    tagline: 'Grow into multi-room mixes with deeper timing control.',
    highlights: [
      'Unlock timed loop controls for every source',
      'Save up to 10 custom SoundRooms with instant switching',
      'Access monthly sound pack drops and new impulse responses'
    ],
    nextCta: {
      label: 'Upgrade to Pro',
      to: '/upgrade'
    },
    manageAction: {
      label: 'Request downgrade to Free',
      handler: () => sendEmail({
        subject: 'SoundRoom – Downgrade request',
        body: `Hi SoundRoom team,%0D%0A%0D%0AI would like to move my plan to Free. My account email is ${route.query.email || '[your account email]'}.` 
      })
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: '$10/mo',
    tagline: 'Unlock everything in SoundRoom and upcoming scheduling tools.',
    highlights: [
      'Upload your own audio files alongside library sounds',
      'Priority access to scheduling, AI assists, and performance presets',
      'Unlimited saved rooms with snapshot history'
    ],
    nextCta: null,
    manageAction: {
      label: 'Manage or cancel subscription',
      handler: () => sendEmail({
        subject: 'SoundRoom – Manage Pro subscription',
        body: `Hi SoundRoom team,%0D%0A%0D%0AI need help managing my subscription. My account email is ${route.query.email || '[your account email]'}.`
      })
    }
  }
}

const currentPlan = computed(() => PLAN_MAP[normalizedTier.value] ?? PLAN_MAP.free)

const planTheme = computed(() => getPlanTheme(currentPlan.value.id))
const planBadgeClass = computed(() => getPlanBadgeClass(currentPlan.value.id))

const supportEmailHref = computed(() => `mailto:${SUPPORT_EMAIL}`)

const roadmapHighlights = [
  {
    badge: 'Beta',
    title: 'Collaborative SoundRooms',
    copy: 'Invite friends to co-create in real time with shared source control and listener roles.'
  },
  {
    badge: 'Coming Soon',
    title: 'Automations & Scheduling',
    copy: 'Sequence room states, fades, and schedules across a performance or livestream.'
  },
  {
    badge: 'Early Preview',
    title: 'Advanced Room Presets',
    copy: 'Unlock premium impulse responses with material-specific occlusion and reflections.'
  },
  {
    badge: 'Research',
    title: 'AI Assisted Mixing',
    copy: 'Describe the vibe you want and let SoundRoom suggest placements and motion paths.'
  }
]

function sendEmail({ subject, body }) {
  if (typeof window === 'undefined') return
  window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${body}`
}

function contactBilling() {
  sendEmail({
    subject: 'SoundRoom – Billing support',
    body: 'Hi SoundRoom team,%0D%0A%0D%0AI need help with billing. My account email is [your account email].'
  })
}

function openFAQ() {
  router.push('/help')
}
</script>
