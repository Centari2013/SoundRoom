<template>
  <div class="flex items-center justify-between p-3 border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 space-x-4 w-full h-1/12">
    <div class="flex items-center space-x-2">
      <span class="text-xs text-neutral-500">IR Select</span>
      <select
        v-model="selectedIR"
        @change="applyIR"
        class="px-2 py-1 w-32 rounded border text-sm dark:bg-neutral-800 dark:border-neutral-700"
      >
        <option v-for="ir in irOptions" :key="ir.value" :value="ir.value">
          {{ ir.label }}
        </option>
      </select>
    </div>
  </div>
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
