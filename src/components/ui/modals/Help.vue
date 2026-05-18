<template>
  <div @click.self="handleClose" class="modal-backdrop">
    <div class="bg-surface-base text-text-primary rounded-2xl w-[80vw] h-[80vh] relative flex flex-col overflow-hidden shadow-2xl border border-border-subtle">

      <!-- Absolute Floating Header -->
      <div class="modal-header-float">
        <h1 class="text-2xl font-bold tracking-tight">Welcome to SoundRoom</h1>
        <BaseButton @click="handleClose" class="text-sm hover:text-[var(--color-text-muted)]">Close</BaseButton>
      </div>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto p-8 pt-24 space-y-10 text-left text-sm leading-relaxed">

        <section class="rounded-xl border border-border-subtle bg-surface-base/70 p-6 space-y-3">
          <p>SoundRoom is a spatial audio canvas built with Vue 3, Konva, and the Web Audio API. Place directional sound sources, schedule loops, and save complete rooms for later.</p>
          <p class="text-text-secondary">Use the sections below to learn workflows, limits, billing details, shortcuts, and troubleshooting tips.</p>
        </section>

        <section class="grid gap-4 md:grid-cols-2">
          <div class="rounded-xl border border-border-subtle bg-surface-base/70 p-5 space-y-3">
            <h2 class="text-lg font-semibold">Fast Start</h2>
            <ul class="list-disc list-inside space-y-2 text-text-secondary">
              <li>Sign in to unlock saving, plan-specific packs, uploads (Pro), and RoomManager access.</li>
              <li>Hit <strong>+ Add Source</strong> → pick a category → tap the preview ring to audition → <strong>Load</strong> to send tiles to the source tray.</li>
              <li>Drag a tray tile onto the grid to place it. Rooms support as many active nodes and as many unique library sounds as your setup can handle.</li>
              <li>Move the listener with <strong>WASD/Arrows</strong>, rotate with <strong>Q/E</strong>, and adjust cones/volumes from the right sidebar. Or you can just use your mouse to drag.</li>
            </ul>
          </div>
          <div class="rounded-xl border border-border-subtle bg-surface-base/70 p-5 space-y-3">
            <h2 class="text-lg font-semibold">Plan Highlights</h2>
            <ul class="list-disc list-inside space-y-2 text-text-secondary">
              <li><strong>Free:</strong> 2 saved rooms, starter sounds, no uploads, no scheduling or timeline.</li>
              <li><strong>Basic:</strong> Up to 10 saved rooms, simple per-source scheduling, more sounds.</li>
              <li><strong>Pro:</strong> Unlimited rooms, uploads, UI themes, advanced scheduling, and the timeline sequencer.</li>
            </ul>
            
          </div>
        </section>

        <section class="space-y-4">
          <h2 class="text-lg font-semibold">Feature Guides</h2>
          <div class="grid gap-3 lg:grid-cols-2 items-start">
            <details v-for="section in featureSections" :key="section.title" class="group rounded-xl border border-border-subtle bg-surface-base/70 px-5 py-4">
              <summary class="flex items-center justify-between cursor-pointer text-sm font-semibold text-text-primary">{{ section.title }}<span class="text-xs text-text-muted">{{ section.caption }}</span></summary>
              <div class="mt-3 space-y-2 text-text-secondary">
                <p v-if="section.description">{{ section.description }}</p>
                <ul class="list-disc list-inside space-y-2">
                  <li v-for="item in section.points" :key="item" class="leading-snug">{{ item }}</li>
                </ul>
              </div>
            </details>
          </div>
        </section>

        <section class="space-y-4">
          <h2 class="text-lg font-semibold">FAQ</h2>
          <div class="rounded-xl border border-border-subtle bg-surface-base/70 overflow-hidden divide-y divide-border-subtle/50">
            <template v-for="group in faqGroups" :key="group.title">
              <div class="px-5 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide bg-surface-base/40">
                {{ group.title }}
              </div>
              <div
                v-for="(faq, i) in group.items"
                :key="i"
                class="px-5 py-3 border-t border-border-subtle/50"
              >
                <BaseButton
                  @click="faq.open = !faq.open"
                  class="w-full text-left font-medium text-[var(--color-text-primary)] focus:outline-none transition-colors flex items-center justify-between gap-4"
                >
                  <span>{{ faq.question }}</span>
                  <span class="text-text-muted text-base leading-none flex-shrink-0">{{ faq.open ? '−' : '+' }}</span>
                </BaseButton>
                <p
                  v-if="faq.open"
                  class="mt-2 text-xs text-[var(--color-text-muted)] leading-snug"
                >
                  <span v-if="faq.isHtml" v-html="faq.answer" />
                  <span v-else>{{ faq.answer }}</span>
                </p>
              </div>
            </template>
          </div>
        </section>


        <!-- Contact Form or Thank You -->
        <section>
          <h2 class="text-lg font-semibold mb-4">Wanna Chat?</h2>
          <p class="mb-4">
            Got questions, feedback, or ideas? Drop a message below.
          </p>

          <div v-if="!formSubmitted">
            <form @submit.prevent="handleSubmit" class="space-y-4">
              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <label for="name" class="block text-sm font-medium mb-1">Your Name</label>
                  <input
                    type="text"
                    id="name"
                    v-model="form.name"
                    required
                    autocomplete="name"
                    class="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-surface)] text-sm"
                  />
                </div>

                <div>
                  <label for="email" class="block text-sm font-medium mb-1">Your Email</label>
                  <input
                    type="email"
                    id="email"
                    v-model="form.email"
                    required
                    autocomplete="email"
                    class="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-surface)] text-sm"
                  />
                </div>
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <label for="topic" class="block text-sm font-medium mb-1">Request Type</label>
                  <select
                    id="topic"
                    v-model="form.topic"
                    required
                    class="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-surface)] text-sm"
                  >
                    <option v-for="item in topicOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
                  </select>
                  <p v-if="isDeletionRequest" class="mt-1 text-xs text-[var(--color-text-muted)]">
                    For deletion requests, please use the email tied to your SoundRoom account so we can verify ownership.
                  </p>
                </div>

                <div>
                  <label for="plan" class="block text-sm font-medium mb-1">Current Plan</label>
                  <select
                    id="plan"
                    v-model="form.plan"
                    class="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-surface)] text-sm"
                  >
                    <option value="">Select your plan</option>
                    <option v-for="option in planOptions" :key="option" :value="option">{{ PLAN_LABELS[option] }}</option>
                    <option value="not-sure">Not sure / Other</option>
                  </select>
                </div>
              </div>

              <div v-if="false">
                <label for="roomLink" class="block text-sm font-medium mb-1">Room link or ID <span class="text-xs text-[var(--color-text-muted)]">(optional)</span></label>
                <input
                  type="text"
                  id="roomLink"
                  v-model="form.roomLink"
                  placeholder="Paste a RoomManager link or card ID"
                  class="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-surface)] text-sm"
                />
              </div>

              <div>
                <label for="message" class="block text-sm font-medium mb-1">What can we help with?</label>
                <textarea
                  id="message"
                  v-model="form.message"
                  rows="4"
                  required
                  placeholder="Tell us what you were working on and what you expected to happen."
                  class="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-surface)] text-sm"
                ></textarea>
                <p v-if="!user" class="mt-1 text-xs text-[var(--color-text-muted)]">
                  Not logged in? Include the email associated with your SoundRoom account in your message so support can locate it.
                </p>
              </div>

              <div>
                <label for="reproSteps" class="block text-sm font-medium mb-1">Steps to reproduce <span class="text-xs text-[var(--color-text-muted)]">(optional)</span></label>
                <textarea
                  id="reproSteps"
                  v-model="form.reproSteps"
                  rows="3"
                  placeholder="Step-by-step details help us debug much faster."
                  class="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-surface)] text-sm"
                ></textarea>
              </div>

              <p v-if="formError" class="text-sm text-status-danger">{{ formError }}</p>

              <BaseButton
                type="submit"
                :disabled="submitting"
                class="bg-[var(--color-accent)] hover:bg-[var(--color-accent-strong)] disabled:opacity-60 disabled:cursor-not-allowed text-[var(--color-text-inverse)] px-4 py-2 rounded text-sm"
              >
                <span v-if="submitting">Sending…</span>
                <span v-else>Send Message</span>
              </BaseButton>
            </form>
          </div>

          <div v-else class="p-4 rounded bg-[rgba(var(--color-success-rgb),0.12)] text-[var(--color-success)] space-y-2">
            <p class="font-semibold">Thanks for contacting SoundRoom Support!</p>
            <p class="text-sm">We'll reply from support@soundroom.live soon. Check for a subject line starting with [SUPPORT] in case it lands in spam.</p>
            <BaseButton class="text-sm" @click="prepareAnotherMessage">Send another message</BaseButton>
          </div>

        </section>

      </div>

    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import { PLAN_LABELS } from '@/constants/entitlementCopy'
import { useAuth } from '@/composables/useAuth'

const emit = defineEmits(['close'])
const router = useRouter()
const { tier, user } = useAuth()

const topicOptions = [
  { value: 'general-support', label: 'General Support' },
  { value: 'billing-help', label: 'Billing Help' },
  { value: 'bug-report', label: 'Bug Report' },
  { value: 'account-data-deletion', label: 'Account/Data Deletion' },
  { value: 'other', label: 'Other' }
]

const planOptions = ['free', 'basic', 'pro']

const submitting = ref(false)
const formError = ref('')
const formSubmitted = ref(false)

const featureSections = [
  {
    title: 'Sound Library & Uploads',
    caption: 'Browse, preview, gate access',
    description: 'Open the Sound Library via + Add Source. Categories include Nature, Human, Musical, Work & Focus, Atmospheric, Misc, plus Your Sounds for uploads (Pro).',
    points: [
      'Tap the preview ring on any tile to audition before loading.',
      'Locked tiles show which plan is required. Attempting to load prompts an upgrade modal unless your tier already matches.',
      'Your Sounds lists uploads you own. Deleting an upload removes it from RoomManager scenes that reference it.',
    ]
  },
  {
    title: 'Canvas & Placement',
    caption: 'Controlling sources',
    description: 'Drag tray items onto the grid to create directional sources. Each node shows a cone for its facing direction.',
    points: [
      'Select a node to reveal volume, cone angles, coordinates, and schedule controls in the right sidebar.',
      'Use Z/C to rotate a selected source; right-click for context nudge actions.',
      'The listener moves with WASD/arrow keys and rotates with Q/E. Use Tab to cycle selection across sources and listener.',
      'Delete removes the selected source. Undo/redo (U/R) reverses moves, rotations, and deletions.',
    ]
  },
  {
    title: 'Scheduling & Loops',
    caption: 'Basic/Pro',
    description: 'Simple scheduling is controlled per-source in the sidebar and uses randomized gaps between plays.',
    points: [
      'Toggle Enable Scheduling to start interval-based playback; Basic unlocks simple scheduling.',
      'Pro adds play counts plus combined interval + count modes for more predictable bursts.',
      'Scheduling pauses when you pause the room; resuming honors remaining gap time.',
      'Use gap min/max to keep loops organic. Add play counts for finite stingers that stop themselves.',
    ]
  },
  {
    title: 'Timeline Sequencer',
    caption: 'Pro',
    description: 'The timeline is a Pro sequencing surface for arranging clips against a shared playhead.',
    points: [
      'Add a source to the timeline from the sidebar, then drag or resize its clip in the timeline drawer.',
      'Timeline clips control their source; simple scheduling is disabled while that source is on the timeline.',
      'Stretch a clip beyond the sound duration to repeat it as DAW-style regions in the same lane.',
      'Timeline duration, loop state, and clips are saved with the room. If you downgrade, the saved timeline stays in the room but is inactive until Pro is restored.',
    ]
  },
  {
    title: 'Volumes, Cones & Reverb',
    caption: 'Mixing basics',
    points: [
      'Use the toolbar Master slider for global gain; adjust per-source volume in the sidebar.',
      'Cone inner/outer angles affect how quickly a source falls off when you face away.',
      'Switch impulse responses in the footer dropdown (Cathedral or Forest) to change the space. Master mute/pause silences all sources instantly.',
      'Move the listener closer or behind sources to hear natural attenuation without clipping.',
    ]
  },
  {
    title: 'Saving & RoomManager',
    caption: 'Footer controls',
    points: [
      'Save Room (footer) becomes active after any change. Unsaved scenes prompt before loading another room.',
      'RoomManager lets you load, rename, or delete saved rooms with pagination and thumbnails.',
      'Free stores 2 rooms, Basic up to 10, Pro unlimited. Duplicating uses unique naming to prevent collisions.',
    ]
  },
  {
    title: 'Keyboard Shortcuts',
    caption: 'Power navigation',
    points: [
      'Move listener: WASD or Arrow Keys. Rotate listener: Q/E.',
      'Rotate selected source: Z/C. Cycle selection: Tab.',
      'Undo/Redo: U/R. Delete selected: Delete or Backspace.',
    ]
  },
  {
    title: 'Billing & Plan Changes',
    caption: 'Stripe-backed',
    points: [
      'Use Manage Plan to upgrade/downgrade.',
      'If you have billing history, open the Stripe customer portal to update payment methods or view invoices.',
    ]
  },
  {
    title: 'Known Limitations',
    caption: 'MVP notes',
    points: [
      'Maximum of 30 placed sources and 20 unique library sounds per session.',
      'Uploads, the timeline sequencer, and advanced scheduling are Pro features; Basic has simple scheduling but lacks uploads, timeline clips, and advanced counts.',
      'Mobile is currently redirected to a “Coming Soon” view; best experienced on desktop.',
    ]
  },
]

const faqGroups = ref([
  {
    title: 'Getting Started & Accounts',
    items: [
      {
        question: 'Do I need an account to build?',
        answer: 'You can audition and place sounds without signing in, but saving rooms, RoomManager, scheduling, and uploads all require an account.',
        open: false
      },
      {
        question: 'Why am I seeing the mobile splash?',
        answer: 'SoundRoom is desktop-only for now. If you\'re on a small viewport or mobile browser, resize or switch to desktop to access the full canvas.',
        open: false
      },
      {
        question: 'How do I reset my password?',
        answer: 'Use the Forgot Password link on the sign-in page. An email with reset instructions will be sent to your account address.',
        open: false
      },
      {
        question: 'How do I delete my account or request data removal?',
        answer: 'Use the contact form below and select “Account/Data Deletion.” If you\'re signed in, your account ID is included automatically so we can process the request safely.',
        open: false
      }
    ]
  },
  {
    title: 'Saving, Rooms & Billing',
    items: [
      {
        question: 'Why is Save Room disabled?',
        answer: 'The button activates only after a change — move a node, adjust a cone, or tweak volume to enable it.',
        open: false
      },
      {
        question: 'Will I lose changes when switching rooms?',
        answer: 'If there are unsaved edits you\'ll be prompted before loading another room. Save first to keep the current layout.',
        open: false
      },
      {
        question: 'How do I change or cancel my plan?',
        answer: 'Open Manage Plan from your account menu. Upgrades redirect to Stripe Checkout; downgrades move you to Free immediately.',
        open: false
      },
      {
        question: 'Where can I find my invoices?',
        answer: 'If you have billing history, use the Stripe billing portal link in Manage Plan. Otherwise, email support@soundroom.live with your account email.',
        open: false
      },
      {
        question: 'Why did I see an upgrade prompt in the library?',
        answer: 'Tiles marked with a plan badge are gated. Selecting them opens the upgrade modal. Use Manage Plan to unlock the relevant tier.',
        open: false
      }
    ]
  },
  {
    title: 'Tips & Controls',
    items: [
      {
        question: 'Can I right-click sources on the canvas?',
        answer: 'Yes — context actions let you nudge a source\'s position without dragging, which is useful for fine alignment on crowded canvases.',
        open: false
      },
      {
        question: 'How do I keep mixes from feeling repetitive?',
        answer: 'Use wide min/max scheduling gaps, rotate sources occasionally, and layer complementary packs — Atmospheric + Human or Nature + Work & Focus pair well.',
        open: false
      },
      {
        question: 'What\'s on the roadmap?',
        answer: 'Uploads, pack gating, and scheduling are stable. Advanced search, occlusion modeling, and collaboration features are planned. Expect iterative updates.',
        open: false
      }
    ]
  }
])

const initialFormState = () => ({
  name: '',
  email: '',
  topic: topicOptions[0].value,
  plan: tier.value ?? '',
  roomLink: '',
  message: '',
  reproSteps: ''
})

const form = ref(initialFormState())
const isDeletionRequest = computed(() => form.value.topic === 'account-data-deletion')

watch(tier, (val) => {
  if (val && !form.value.plan) {
    form.value.plan = val
  }
})

function resetFAQ() {
  faqGroups.value.forEach(group => {
    group.items.forEach(faq => {
      faq.open = false
    })
  })
}

function resetFormState() {
  form.value = initialFormState()
  formError.value = ''
}

function handleClose() {
  formSubmitted.value = false
  resetFormState()
  resetFAQ()
  router.push({ name: 'app' })
  emit('close')
}

function prepareAnotherMessage() {
  formSubmitted.value = false
  resetFormState()
}

function resolvePlanLabel(plan) {
  if (!plan) return 'Unspecified'
  if (plan === 'not-sure') return 'Not sure / Other'
  return PLAN_LABELS[plan] ?? plan
}

async function handleSubmit() {
  if (submitting.value) return

  formError.value = ''
  if (!form.value.email.trim()) {
    formError.value = 'Please enter your email.'
    return
  }
  if (!form.value.topic) {
    formError.value = 'Please select a request type.'
    return
  }
  if (!form.value.message.trim()) {
    formError.value = 'Please enter a message.'
    return
  }

  submitting.value = true

  const endpoint = 'https://formsubmit.co/support@soundroom.live'
  const payload = new FormData()

  payload.append('name', form.value.name.trim())
  payload.append('email', form.value.email.trim())
  payload.append('_replyto', form.value.email.trim())
  payload.append('topic', form.value.topic)
  const topicLabel = topicOptions.find(item => item.value === form.value.topic)?.label ?? form.value.topic
  payload.append('topic_label', topicLabel)

  const planValue = form.value.plan || tier.value || ''
  payload.append('plan', planValue || 'unspecified')
  payload.append('plan_label', resolvePlanLabel(form.value.plan))

  if (form.value.roomLink) {
    payload.append('room_link', form.value.roomLink.trim())
  }

  payload.append('message', form.value.message.trim())

  if (form.value.reproSteps) {
    payload.append('steps_to_reproduce', form.value.reproSteps)
  }

  payload.append('_captcha', 'false')
  payload.append('_subject', '[SUPPORT] SoundRoom Support Request')
  payload.append('_honey', '')
  payload.append('_autoresponse', 'Thanks for contacting SoundRoom Support! We\'ll follow up shortly.')

  const metadata = {
    requestType: form.value.topic,
    requestTypeLabel: topicLabel,
    topic: form.value.topic,
    topicLabel,
    plan: planValue || 'unspecified',
    planLabel: resolvePlanLabel(form.value.plan),
    roomLink: form.value.roomLink || '',
    userId: user.value?.id ?? '',
    userEmail: user.value?.email ?? '',
    currentUrl: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    submittedAt: new Date().toISOString(),
    appEnvironment: import.meta.env.MODE || 'unknown'
  }

  payload.append('app_metadata', JSON.stringify(metadata))
  payload.append('timestamp', metadata.submittedAt)
  payload.append('environment', metadata.appEnvironment)
  payload.append('authenticated_user_id', metadata.userId || 'not-authenticated')
  payload.append('authenticated_email', metadata.userEmail || 'not-authenticated')

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: payload,
      headers: { Accept: 'application/json' }
    })

    if (!response.ok) {
      let errorMessage = 'Support form submission failed.'
      try {
        const errorData = await response.json()
        if (errorData?.message) errorMessage = errorData.message
      } catch (_) {
        // ignore parsing errors
      }
      throw new Error(errorMessage)
    }

    formSubmitted.value = true
    resetFormState()
  } catch (error) {
    console.error('Form submission error:', error)
    formError.value = 'Something went wrong sending your message. Please try again or email support@soundroom.live.'
  } finally {
    submitting.value = false
  }
}

</script>
