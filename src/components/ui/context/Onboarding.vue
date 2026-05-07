<script setup>
import { ref, watch, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAudioCacheStore } from '@/stores/useAudioCacheStore'
import { useAudioEngineStore } from '@/stores/useAudioEngineStore'
import { storeToRefs } from 'pinia'

const LOADABLE_SOUND_SELECTOR = '[data-tour-loadable-sound="true"]'

const { soundLibrarySources } = storeToRefs(useAudioCacheStore())
const { audioEngine } = storeToRefs(useAudioEngineStore())
const route = useRoute()

const props = defineProps({ startTour: Boolean })
const emit = defineEmits(['finished'])

const tourRunning = ref(false)
const stepIndex = ref(-1)
const targetRect = ref(null)
const stepStops = []
let rafId = null

function stopStepWatchers() {
  while (stepStops.length) stepStops.pop()?.()
}
function trackStop(stop) {
  stepStops.push(stop)
}

async function waitForDom(selector, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    await nextTick()
    const el = document.querySelector(selector)
    if (el) return el
    await new Promise(r => setTimeout(r, 75))
  }
  return null
}

function setAddSourceDisabled(disabled) {
  const btn = document.getElementById('add-source-btn')
  if (btn) btn.disabled = disabled
}

function nextTourStep() {
  if (!tourRunning.value) return
  const next = stepIndex.value + 1
  if (next >= steps.length) { endTour({ completed: true }); return }
  stepIndex.value = next
  steps[next].onBefore?.()
}


async function advanceWhenRouteHasTarget(routeName, selector) {
  stopStepWatchers()
  const tryAdvance = async (name) => {
    if (!tourRunning.value || name !== routeName) return
    const target = await waitForDom(selector)
    if (!target || !tourRunning.value) return
    stopStepWatchers()
    nextTourStep()
  }
  await tryAdvance(route.name)
  trackStop(watch(() => route.name, name => { void tryAdvance(name) }))
}

function advanceWhenLibrarySourceLoaded() {
  stopStepWatchers()
  const baseline = soundLibrarySources.value.length
  trackStop(watch(
    () => soundLibrarySources.value.length,
    count => {
      if (!tourRunning.value) { stopStepWatchers(); return }
      if (count > baseline) { stopStepWatchers(); nextTourStep() }
    }
  ))
}

function advanceWhenCanvasSourceAdded() {
  stopStepWatchers()
  const baseline = audioEngine.value?.soundSources?.value?.length ?? 0
  trackStop(watch(
    () => audioEngine.value?.soundSources?.value?.length ?? 0,
    count => {
      if (!tourRunning.value) { stopStepWatchers(); return }
      if (count > baseline) { stopStepWatchers(); nextTourStep() }
    }
  ))
}

const steps = [
  {
    target: '.canvas-grid',
    content: '<strong>Welcome to SoundRoom.</strong><br>Build immersive rooms by loading sounds, dragging them onto the stage, and positioning them around the listener.',
    placement: 'top-middle',
  },
  {
    target: '.canvas-grid',
    content: '<strong>This is the SoundStage.</strong><br>The center listener is where you hear from. Sound sources get louder, softer, and more directional as you move them around it.',
    placement: 'right-middle',
  },
  {
    target: '#sidebar-left',
    content: '<strong>This is your source tray.</strong><br>Loaded sounds appear here first. From here, drag a sound into the SoundStage.',
    placement: 'right-middle',
    onBefore() { setAddSourceDisabled(true) },
  },
  {
    target: '#add-source-btn',
    content: '<strong>Add your first sound.</strong><br>Open the Sound Library and choose a loadable sound.',
    placement: 'right-start',
    hideNext: true,
    onBefore() {
      setAddSourceDisabled(false)
      void advanceWhenRouteHasTarget('sound-library', LOADABLE_SOUND_SELECTOR)
    },
  },
  {
    target: LOADABLE_SOUND_SELECTOR,
    content: '<strong>Load a sound.</strong><br>Click Load on any available sound. Preview is optional.',
    placement: 'right-start',
    hideNext: true,
    onBefore() { advanceWhenLibrarySourceLoaded() },
  },
  {
    target: '#close-lib-btn',
    content: '<strong>Close the library.</strong><br>Your loaded sound is waiting in the source tray.',
    placement: 'left-middle',
    hideNext: true,
    onBefore() { void advanceWhenRouteHasTarget('app', '[data-tour="library-source"]') },
  },
  {
    target: '[data-tour="library-source"]',
    content: '<strong>Drag it into the room.</strong><br>Drop the sound anywhere on the SoundStage to place it in the mix.',
    placement: 'right-middle',
    hideNext: true,
    onBefore() { advanceWhenCanvasSourceAdded() },
  },
  {
    target: '.canvas-grid',
    content: '<strong>Shape the sound.</strong><br>Move sources and the listener to hear position changes. Directional sources can also rotate.',
    placement: 'top-middle',
  },
  {
    target: '#menu-btn',
    content: '<strong>You\'re ready.</strong><br>The menu has Help, account tools, and deeper controls when you need them.',
    placement: 'left-middle',
  },
]

const currentStep = computed(() =>
  stepIndex.value >= 0 && stepIndex.value < steps.length ? steps[stepIndex.value] : null
)

function startTour() {
  if (tourRunning.value) return
  tourRunning.value = true
  setAddSourceDisabled(true)
  stepIndex.value = 0
  steps[0].onBefore?.()
  startRaf()
}

function endTour({ completed = false } = {}) {
  stopStepWatchers()
  setAddSourceDisabled(false)
  stopRaf()
  tourRunning.value = false
  stepIndex.value = -1
  targetRect.value = null
  if (completed) {
    localStorage.setItem('soundroom_onboarding_completed', 'true')
    emit('finished')
  }
}

function startRaf() {
  stopRaf()
  const loop = () => {
    const step = currentStep.value
    if (step?.target) {
      const el = document.querySelector(step.target)
      if (el) {
        const r = el.getBoundingClientRect()
        targetRect.value = { top: r.top, left: r.left, width: r.width, height: r.height }
      } else {
        targetRect.value = null
      }
    } else {
      targetRect.value = null
    }
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)
}

function stopRaf() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
}

watch(() => props.startTour, val => {
  if (val) startTour()
  else if (tourRunning.value) endTour()
})

onMounted(() => { if (props.startTour) startTour() })
onUnmounted(() => endTour())

// --- Positioning ---
const TOOLTIP_W = 300
const GAP = 14
const PAD = 6

const spotlightStyle = computed(() => {
  if (!targetRect.value) return { display: 'none' }
  const { top, left, width, height } = targetRect.value
  return {
    left: `${left - PAD}px`,
    top: `${top - PAD}px`,
    width: `${width + PAD * 2}px`,
    height: `${height + PAD * 2}px`,
  }
})

const tooltipStyle = computed(() => {
  if (!currentStep.value) return { display: 'none' }

  if (!targetRect.value) {
    return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
  }

  const { top, left, width, height } = targetRect.value
  const placement = currentStep.value.placement || 'right-middle'
  let x, y

  if (placement.startsWith('right')) {
    x = left + width + GAP
    y = placement === 'right-middle' ? top + height / 2 - 80 : top
  } else if (placement.startsWith('left')) {
    x = left - TOOLTIP_W - GAP
    y = placement === 'left-middle' ? top + height / 2 - 80 : top
  } else if (placement === 'top-middle') {
    x = left + width / 2 - TOOLTIP_W / 2
    y = top - 170 - GAP
    if (y < 8) y = top + height + GAP
  } else {
    x = left + width / 2 - TOOLTIP_W / 2
    y = top + height + GAP
  }

  x = Math.max(8, Math.min(x, window.innerWidth - TOOLTIP_W - 8))
  y = Math.max(8, y)

  return { left: `${Math.round(x)}px`, top: `${Math.round(y)}px` }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="tourRunning" class="tour-root">
      <div
        v-if="targetRect"
        class="tour-spotlight"
        :style="spotlightStyle"
      />

      <div
        v-if="currentStep"
        class="tour-tooltip"
        :style="tooltipStyle"
      >
        <span class="tour-counter">{{ stepIndex + 1 }} / {{ steps.length }}</span>
        <div class="tour-body" v-html="currentStep.content" />
        <div class="tour-actions">
          <div class="tour-nav">
            <button
              v-if="stepIndex === steps.length - 1"
              class="tour-btn tour-btn--primary"
              @click="endTour({ completed: true })"
            >Finish</button>
            <button
              v-else-if="!currentStep.hideNext"
              class="tour-btn tour-btn--primary"
              @click="nextTourStep"
            >Next</button>
          </div>
          <button
            v-if="stepIndex !== steps.length - 1"
            class="tour-btn tour-btn--skip"
            @click="endTour({ completed: true })"
          >Skip</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.tour-root {
  position: fixed;
  inset: 0;
  z-index: 10000;
  pointer-events: none;
}

/* Spotlight: box-shadow creates the darkened surround, element itself is transparent */
.tour-spotlight {
  position: fixed;
  pointer-events: none;
  border-radius: 10px;
  box-shadow:
    0 0 0 3px var(--color-accent, #4a90d9),
    0 0 0 9999px rgba(0, 0, 0, 0.48);
}

.tour-tooltip {
  position: fixed;
  pointer-events: auto;
  width: 300px;
  background: var(--color-bg-elevated, #1c1c2e);
  border: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  color: var(--color-text-primary, #f0f0f0);
  font-size: 14px;
  line-height: 1.5;
}

.tour-counter {
  display: block;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted, rgba(255, 255, 255, 0.35));
  margin-bottom: 8px;
}

.tour-body {
  margin-bottom: 14px;
}

.tour-body :deep(strong) {
  display: block;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}

.tour-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tour-nav {
  display: flex;
  gap: 6px;
}

.tour-btn {
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
  border: 1px solid transparent;
  line-height: 1;
  padding: 7px 14px;
}

.tour-btn--primary {
  background: var(--color-accent, #4a90d9);
  color: #fff;
  border-color: var(--color-accent, #4a90d9);
}
.tour-btn--primary:hover { opacity: 0.85; }

.tour-btn--secondary {
  background: var(--color-bg-surface, rgba(255, 255, 255, 0.07));
  color: var(--color-text-secondary, rgba(255, 255, 255, 0.65));
  border-color: var(--color-border-subtle, rgba(255, 255, 255, 0.1));
}
.tour-btn--secondary:hover { opacity: 0.8; }

.tour-btn--skip {
  background: transparent;
  color: var(--color-text-muted, rgba(255, 255, 255, 0.35));
  font-size: 12px;
  padding: 7px 8px;
}
.tour-btn--skip:hover { color: var(--color-text-secondary, rgba(255, 255, 255, 0.65)); }
</style>
