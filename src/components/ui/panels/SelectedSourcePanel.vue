<template>
  <section>
    <h5 class="text-sm font-semibold uppercase text-neutral-500 dark:text-neutral-400 mb-2">Selected Source</h5>
    <div v-if="selectedSource" class="text-xs space-y-1 flex flex-col items-center">
      <h4>{{ selectedSource.name }}</h4>
      <p>X: {{ cleanSourceXY.x }}</p>
      <p>Y: {{ cleanSourceXY.y }}</p>
      <p>Angle: {{ displaySourceAngle }}°</p>
      <p>Inner Cone: {{ selectedSource.instance.state.coneInner }}°</p>
      <p>Outer Cone: {{ selectedSource.instance.state.coneOuter }}°</p>
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
    </div>
    <div v-else>
      <p>No Source Selected</p>
    </div>
    <button
      v-if="selectedSource"
      @click="playPauseSource"
      class="mt-10 w-full bg-red-600 text-xs py-1 rounded hover:bg-red-500"
    >
      {{ playPauseLabel }}
    </button>
    <button
      v-if="selectedSource"
      @click="actionManager.doAction(
        'delete_canvas_sound_source', 
        { index: selectedSource.index, src: selectedSource }
      )"
      class="mt-3 w-full bg-red-600 text-xs py-1 rounded hover:bg-red-500"
    >
      Delete
    </button>
  </section>
</template>

<script setup>
import { computed, inject } from 'vue';
import VueSlider from 'vue-3-slider-component';
import { useVolumeSlider } from '@/composables/useVolumeSlider';

const props = defineProps({
  actionManager: Object,
  selectedSource: Object
});

const selectedSource = inject('selectedSource');
const actionManager = props.actionManager;

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
