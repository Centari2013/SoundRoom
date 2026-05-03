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
              <li>Drag a tray tile onto the grid to place it. Rooms support up to <strong>30</strong> active nodes and <strong>20</strong> unique library sounds at once.</li>
              <li>Move the listener with <strong>WASD/Arrows</strong>, rotate with <strong>Q/E</strong>, and adjust cones/volumes from the right sidebar.</li>
            </ul>
          </div>
          <div class="rounded-xl border border-border-subtle bg-surface-base/70 p-5 space-y-3">
            <h2 class="text-lg font-semibold">Plan Highlights</h2>
            <ul class="list-disc list-inside space-y-2 text-text-secondary">
              <li><strong>Free:</strong> 1 saved room, curated starter packs, no uploads, no scheduling.</li>
              <li><strong>Basic:</strong> Up to 10 saved rooms, timed loops, full preset access, curated packs.</li>
              <li><strong>Pro:</strong> Unlimited rooms, uploads, all packs/themes, scheduling with play counts and combined interval+count modes.</li>
            </ul>
            <p class="text-xs text-text-muted">Plan badges on sounds enforce access; selecting a locked sound triggers the upgrade prompt.</p>
          </div>
        </section>

        <section class="space-y-4">
          <h2 class="text-lg font-semibold">Feature Guides</h2>
          <div class="grid gap-3 lg:grid-cols-2">
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
          <h2 class="text-lg font-semibold">FAQ & Troubleshooting</h2>
          <div class="grid gap-4 lg:grid-cols-2">
            <article
              v-for="(group, groupIndex) in faqGroups"
              :key="group.title"
              class="rounded-xl border border-border-subtle bg-surface-base/70 p-4 space-y-2"
            >
              <header class="flex items-center justify-between">
                <h3 class="text-sm font-semibold">{{ group.title }}</h3>
                <span class="text-xs text-text-muted">{{ group.hint }}</span>
              </header>
              <ul class="divide-y divide-border-subtle/70">
                <li
                  v-for="(faq, i) in group.items"
                  :key="i"
                  class="py-2"
                >
                  <BaseButton
                    @click="faq.open = !faq.open"
                    class="w-full text-left font-medium text-[var(--color-text-primary)] focus:outline-none transition-colors"
                  >
                    {{ faq.question }}
                  </BaseButton>
                  <p
                    v-if="faq.open"
                    class="mt-2 text-xs text-[var(--color-text-muted)] leading-snug"
                  >
                    <span
                      v-if="faq.isHtml"
                      v-html="faq.answer"
                    />
                    <span v-else>
                      {{ faq.answer }}
                    </span>
                  </p>
                </li>
              </ul>
            </article>
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
      'Pro supports uploads; Basic/Free can still use shared packs and curated presets.',
    ]
  },
  {
    title: 'Canvas & Placement',
    caption: '30 nodes, 20 unique sources',
    description: 'Drag tray items onto the grid to create directional sources. Each node shows a cone for its facing direction.',
    points: [
      'Select a node to reveal volume, cone angles, coordinates, and schedule controls in the right sidebar.',
      'Use Z/C to rotate a selected source; right-click for context nudge actions.',
      'The listener (white avatar) moves with WASD/arrow keys and rotates with Q/E. Use Tab to cycle selection across sources and listener.',
      'Delete removes the selected source. Undo/redo (U/R) reverses moves, rotations, and deletions.',
    ]
  },
  {
    title: 'Scheduling & Loops',
    caption: 'Basic/Pro',
    description: 'Scheduling is controlled per-source in the sidebar and uses randomized gaps between plays.',
    points: [
      'Toggle Enable Scheduling to start interval-based playback; Basic unlocks timed loops.',
      'Pro adds play counts plus combined interval + count modes for more predictable bursts.',
      'Scheduling pauses when you pause the room; resuming honors remaining gap time.',
      'Use gap min/max to keep loops organic. Add play counts for finite stingers that stop themselves.',
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
      'Free stores 1 room, Basic up to 10, Pro unlimited. Duplicating uses unique naming to prevent collisions.',
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
      'Uploads and scheduling are Pro features; Basic lacks uploads and advanced counts.',
      'Mobile is currently redirected to a “Coming Soon” view; best experienced on desktop.',
    ]
  },
]

const faqGroups = ref([
  {
    title: 'Onboarding & Accounts',
    hint: 'Access + login',
    items: [
      {
        question: 'What is SoundRoom and what can I do with it?',
        answer: 'SoundRoom lets you build immersive ambient rooms by layering multiple sounds on a shared canvas. You can position a listener and sound sources, tune playback, and save rooms to return to later.',
        open: false
      },
      {
        question: 'Do I need an account to build?',
        answer: 'You can try SoundRoom without an account, but you’ll need to sign in to save rooms and manage them later. Signing in is also required for features like uploads and scheduling.',
        open: false
      },
      {
        question: 'Why am I seeing the mobile splash?',
        answer: 'SoundRoom currently works best on desktop. On small screens and mobile browsers, you may see a “Mobile Coming Soon” page instead of the full editor.',
        open: false
      },
      {
        question: 'How do I reset my password?',
        answer: 'Click Forgot Password on the sign-in page, then check your email for reset instructions. If you don’t see it, check spam/junk and try again.',
        open: false
      },
      {
        question: 'How do I delete my account or request data deletion?',
        answer: 'Use the contact form and choose “Account/Data Deletion” to request account or data removal. If you’re logged in, your account ID is included automatically to help us process your request safely.',
        open: false
      }
    ]
  },
  {
    title: 'Sound Library',
    hint: 'Packs, previews',
    items: [
      {
        question: 'How do I load a sound onto the canvas?',
        answer: 'Click + Add Source, choose a sound, then click Load. It appears in your source tray, where you can drag it onto the room canvas.',
        open: false
      },
      {
        question: 'What happens if I delete an upload?',
        answer: 'Deleting a file from Your Sounds removes it from any rooms that use it. If a saved room depends on that file, you’ll need to add a replacement.',
        open: false
      },
      {
        question: 'Why is a tile locked?',
        answer: 'Some sounds are plan-gated. If a tile is locked, you’ll see which plan is required and be prompted to upgrade if needed.',
        open: false
      }
    ]
  },
  {
    title: 'Saving & Rooms',
    hint: 'RoomManager',
    items: [
      {
        question: 'Why is Save disabled?',
        answer: 'Save is enabled only when you’ve made changes since your last save. If nothing has changed, the button stays disabled by design.',
        open: false
      },
      {
        question: 'Will I lose changes when switching rooms?',
        answer: 'You’ll get a warning before switching if your current room has unsaved changes. Save first to keep your latest edits.',
        open: false
      },
      {
        question: 'Why won’t my room save or load?',
        answer: 'This is usually caused by a connection hiccup, expired login session, or missing uploaded sound. Refresh the page, sign in again if prompted, and try once more. If it keeps happening, contact support through the Help form with your room name and what you clicked.',
        open: false
      }
    ]
  },
  {
    title: 'Scheduling & Playback',
    hint: 'Intervals + counts',
    items: [
      {
        question: 'How do timed loops work?',
        answer: 'Select a source and enable scheduling in the sidebar to make it replay automatically. Min/max gap settings add natural variation between repeats.',
        open: false
      },
      {
        question: 'What is available on Pro scheduling?',
        answer: 'Pro adds extra control, including play counts and combined interval + count behavior. This helps you shape patterns that stop after a specific number of plays.',
        open: false
      },
      {
        question: 'My scheduled source stopped after pausing.',
        answer: 'Pausing stops active audio and scheduling timers. When you resume, playback continues and waits out any remaining gap time before the next scheduled play.',
        open: false
      }
    ]
  },
  {
    title: 'Controls & Shortcuts',
    hint: 'Power users',
    items: [
      {
        question: 'What are the core shortcuts?',
        answer: 'WASD/Arrows move the listener, Q/E rotate, Z/C rotate the selected source, Tab cycles selection, Delete/Backspace removes, and U/R undo-redo.',
        open: false
      },
      {
        question: 'How do I reset the mix quickly?',
        answer: 'Use the master play/pause to stop all audio at once, then adjust the Master slider before resuming. This is the fastest way to recover from an overly loud mix.',
        open: false
      },
      {
        question: 'Can I right-click sources?',
        answer: 'Yes. Right-click opens quick actions, including position nudges for fine placement without dragging.',
        open: false
      }
    ]
  },
  {
    title: 'Billing & Plans',
    hint: 'Stripe-backed',
    items: [
      {
        question: 'How do I change or cancel my plan?',
        answer: 'Open Manage Plan to upgrade, downgrade, or cancel. Upgrades are handled in Stripe Checkout, and plan changes are applied to your SoundRoom account after confirmation.',
        open: false
      },
      {
        question: 'Where can I download invoices?',
        answer: 'Use the Stripe billing portal from Manage Plan to view or download invoices. If you can’t access the portal, contact support@soundroom.app with your account email.',
        open: false,
        isHtml: true
      },
      {
        question: 'Why did I see an upgrade dialog in the library?',
        answer: 'You selected a sound pack that is not included in your current plan. Use View Plan FAQ or Manage Plan to compare plans and unlock that pack.',
        open: false
      }
    ]
  },
  {
    title: 'Troubleshooting Audio',
    hint: 'No sound?',
    items: [
      {
        question: 'I cannot hear previews.',
        answer: 'First check your device volume and output settings. SoundRoom plays one preview at a time, so stop the current preview and try again.',
        open: false
      },
      {
        question: 'Sources are silent after loading a room.',
        answer: 'Check that Master volume is above zero and playback is running. Then make sure your listener is close enough and facing each source; direction and distance affect volume in spatial audio.',
        open: false
      },
      {
        question: 'Undo/redo is not working.',
        answer: 'Undo/redo works for room edits like adding, moving, rotating, and deleting sources. Some global controls (like Master volume) may not appear in undo history.',
        open: false
      },
      {
        question: 'What should I do if something breaks?',
        answer: 'Start with a page refresh and try the action again. If the issue continues, use the Help contact form and include what happened, your browser, and steps to reproduce.',
        open: false
      },
      {
        question: 'Can using multiple tabs cause issues?',
        answer: 'It can. Running SoundRoom in multiple tabs at once may cause confusing save or playback state, so we recommend using one active tab per account/session.',
        open: false
      },
      {
        question: 'Will SoundRoom behave the same in every browser?',
        answer: 'Most modern desktop browsers work, but audio behavior can vary slightly by browser and system audio settings. If audio acts unexpectedly, refresh and test in another browser.',
        open: false
      }
    ]
  },
  {
    title: 'Power Users & Tips',
    hint: 'Advanced moves',
    items: [
      {
        question: 'How do I keep mixes from feeling repetitive?',
        answer: 'Layer multiple sounds with different timing and positions so the room feels alive. Wider scheduling ranges and subtle source rotation can reduce repetition.',
        open: false
      },
      {
        question: 'Any experimental areas?',
        answer: 'Core room building is stable, while some advanced areas continue to evolve over time. If you notice odd behavior, refresh first, then contact support if it continues.',
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
