<template>
  <select
    v-model="selectedIR"
    @change="applyIR"
    class="px-2 py-1 w-32 rounded sr-border text-sm bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] sr-border-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-surface)]"
  >
    <option v-for="ir in irOptions" :key="ir.value" :value="ir.value">
      {{ ir.label }}
    </option>
  </select>
</template>

<script setup>
import { ref } from 'vue'
import { useAudioEngineStore } from '@/stores/useAudioEngineStore'

const engineStore = useAudioEngineStore()

const IR_PRESET_URLS = {
  cathedral: '/impulses/1st_baptist_nashville_far_wide.wav',
  forest: '/impulses/forest.wav',
}

const irOptions = ref([
  { label: 'Cathedral', value: 'cathedral' },
  { label: 'Forest', value: 'forest' },
])

const selectedIR = ref('cathedral')

function applyIR() {
  const preset = selectedIR.value
  const url = IR_PRESET_URLS[preset]
  if (url) {
    engineStore.loadIR(preset, url)
  }
}
</script>
