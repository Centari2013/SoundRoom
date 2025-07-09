<template>
  <section>
    <h5 class="text-sm font-semibold uppercase text-neutral-500 dark:text-neutral-400 mb-2">
      Selected Source
    </h5>

    <div v-if="selectedSource" class="space-y-6 flex flex-col items-center">
      <!-- Readouts -->
      <div class="space-y-1 text-xs">
        <h4>{{ selectedSource.name }}</h4>
        <p>X: {{ cleanSourceXY.x }}</p>
        <p>Y: {{ cleanSourceXY.y }}</p>
        <p>Angle: {{ displaySourceAngle }}°</p>
        <p>Inner Cone: {{ state.coneInner }}°</p>
        <p>Outer Cone: {{ state.coneOuter }}°</p>
      </div>

      <!-- Volume Slider -->
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

      <!-- Controls -->
      <div class="w-full space-y-2">
        <button
          @click="playPauseSource"
          class="w-full bg-red-600 text-xs rounded hover:bg-red-500"
        >
          {{ playPauseLabel }}
        </button>
        <button
          @click="deleteSource"
          class="w-full bg-red-600 text-xs rounded hover:bg-red-500"
        >
          Delete
        </button>
      </div>

      <hr class="w-full border-neutral-200 dark:border-neutral-700" />

      <!-- Scheduling Toggle -->
      <div class="w-full flex items-center space-x-2 text-left px-1">
        <input type="checkbox" v-model="schedulingEnabled" class="accent-blue-500" />
        <label class="text-sm">Enable Scheduling</label>
      </div>

      <!-- Scheduling Settings -->
      <div v-if="schedulingEnabled" class="space-y-4 w-full text-xs text-neutral-600 dark:text-neutral-300 px-1">
        <!-- Mode -->
        <div class="flex flex-col space-y-1">
          <label class="text-sm text-left">Schedule Mode</label>
          <select v-model="schedule.mode"
            class="px-2 py-1 rounded border dark:bg-neutral-800 dark:border-neutral-700">
            <option value="loop">Loop</option>
            <option value="interval">Interval</option>
            <option v-if="false" value="count">Count</option>
            <option v-if="false" value="interval+count">Interval + Count</option>
          </select>
        </div>

        <!-- Interval -->
        <div v-if="['interval', 'interval+count'].includes(schedule.mode)" class="space-y-2 text-left">
          <div class="flex flex-col space-y-1">
            <label class="text-sm">Gap Min (s)</label>
            <!-- Gap Min -->
            <input
              type="number"
              :min="0"
              v-model.number="schedule.gapMin"
              @blur="validateGap"
              class="px-2 py-1 rounded border dark:bg-neutral-800 dark:border-neutral-700"
            />
          </div>
          <div class="flex flex-col space-y-1">
            <label class="text-sm">Gap Max (s)</label>
            <!-- Gap Max -->
            <input
              type="number"
              :min="schedule.gapMin"
              v-model.number="schedule.gapMax"
              @blur="validateGap"
              class="px-2 py-1 rounded border dark:bg-neutral-800 dark:border-neutral-700"
            />
            <p v-if="schedule.gapMax < schedule.gapMin" class="text-red-500 text-xs">
              Gap Max cannot be smaller than Gap Min
            </p>
          </div>
        </div>

        <!-- Count + Time Window -->
        <div v-if="false && ['count', 'interval+count'].includes(schedule.mode)" class="space-y-2 text-left">
          <div class="flex flex-col space-y-1">
            <label class="text-sm">Play Count</label>
            <!-- Count -->
            <input
              type="number"
              v-model.number="schedule.count"
              @blur="validateCount"
              placeholder="Unlimited"
              class="px-2 py-1 rounded border dark:bg-neutral-800 dark:border-neutral-700"
            />
          </div>
          <div class="flex flex-col space-y-1">
            <label class="text-sm">Active Start (s)</label>
            <!-- Active Start -->
            <input
              type="number"
              v-model.number="schedule.activeStart"
              @blur="validateTimeWindow"
              class="px-2 py-1 rounded border dark:bg-neutral-800 dark:border-neutral-700"
            />
          </div>
          <div class="flex flex-col space-y-1">
            <label class="text-sm">Active End (s)</label>
            <!-- Active End -->
            <input
              type="number"
              v-model.number="schedule.activeEnd"
              @blur="validateTimeWindow"
              class="px-2 py-1 rounded border dark:bg-neutral-800 dark:border-neutral-700"
            />
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

const selectedSource = inject('selectedSource');
const { actionManager } = storeToRefs(useActionManagerStore());

const state = computed(() => selectedSource.value.instance.state);
const schedule = computed(() => state.value.schedule);

const schedulingEnabled = computed({
  get: () => schedule.value.enabled,
  set: (val) => schedule.value.enabled = val
});


const { onStart, onChange, onEnd } = useVolumeSlider(selectedSource, actionManager);

const playPauseLabel = computed(() =>
  selectedSource.value.instance.playing ? "Pause" : "Play"
);

const playPauseSource = () => {
  const inst = selectedSource.value.instance;
  inst.playing ? inst.stop() : inst.play();
};

const deleteSource = () => {
  actionManager.value.doAction('delete_canvas_sound_source', {
    index: selectedSource.value.index,
    src: selectedSource.value
  });
};

const displaySourceAngle = computed(() =>
  Math.round(((state.value.angle + 90) % 360 + 360) % 360)
);

const cleanSourceXY = computed(() => ({
  x: Math.round(state.value.x),
  y: Math.round(state.value.y)
}));


function validateGap() {
  if (schedule.value.gapMin < 0) schedule.value.gapMin = 0;
  if (schedule.value.gapMax < schedule.value.gapMin) {
    schedule.value.gapMax = schedule.value.gapMin;
  }
}

function validateCount() {
  if (schedule.value.count !== null && schedule.value.count < 0) {
    schedule.value.count = 0;
  }
}

function validateTimeWindow() {
  if (schedule.value.activeStart < 0) schedule.value.activeStart = 0;
  if (schedule.value.activeEnd < schedule.value.activeStart) {
    schedule.value.activeEnd = schedule.value.activeStart;
  }
}

</script>

