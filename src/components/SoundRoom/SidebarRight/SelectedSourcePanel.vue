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
        <input type="checkbox"
        :checked="schedulingEnabled" 
        @change="e => {
          scheduleCopy.value = getScheduleCopy();
          scheduleCopy.value.enabled = e.target.checked;
          commitScheduleEdit();
        }"
        class="accent-blue-500"/>
        <label class="text-sm">Enable Scheduling</label>
      </div>

      <!-- Scheduling Settings -->
      <div v-if="schedulingEnabled" class="space-y-4 w-full text-xs text-neutral-600 dark:text-neutral-300 px-1">
        <!-- Mode -->
        <div class="flex flex-col space-y-1">
          <label class="text-sm text-left">Schedule Mode</label>
          <select :value="schedule.mode"
            @change="e => {
              scheduleCopy.value = getScheduleCopy();
              scheduleCopy.value.mode = e.target.value;
            }"
            @blur="commitScheduleEdit"
            class="px-2 py-1 rounded border dark:bg-neutral-800 dark:border-neutral-700">
            <option v-if="false" value="loop">Loop</option>
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
              :value="schedule.gapMin"
              @change="e => {
                scheduleCopy.value = getScheduleCopy();
                scheduleCopy.value.gapMin = e.target.value;
              }"
              
              @blur="commitScheduleEdit"
              class="px-2 py-1 rounded border dark:bg-neutral-800 dark:border-neutral-700"
            />
          </div>
          <div class="flex flex-col space-y-1">
            <label class="text-sm">Gap Max (s)</label>
            <!-- Gap Max -->
            <input
              type="number"
              :min="schedule.gapMin"
              :value="schedule.gapMax"
              @change="e => {
                scheduleCopy.value = getScheduleCopy();
                scheduleCopy.value.gapMax = e.target.value;
                validateGap();
              }"
              @blur="commitScheduleEdit"
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
              :value="schedule.count"
              @change="e => {
                scheduleCopy.value = getScheduleCopy();
                scheduleCopy.value.count = e.target.value;
                validateCount();
              }"
              @blur="commitScheduleEdit"
              placeholder="Unlimited"
              class="px-2 py-1 rounded border dark:bg-neutral-800 dark:border-neutral-700"
            />
          </div>
          <div class="flex flex-col space-y-1">
            <label class="text-sm">Active Start (s)</label>
            <!-- Active Start -->
            <input
              type="number"
              :value="schedule.activeStart"
              @change="e => {
                scheduleCopy.value = getScheduleCopy();
                scheduleCopy.value.activeStart = e.target.value;
                validateTimeWindow();
              }"
              @blur="commitScheduleEdit"
              class="px-2 py-1 rounded border dark:bg-neutral-800 dark:border-neutral-700"
            />
          </div>
          <div class="flex flex-col space-y-1">
            <label class="text-sm">Active End (s)</label>
            <!-- Active End -->
            <input
              type="number"
              :value="schedule.activeEnd"
              @change="e => {
                scheduleCopy.value.activeEnd = e.target.value;
                validateTimeWindow();
              }"
              @blur="commitScheduleEdit"
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
import { computed, inject, ref, watch, onMounted, unref, isRef, toRaw } from 'vue';
import VueSlider from 'vue-3-slider-component';
import { useVolumeSlider } from '@/composables/useVolumeSlider';
import { useActionManagerStore } from '@/stores/useActionManagerStore';
import { useAudioEngineStore } from '@/stores/useAudioEngineStore';
import { storeToRefs } from 'pinia';

const props = defineProps({
  selectedSource: Object
});

const selectedSource = inject('selectedSource');
const { actionManager } = storeToRefs(useActionManagerStore());
const audioEngineStore = useAudioEngineStore();

const state = computed(() => selectedSource.value?.instance?.state ?? {});
const schedule = computed(() => state.value?.schedule ?? {});


const schedulingEnabled = computed({
  get: () => schedule.value.enabled,
  set: (val) => schedule.value.enabled = val
});


let scheduleCopy = ref(null)

onMounted(() => {
  scheduleCopy.value = getScheduleCopy();
});

const getScheduleCopy = () => {
  return {
  mode: schedule.value.mode,
  gapMin: schedule.value.gapMin,
  gapMax: schedule.value.gapMax,
  count: schedule.value.count,
  activeStart: schedule.value.activeStart,
  activeEnd: schedule.value.activeEnd,
  enabled: schedule.value.enabled
}
}
const { onStart, onChange, onEnd } = useVolumeSlider(selectedSource, actionManager);

const playPauseLabel = computed(() =>
  selectedSource.value.instance.playing ? "Pause" : "Play"
);

const playPauseSource = () => {
  const src = selectedSource.value;
  src.instance.playing ? audioEngineStore.pauseSoundSource(src) : audioEngineStore.playSoundSource(src);
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
  if (scheduleCopy.value.gapMin < 0) scheduleCopy.value.gapMin = 0;
  if (scheduleCopy.value.gapMax < scheduleCopy.value.gapMin) {
    scheduleCopy.value.gapMax = scheduleCopy.value.gapMin;
  }
}

function validateCount() {
  if (scheduleCopy.value.count !== null && scheduleCopy.value.count < 0) {
    scheduleCopy.value.count = 0;
  }
}

function validateTimeWindow() {
  if (scheduleCopy.value.activeStart < 0) scheduleCopy.value.activeStart = 0;
  if (scheduleCopy.value.activeEnd < scheduleCopy.value.activeStart) {
    scheduleCopy.value.activeEnd = scheduleCopy.value.activeStart;
  }
}

function commitScheduleEdit() {
  const changedKeys = Object.keys(toRaw(scheduleCopy.value)).filter(key => {
  const scheduleVal = unref(schedule.value[key]);
  const copyVal = unref(scheduleCopy.value[key]);

  const same = scheduleVal === copyVal;
  console.log(`Comparing key: ${key}, schedule value:`, scheduleVal, `(type: ${typeof scheduleVal})`);
  console.log(`                 copy value:`, copyVal, `(type: ${typeof copyVal})`);
  console.log(`                 same?: ${same}`);

  return !same;
});

  console.log('Changed keys:', changedKeys);
  console.log('Schedule copy keys:', Object.keys(scheduleCopy.value));

  if (changedKeys.length > 0) {
    const changedParameters = {}
    for (const key of changedKeys) {
      changedParameters[key] = scheduleCopy.value[key]
    }
    const previousParameters = {}
    for (const key of changedKeys) {
      previousParameters[key] = schedule.value[key]
    }
    changedParameters.value.restart = true; // Always restart on schedule change
    console.log('Committing schedule edit with changed parameters:', JSON.parse(JSON.stringify(changedParameters.value)));
    console.log('Previous parameters:', previousParameters);
    actionManager.value.doAction('update_sound_source_schedule', {
      src: selectedSource.value,
      changedParameters: JSON.parse(JSON.stringify(changedParameters.value)),
      previousParameters: JSON.parse(JSON.stringify(previousParameters))
    })
  }
}
 watch(
  () => [
    schedule.value.mode,
    schedule.value.gapMin,
    schedule.value.gapMax,
    schedule.value.count,
    schedule.value.activeStart,
    schedule.value.activeEnd,
    schedule.value.enabled
  ],
  (src) => {
    scheduleCopy.value = getScheduleCopy();
  }
  );


</script>

