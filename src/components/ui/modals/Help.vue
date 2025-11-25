<template>
  <div @click.self="handleClose" class="modal-backdrop">
    <div class="bg-surface-base text-text-primary rounded-2xl w-[80vw] h-[80vh] relative flex flex-col overflow-hidden shadow-2xl border border-border-subtle">
      
      <!-- Absolute Floating Header -->
      <div class="modal-header-float">
        <h1 class="text-2xl font-bold tracking-tight">Welcome to SoundRoom</h1>
        <BaseButton @click="handleClose" class="text-sm hover:text-text-muted">Close</BaseButton>
      </div>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto p-8 pt-24 space-y-8 text-left text-sm leading-relaxed">
        
        <!-- Help Sections (same as before) -->
        <section>
          <p class="mb-4">
            SoundRoom is your spatial mixing playground. Drop curated samples (or your own uploads) onto the stage, fine-tune directionality, and save polished rooms to revisit later.
          </p>
        </section>
        
        <section>
            <h2 class="text-lg font-semibold mb-2">Getting Started</h2>
            <ul class="list-disc list-inside space-y-1">
              <li>Sign in to unlock scene saving, plan-specific features, and the RoomManager.</li>
              <li>Use <strong>+ Add Source</strong> to open the SoundLibrary, then pick a category or <strong>Your Sounds</strong> for uploads.</li>
              <li>Tap the preview ring on any tile to audition it; click <strong>Load</strong> to send it to your draggable source tray.</li>
              <li>Drag a loaded sound from the tray onto the canvas to place it. Rooms support up to <strong>30</strong> active nodes.</li>
              <li>Free plans can stage up to <strong>20</strong> library sources at once; Basic and Pro raise those limits and unlock more packs.</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2">Sound Library & Uploads</h2>
            <ul class="list-disc list-inside space-y-1">
              <li>Browse themed collections (Nature, Human, Musical, Work & Focus, Atmospheric, Misc) curated from the Supabase library.</li>
              <li><strong>Your Sounds</strong> lists anything you've uploaded. Pro members can upload multiple files at once.</li>
              <li>Locked tiles show which plan is required. Selecting one prompts the upgrade modal instead of loading the sound.</li>
              <li>Deleting a sound in <strong>Your Sounds</strong> removes it from your library and any rooms that reference it.</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2">Moving the Listener</h2>
            <ul class="list-disc list-inside space-y-1">
              <li>Use <strong>WASD</strong> or the <strong>Arrow Keys</strong> to move the Listener.</li>
              <li>Use <strong>Q</strong> and <strong>E</strong> to rotate the Listener's direction.</li>
              <li>Press <strong>Tab</strong> to cycle focus across placed sources and the listener.</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2">Controlling Sounds</h2>
            <ul class="list-disc list-inside space-y-1">
              <li>Select a node to see its live readouts, cone angles, and volume slider in the right sidebar.</li>
              <li>Drag the node to reposition; use <strong>Z</strong>/<strong>C</strong> to rotate direction, or right-click to nudge via context actions.</li>
              <li>Toggle <strong>Enable Scheduling</strong> to randomize loops, set play counts, or gate playback windows (timed loops require Basic, advanced counts need Pro).</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2">Saving & Managing Rooms</h2>
            <ul class="list-disc list-inside space-y-1">
              <li>Use the footer buttons to <strong>Save Room</strong> or spin up a fresh canvas. Unsaved changes prompt you before loading another scene.</li>
              <li>Open <strong>RoomManager</strong> (footer right) to load, duplicate, rename, or delete saved rooms. It also shows thumbnails and pagination.</li>
              <li>Free plans keep <strong>1</strong> saved room, Basic stores up to <strong>10</strong>, and Pro offers unlimited saves.</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2">Environment & Mastering</h2>
            <ul class="list-disc list-inside space-y-1">
              <li>Adjust the global <strong>Master</strong> slider in the toolbar whenever you need to rein in or boost the mix.</li>
              <li>Select an impulse response (Cathedral or Forest) in the footer dropdown to swap the space’s reverb profile on the fly.</li>
              <li>Need silence? Hit the play/pause button in the toolbar to stop every source at once.</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2">Tips for Better Sound Design</h2>
            <ul class="list-disc list-inside space-y-1">
              <li>Layer contrasting textures (e.g., Nature + Tools) to build depth without crowding the spectrum.</li>
              <li>Stagger playback with scheduling so loops breathe and never feel mechanical.</li>
              <li>Rotate sources and tuck them behind the listener to create convincing movement.</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-4 border-b border-border-subtle pb-1">FAQ</h2>
            <ul>
              <li
                v-for="(faq, i) in faqs"
                :key="i"
                class="py-1"
              >
                <BaseButton
                  @click="faq.open = !faq.open"
                  class="w-full text-left font-medium text-text-primary focus:outline-none transition-colors"
                >
                  {{ faq.question }}
                </BaseButton>
                <p
                  v-if="faq.open"
                  class="mt-2 text-sm text-text-muted leading-snug italic indent-3"
                >
                  <span
                    v-if="faq.isHtml"
                    v-html="faq.answer"
                  ></span>
                  <template v-else>
                    {{ faq.answer }}
                  </template>
                </p>
              </li>
            </ul>
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
                    class="w-full px-3 py-2 border border-border-subtle rounded bg-surface-base text-text-primary focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-surface-base text-sm"
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
                    class="w-full px-3 py-2 border border-border-subtle rounded bg-surface-base text-text-primary focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-surface-base text-sm"
                  />
                </div>
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <label for="topic" class="block text-sm font-medium mb-1">Topic</label>
                  <select
                    id="topic"
                    v-model="form.topic"
                    required
                    class="w-full px-3 py-2 border border-border-subtle rounded bg-surface-base text-text-primary focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-surface-base text-sm"
                  >
                    <option v-for="item in topicOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
                  </select>
                </div>

                <div>
                  <label for="plan" class="block text-sm font-medium mb-1">Current Plan</label>
                  <select
                    id="plan"
                    v-model="form.plan"
                    class="w-full px-3 py-2 border border-border-subtle rounded bg-surface-base text-text-primary focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-surface-base text-sm"
                  >
                    <option value="">Select your plan</option>
                    <option v-for="option in planOptions" :key="option" :value="option">{{ PLAN_LABELS[option] }}</option>
                    <option value="not-sure">Not sure / Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label for="roomLink" class="block text-sm font-medium mb-1">Room link or ID <span class="text-xs text-text-muted">(optional)</span></label>
                <input
                  type="text"
                  id="roomLink"
                  v-model="form.roomLink"
                  placeholder="Paste a RoomManager link or card ID"
                  class="w-full px-3 py-2 border border-border-subtle rounded bg-surface-base text-text-primary focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-surface-base text-sm"
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
                  class="w-full px-3 py-2 border border-border-subtle rounded bg-surface-base text-text-primary focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-surface-base text-sm"
                ></textarea>
              </div>

              <div>
                <label for="reproSteps" class="block text-sm font-medium mb-1">Steps to reproduce <span class="text-xs text-text-muted">(optional)</span></label>
                <textarea
                  id="reproSteps"
                  v-model="form.reproSteps"
                  rows="3"
                  placeholder="Step-by-step details help us debug much faster."
                  class="w-full px-3 py-2 border border-border-subtle rounded bg-surface-base text-text-primary focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-surface-base text-sm"
                ></textarea>
              </div>

              <p v-if="formError" class="text-sm text-status-danger">{{ formError }}</p>

              <BaseButton
                type="submit"
                :disabled="submitting"
                class="bg-accent hover:bg-accent-strong disabled:opacity-60 disabled:cursor-not-allowed text-text-inverse px-4 py-2 rounded text-sm"
              >
                <span v-if="submitting">Sending…</span>
                <span v-else>Send Message</span>
              </BaseButton>
            </form>
          </div>

          <div v-else class="p-4 rounded bg-status-success/12 text-status-success space-y-2">
            <p class="font-semibold">Thanks for contacting SoundRoom Support!</p>
            <p class="text-sm">We’ll reply from support@soundroom.live soon. Check for a subject line starting with [SUPPORT] in case it lands in spam.</p>
            <BaseButton class="text-sm" @click="prepareAnotherMessage">Send another message</BaseButton>
          </div>

        </section>

      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import { PLAN_LABELS } from '@/constants/entitlementCopy'
import { useAuth } from '@/composables/useAuth'

const emit = defineEmits(['close'])
const router = useRouter()
const { tier, user } = useAuth()

const topicOptions = [
  { value: 'support', label: 'Product support' },
  { value: 'bug', label: 'Bug report' },
  { value: 'billing', label: 'Billing or plan question' },
  { value: 'feature', label: 'Feature request' },
  { value: 'feedback', label: 'Feedback / Kudos' }
]

const planOptions = ['free', 'basic', 'pro']

const submitting = ref(false)
const formError = ref('')
const formSubmitted = ref(false)

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

watch(tier, (val) => {
  if (val && !form.value.plan) {
    form.value.plan = val
  }
})

const faqs = ref([
  {
    question: 'How do I save or load my rooms?',
    answer: 'Sign in, then use the footer Save Room button. Load, rename, or delete scenes from RoomManager (footer right). Free keeps 1 room, Basic stores 10, and Pro is unlimited.',
    open: false
  },
  {
    question: 'Why is the save button disabled?',
    answer: 'SoundRoom only enables Save when the scene has changed since your last save. Make an edit—move a node, tweak volume, or add a source—and the button lights up.',
    open: false
  },
  {
    question: 'Can I upload my own sounds?',
    answer: 'Yes. Open + Add Source, switch to Your Sounds, and click Upload. Uploading is a Pro feature only.',
    open: false
  },
  {
    question: 'What do the plan badges on sounds mean?',
    answer: 'Some library tiles are gated to Basic or Pro packs. Selecting a locked tile opens an upgrade prompt unless your current plan already matches the badge.',
    open: false
  },
  {
    question: 'How do timed loops and scheduling work?',
    answer: 'Pick a source, open the right sidebar, and toggle Enable Scheduling. Basic unlocks interval loops; Pro adds play counts and combined interval+count modes.',
    open: false
  },
  {
    question: 'Can I change the room acoustics?',
    answer: 'Use the IR dropdown in the footer to swap impulse responses (Cathedral or Forest) and the Master slider in the toolbar to balance the global mix.',
    open: false
  },
  {
    question: 'How do I report a bug or request a feature?',
    answer: 'Use the contact form below or email <a href="mailto:support@soundroom.live" class="text-accent hover:underline">support@soundroom.live</a>.str',
    open: false,
    isHtml: true
  }
])

function resetFAQ() {
  faqs.value.forEach(faq => {
    faq.open = false
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
  router.push('/')
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

  payload.append('message', form.value.message)

  if (form.value.reproSteps) {
    payload.append('steps_to_reproduce', form.value.reproSteps)
  }

  payload.append('_captcha', 'false')
  payload.append('_subject', '[SUPPORT] SoundRoom Support Request')
  payload.append('_honey', '')
  payload.append('_autoresponse', 'Thanks for contacting SoundRoom Support! We\'ll follow up shortly.')

  const metadata = {
    topic: form.value.topic,
    topicLabel,
    plan: planValue || 'unspecified',
    planLabel: resolvePlanLabel(form.value.plan),
    roomLink: form.value.roomLink || '',
    userId: user.value?.id ?? '',
    userEmail: user.value?.email ?? '',
    currentUrl: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
  }

  payload.append('app_metadata', JSON.stringify(metadata))

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
