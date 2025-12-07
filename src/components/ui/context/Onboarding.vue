<script setup lang="ts">
import { VTour } from '@globalhive/vuejs-tour';
import { watch, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAudioCacheStore } from '@/stores/useAudioCacheStore';
import { useAudioEngineStore } from '@/stores/useAudioEngineStore';
import { storeToRefs } from 'pinia';

const { soundLibrarySources } = storeToRefs(useAudioCacheStore())
const { audioEngine } = storeToRefs(useAudioEngineStore())

const route = useRoute();
const vTour = ref();
const props = defineProps({
  startTour: Boolean,
});

const tourRunning = ref(false);

watch(() => props.startTour, (v) => {
  if (v) {
    tourRunning.value = true;
    vTour.value.startTour();
  } else {
    vTour.value.endTour();
  }
});
// Your onboarding steps
const steps = [
  // STEP 1 — Welcome
  { 
    target: '.canvas-grid',
    content: `
      <strong>Welcome to SoundRoom!</strong><br>
      Build immersive audio spaces to suit your mood with minimal distraction.<br>
      Press “Next” to see how it works.
    `,
    placement: 'top-middle',
    noScroll: true,
    backdrop: true,
  },

  // STEP 2 — The Sound Stage (center grid)
  {
    target: '.canvas-grid',
    content: `
      <strong>This is your SoundStage.</strong><br>
      Drag sounds (and the Listener in the middle) anywhere in this space to shape how your room sounds.
    `,
    placement: 'right-middle',
    backdrop: true,
    highlight: true,
    noScroll: true,
  },
  {
    target: '#sidebar-left', // make sure this class exists
    content: `
      <strong>This is your left sidebar</strong><br>
      This is where you can manage your sound sources and view the Listener position.
    `,
    placement: 'right-middle',
    backdrop: true,
    highlight: true,
    onAfter: () => {
      document.getElementById('add-source-btn').disabled = true;
    }
  },
  {
    target: '#add-source-btn', // make sure this class exists
    content: `
      <strong>Add your first sound</strong><br>
      Click the "+ Add Source" button to add your first sound.
    `,
    placement: 'right-start',
    backdrop: true,
    highlight: true,
    hideNext: () =>true,
    onBefore: async () => {
      document.getElementById('add-source-btn').disabled = false;
    // Already on library? Go straight to step 4.
    if (route.name === 'sound-library') {
      await waitForDom('.sound-grid-item');
      vTour.value.nextStep();
      return;
    }
    const unwatch = watch(
      () => route.name,
      async (val) => {
        if (!tourRunning.value) {
          unwatch();
          return;
        }
        if (val === 'sound-library') {
          unwatch();

          // Wait for DOM to exist before advancing
          await waitForDom('.sound-grid-item');
          vTour.value.nextStep();
        }
      }
    );
  },

  },
  // STEP 4 — Example sound source marker
  {
    target: '.sound-grid-item', // left list OR you can change to your marker div overlay
    content: `
      <strong>Load a sound.</strong><br>
      Hit the load button to continue.
    `,
    placement: 'right-start',
    backdrop: true,
    highlight: true,
    hideNext: () => true,
    onAfter: async () => {
      // Watch for the sound to be added to the stage
      const unwatch = watch(
        () => soundLibrarySources.value.length,
        async (val) => {
        if (val === 0) return;
          unwatch();
          vTour.value.nextStep();
          
        }
      );
    },
  },

  // STEP 5 — The draggable sound node on the stage (use overlay marker)
  {
    target: '#close-lib-btn', // your overlay div positioned over the Konva sound icon
    content: `
      <strong>Close the SoundLibrary.</strong><br>
    `,
    placement: 'left-middle',
    backdrop: true,
    highlight: true,
    hideNext: () => true,
    onBefore: async () => {
    // Already on library? Go straight to step 4.
    if (route.name === 'app') {
      await waitForDom('#library-sound-list');
      vTour.value.nextStep();
      return;
    }

    // Otherwise watch for the route change
    const unwatch = watch(
      () => route.name,
      async (val) => {
        if (!tourRunning.value) {
          unwatch();
          return;
        }
        if (val === 'app') {
          unwatch();

          // Wait for DOM to exist before advancing
          await waitForDom('#library-sound-list');
          vTour.value.nextStep();
        }
      }
    );
  },

  },

  // STEP 6 — Listener icon (blue guy)
  {
    target: '#library-sound-list', // another overlay div
    content: `
      <strong>Here is the sound you just added.</strong><br>
      Drag it into the SoundStage to start positioning it in 3D space.
    `,
    placement: 'right-middle',
    highlight: true,
    hideNext: () => true,
    onAfter: async () => {
      // Watch for the sound to be dragged into the stage
      const unwatch = watch(
        () => audioEngine.value.soundSources.value.length,
        async (val) => {
          if (val === 0) return;
          unwatch();
          vTour.value.nextStep();
          
        }
      );
    },
  },

  // STEP 7 — Save Room (bottom left)
  {
    target: '.canvas-grid', // make sure the class exists
    content: `
      <strong>Now try moving and rotating the SoundSource and Listener!</strong><br>
    `,
    placement: 'top-middle',
    backdrop: true,
    highlight: true,
  },

  // STEP 8 — Room Manager button (bottom right)
  {
    target: '#menu-btn', // make sure the id exists
    content: `
      <strong>And those are the basics!</strong><br>For more detailed info, check out the Help section in the menu.
    `,
    placement: 'left-middle',
    backdrop: true,
    highlight: true,
  },

];
// For button labels if you want them clean
const buttonLabels = {
  next: 'Next',
  back: 'Back',
  done: 'Finish',
  skip: 'Skip',
};

import { nextTick } from 'vue';

function waitForDom(selector, attempts = 20) {
  return new Promise(async (resolve) => {
    for (let i = 0; i < attempts; i++) {
      await nextTick();
      const el = document.querySelector(selector);

      if (el) {
        resolve(el);
        return;
      }

      await new Promise(r => setTimeout(r, 50)); // wait 50ms and retry
    }

    resolve(null); // give up gracefully
  });
}

function finishTour() {
  const btn = document.getElementById('add-source-btn');
  if (btn) btn.disabled = false;
  vTour.value.endTour();
  localStorage.setItem('soundroom_onboarding_completed', 'true');
  tourRunning.value = false;
}

</script>

<template>
  <!-- Global tour -->
  <VTour 
    ref="vTour"
    :steps="steps"
    :buttonLabels="buttonLabels"
  >
    <!-- Custom actions slot to hide Next when hideNext exists -->
    <template #actions="{
      lastStep,
      nextStep,
      _CurrentStep,
    }">
      <div class="vjt-actions">
        <div class=" w-full flex flex-row gap-1">
          <!-- Back -->
        <button
          v-if="_CurrentStep.currentStep > 0"
          type="button"
          @click.prevent="lastStep()"
        >
          Back
        </button>

        <!-- Done button -->
        <button
          v-if="_CurrentStep.currentStep === steps.length - 1"
          type="button"
          @click.prevent="finishTour()"
        >
          Finish
        </button>
        
        <!-- Next button, only if this step doesn't request hideNext -->
        <button
          v-else
          v-if="!steps[_CurrentStep.currentStep].hideNext?.()"
          type="button"
          @click.prevent="nextStep()"
        >
          Next
        </button>
        
        </div>
        
        <div class="flex w-20" v-if="_CurrentStep.currentStep !== steps.length - 1">
          <button
            class="ml-3"
            type="button"
            @click.prevent="finishTour()"
        >
          Skip
        </button>
        </div>
        <!-- Skip button -->
        

      </div>
    </template>
  </VTour>
</template>
