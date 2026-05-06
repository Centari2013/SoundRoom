<script setup>
import { VTour } from '@globalhive/vuejs-tour'
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAudioCacheStore } from '@/stores/useAudioCacheStore'
import { useAudioEngineStore } from '@/stores/useAudioEngineStore'
import { storeToRefs } from 'pinia'

const LOADABLE_SOUND_SELECTOR = '[data-tour-loadable-sound="true"]'

const { soundLibrarySources } = storeToRefs(useAudioCacheStore())
const { audioEngine } = storeToRefs(useAudioEngineStore())

const route = useRoute()
const vTour = ref(null)
const tourRunning = ref(false)
const stepStops = []

const props = defineProps({
  startTour: Boolean,
})

const emit = defineEmits(['finished'])

function stopStepWatchers() {
  while (stepStops.length) {
    stepStops.pop()?.()
  }
}

function trackStop(stop) {
  stepStops.push(stop)
  return stop
}

function getAddSourceButton() {
  return document.getElementById('add-source-btn')
}

function setAddSourceDisabled(disabled) {
  const button = getAddSourceButton()
  if (button) button.disabled = disabled
}

async function waitForDom(selector, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    await nextTick()
    const el = document.querySelector(selector)
    if (el) return el
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  return null
}

function nextTourStep() {
  if (!tourRunning.value) return
  vTour.value?.nextStep?.()
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

  trackStop(watch(
    () => route.name,
    (name) => {
      void tryAdvance(name)
    }
  ))
}

function advanceWhenLibrarySourceLoaded() {
  stopStepWatchers()

  const baseline = soundLibrarySources.value.length
  trackStop(watch(
    () => soundLibrarySources.value.length,
    (count) => {
      if (!tourRunning.value) {
        stopStepWatchers()
        return
      }

      if (count > baseline) {
        stopStepWatchers()
        nextTourStep()
      }
    }
  ))
}

function advanceWhenCanvasSourceAdded() {
  stopStepWatchers()

  const baseline = audioEngine.value?.soundSources?.value?.length ?? 0
  trackStop(watch(
    () => audioEngine.value?.soundSources?.value?.length ?? 0,
    (count) => {
      if (!tourRunning.value) {
        stopStepWatchers()
        return
      }

      if (count > baseline) {
        stopStepWatchers()
        nextTourStep()
      }
    }
  ))
}

function startTour() {
  if (!vTour.value || tourRunning.value) return
  tourRunning.value = true
  setAddSourceDisabled(false)
  vTour.value.startTour()
}

function endTour({ completed = false } = {}) {
  stopStepWatchers()
  setAddSourceDisabled(false)
  vTour.value?.endTour?.()
  tourRunning.value = false

  if (completed) {
    localStorage.setItem('soundroom_onboarding_completed', 'true')
    emit('finished')
  }
}

watch(() => props.startTour, (value) => {
  if (value) {
    startTour()
  } else if (tourRunning.value) {
    endTour()
  }
})

onMounted(() => {
  if (props.startTour) {
    startTour()
  }
})

onUnmounted(() => {
  endTour()
})

const steps = [
  {
    target: '.canvas-grid',
    content: `
      <strong>Welcome to SoundRoom.</strong><br>
      Build immersive rooms by loading sounds, dragging them onto the stage, and positioning them around the listener.
    `,
    placement: 'top-middle',
    noScroll: true,
    backdrop: true,
  },
  {
    target: '.canvas-grid',
    content: `
      <strong>This is the SoundStage.</strong><br>
      The center listener is where you hear from. Sound sources get louder, softer, and more directional as you move them around it.
    `,
    placement: 'right-middle',
    backdrop: true,
    highlight: true,
    noScroll: true,
  },
  {
    target: '#sidebar-left',
    content: `
      <strong>This is your source tray.</strong><br>
      Loaded sounds appear here first. From here, drag a sound into the SoundStage.
    `,
    placement: 'right-middle',
    backdrop: true,
    highlight: true,
  },
  {
    target: '#add-source-btn',
    content: `
      <strong>Add your first sound.</strong><br>
      Open the Sound Library and choose a loadable sound.
    `,
    placement: 'right-start',
    backdrop: true,
    highlight: true,
    hideNext: () => true,
    onBefore: () => {
      setAddSourceDisabled(false)
      void advanceWhenRouteHasTarget('sound-library', LOADABLE_SOUND_SELECTOR)
    },
  },
  {
    target: LOADABLE_SOUND_SELECTOR,
    content: `
      <strong>Load a sound.</strong><br>
      Click Load on any available sound. Preview is optional.
    `,
    placement: 'right-start',
    backdrop: true,
    highlight: true,
    hideNext: () => true,
    onBefore: () => {
      advanceWhenLibrarySourceLoaded()
    },
  },
  {
    target: '#close-lib-btn',
    content: `
      <strong>Close the library.</strong><br>
      Your loaded sound is waiting in the source tray.
    `,
    placement: 'left-middle',
    backdrop: true,
    highlight: true,
    hideNext: () => true,
    onBefore: () => {
      void advanceWhenRouteHasTarget('app', '[data-tour="library-source"]')
    },
  },
  {
    target: '[data-tour="library-source"]',
    content: `
      <strong>Drag it into the room.</strong><br>
      Drop the sound anywhere on the SoundStage to place it in the mix.
    `,
    placement: 'right-middle',
    highlight: true,
    hideNext: () => true,
    onBefore: () => {
      advanceWhenCanvasSourceAdded()
    },
  },
  {
    target: '.canvas-grid',
    content: `
      <strong>Shape the sound.</strong><br>
      Move sources and the listener to hear position changes. Directional sources can also rotate.
    `,
    placement: 'top-middle',
    backdrop: true,
    highlight: true,
  },
  {
    target: '#menu-btn',
    content: `
      <strong>You're ready.</strong><br>
      The menu has Help, account tools, and deeper controls when you need them.
    `,
    placement: 'left-middle',
    backdrop: true,
    highlight: true,
  },
]

const buttonLabels = {
  next: 'Next',
  back: 'Back',
  done: 'Finish',
  skip: 'Skip',
}
</script>

<template>
  <VTour
    ref="vTour"
    :steps="steps"
    :buttonLabels="buttonLabels"
  >
    <template #actions="{
      lastStep,
      nextStep,
      _CurrentStep,
    }">
      <div class="vjt-actions">
        <div class="w-full flex flex-row gap-1">
          <button
            v-if="_CurrentStep.currentStep > 0"
            type="button"
            @click.prevent="lastStep()"
          >
            Back
          </button>

          <button
            v-if="_CurrentStep.currentStep === steps.length - 1"
            type="button"
            @click.prevent="endTour({ completed: true })"
          >
            Finish
          </button>

          <button
            v-else-if="!steps[_CurrentStep.currentStep].hideNext?.()"
            type="button"
            @click.prevent="nextStep()"
          >
            Next
          </button>
        </div>

        <div
          v-if="_CurrentStep.currentStep !== steps.length - 1"
          class="flex w-20"
        >
          <button
            class="ml-3"
            type="button"
            @click.prevent="endTour({ completed: true })"
          >
            Skip
          </button>
        </div>
      </div>
    </template>
  </VTour>
</template>
