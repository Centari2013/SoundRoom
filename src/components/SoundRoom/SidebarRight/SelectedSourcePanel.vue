<template>
  <section>
    <h5 class="text-sm font-semibold uppercase text-neutral-500 dark:text-neutral-400 mb-2">Selected Source</h5>
    <div v-if="selectedSource" class="space-y-6 flex flex-col items-center">
      <div class="space-y-1 text-xs">
         <h4>{{ selectedSource.name }}</h4>
        <p>X: {{ cleanSourceXY.x }}</p>
        <p>Y: {{ cleanSourceXY.y }}</p>
        <p>Angle: {{ displaySourceAngle }}°</p>
        <p>Inner Cone: {{ selectedSource.instance.state.coneInner }}°</p>
        <p>Outer Cone: {{ selectedSource.instance.state.coneOuter }}°</p>
      </div>
      <div class="w-5/6">
          <VueSlider
            v-model="selectedSource.volume"
            :min="0"
            :max="1"
            :interval="0.01"
            tooltip="none"
            @drag-start="onStart"
            @change="onChange"
            @drag-end="onEnd"
          />
        </div>
     <div class="w-full space-y-2">
       <button
        @click="playPauseSource"
        class="w-full bg-red-600 text-xs rounded hover:bg-red-500"
      >
        {{ playPauseLabel }}
      </button>
      <button
        v-if="selectedSource"
        @click="actionManager.doAction(
          'delete_canvas_sound_source', 
          { index: selectedSource.index, src: selectedSource }
        )"
        class="w-full bg-red-600 text-xs rounded hover:bg-red-500"
      >
        Delete
      </button>
     </div>
    <hr class="w-full border-neutral-200 dark:border-neutral-700" />
    <div class="text-left w-19/20 space-x-2 align-items-center flex">
      <input
        type="checkbox"
        v-model="schedulingEnabled"
        class="accent-blue-500"/>
       <label class="text-sm text-left w-full">Enable Scheduling</label>
    </div>

    <!-- Scheduling Settings -->
    <div v-if="schedulingEnabled" class="space-y-3 w-19/20 text-xs text-neutral-600 dark:text-neutral-300 text-left">

      <!-- Mode Selection -->
      <div class="flex flex-col space-y-1">
        <label class="w-32 shrink-0">Schedule Mode</label>
        <select v-model="selectedSource.instance.state.schedule.mode"
          class="flex-1 px-2 py-1 rounded border dark:bg-neutral-800 dark:border-neutral-700">
          <option value="loop">Loop</option>
          <option value="interval">Interval</option>
          <option value="count">Count</option>
          <option value="interval+count">Interval + Count</option>
        </select>
      </div>

      <!-- Interval Settings -->
      <div v-if="['interval', 'interval+count'].includes(selectedSource.instance.state.schedule.mode)" class="space-y-4">
        <div class="flex flex-col space-y-1">
          <label class="w-32 shrink-0">Gap Min (s)</label>
          <input type="number" v-model.number="selectedSource.instance.state.schedule.gapMin"
            class="flex-1 px-2 py-1 rounded border dark:bg-neutral-800 dark:border-neutral-700" />
        </div>
        <div class="flex flex-col space-y-1">
          <label class="w-32 shrink-0">Gap Max (s)</label>
          <input type="number" v-model.number="selectedSource.instance.state.schedule.gapMax"
            class="flex-1 px-2 py-1 rounded border dark:bg-neutral-800 dark:border-neutral-700" />
        </div>
      </div>

      <!-- Count & Time Window -->
      <div v-if="['count', 'interval+count'].includes(selectedSource.instance.state.schedule.mode)" class="space-y-4">
        <div class="flex flex-col space-y-1">
          <label class="w-32 shrink-0">Play Count</label>
          <input type="number" v-model.number="selectedSource.instance.state.schedule.count"
            placeholder="Unlimited"
            class="flex-1 px-2 py-1 rounded border dark:bg-neutral-800 dark:border-neutral-700" />
        </div>
        <div class="flex flex-col space-y-1">
          <label class="w-32 shrink-0">Active Start (s)</label>
          <input type="number" v-model.number="selectedSource.instance.state.schedule.activeStart"
            class="flex-1 px-2 py-1 rounded border dark:bg-neutral-800 dark:border-neutral-700" />
        </div>
        <div class="flex flex-col space-y-1">
          <label class="w-32 shrink-0">Active End (s)</label>
          <input type="number" v-model.number="selectedSource.instance.state.schedule.activeEnd"
            class="flex-1 px-2 py-1 rounded border dark:bg-neutral-800 dark:border-neutral-700" />
        </div>
      </div>

    </div>




    </div>
    <div v-else>
      <p>No Source Selected</p>
    </div>
    
  </section>
</template>

<script setup>
import { computed, inject } from 'vue';
import VueSlider from 'vue-3-slider-component';
import { useVolumeSlider } from '@/composables/useVolumeSlider';
import { useActionManagerStore } from '@/stores/useActionManagerStore';
import { storeToRefs } from 'pinia';

const props = defineProps({
  selectedSource: Object
});

const { actionManager } = storeToRefs(useActionManagerStore());

const selectedSource = inject('selectedSource');
const schedulingEnabled = computed({
  get() { return selectedSource.value.instance.state.schedule?.enabled }
  ,
  set(value) {
    selectedSource.value.instance.state.schedule.enabled = value;
  }
});
const { onStart, onChange, onEnd } = useVolumeSlider(selectedSource, actionManager);

const playPauseLabel = computed(() => {
  return selectedSource.value.instance.playing ? "Pause" : "Play";
});

const playPauseSource = () => { 
  selectedSource.value.instance.playing ? selectedSource.value.instance.stop() : selectedSource.value.instance.play();
};
// added 90 degress to trick users into thinking that soundsource and listener are on the same rotational offset
const displaySourceAngle = computed(() => Math.round(((selectedSource.value.instance.state.angle + 90) % 360 + 360) % 360));
const cleanSourceXY = computed(() => ({
  x: Math.round(selectedSource.value.instance.state.x),
  y: Math.round(selectedSource.value.instance.state.y)
  }));
</script>
