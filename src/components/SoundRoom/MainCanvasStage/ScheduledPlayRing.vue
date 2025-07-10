<template>
  <v-arc
    v-if="playing"
    :innerRadius="innerRadius"
    :outerRadius="scheduled ? pulseRadius : outerRadius"
    :angle="angle"
    :rotation="rotation"
    :fill="color"
    :stroke="color"
    :strokeWidth="strokeWidth"
    listening="false"
  />

  <v-arc
    v-if="playing"
    :innerRadius="innerRadius"
    :outerRadius="scheduled ? pulseRadius : outerRadius"
    :angle="angle"
    :rotation="rotation + 180"
    :fill="color"
    :stroke="color"
    :strokeWidth="strokeWidth"
    listening="false"
  />
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  playing: Boolean,
  scheduled: {
    type: Boolean,
    default: false,
  },
  angle: {
    type: Number,
    default: 90,
  },
  innerRadius: {
    type: Number,
    default: 12,
  },
  outerRadius: {
    type: Number,
    default: 14,
  },
  color: {
    type: String,
    default: '#2e90fa',
  },
  strokeWidth: {
    type: Number,
    default: 1.5,
  },
})

const rotation = ref(0)
let spinFrame = null

function tick() {
  rotation.value = (rotation.value + 0.5) % 360
  spinFrame = requestAnimationFrame(tick)
}

watch(() => props.playing, (val) => {
  if (val) {
    if (!spinFrame) tick()
  } else {
    cancelAnimationFrame(spinFrame)
    spinFrame = null
    rotation.value = 0
  }
})

// Pulse effect for scheduled items
const outerRadiusBase = props.outerRadius
const pulseRadius = ref(outerRadiusBase)
let pulseFrame = null
let pulseDirection = 1

function pulse() {
  if (pulseRadius.value >= outerRadiusBase + 2) pulseDirection = -1
  else if (pulseRadius.value <= outerRadiusBase) pulseDirection = 1

  pulseRadius.value += 0.06 * pulseDirection
  pulseFrame = requestAnimationFrame(pulse)
}

watch(
  () => props.playing && props.scheduled,
  (shouldPulse) => {
    if (shouldPulse) {
      if (!pulseFrame) pulse()
    } else {
      cancelAnimationFrame(pulseFrame)
      pulseFrame = null
      pulseRadius.value = outerRadiusBase
    }
  }
)

onMounted(() => {
  if (props.playing) tick()
  if (props.playing && props.scheduled) pulse()
})

onUnmounted(() => {
  cancelAnimationFrame(spinFrame)
  spinFrame = null
  cancelAnimationFrame(pulseFrame)
  pulseFrame = null
})
</script>
