<script setup>
import { computed } from 'vue'

const props = defineProps({
  duration: { type: Number, required: true },
  pxPerSecond: { type: Number, required: true },
})

const emit = defineEmits(['seek'])

const totalWidth = computed(() => props.duration * props.pxPerSecond)

// Aim for a tick every ~60px; snap to sensible intervals
const tickInterval = computed(() => {
  const raw = 60 / props.pxPerSecond
  const candidates = [1, 2, 5, 10, 15, 30, 60]
  return candidates.find(c => c >= raw) ?? 60
})

const ticks = computed(() => {
  const out = []
  const step = tickInterval.value
  for (let t = 0; t <= props.duration; t += step) {
    out.push({ t, x: t * props.pxPerSecond })
  }
  return out
})

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`
}

function onClick(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX - rect.left
  emit('seek', x / props.pxPerSecond)
}
</script>

<template>
  <div
    class="timeline-ruler"
    :style="{ width: totalWidth + 'px' }"
    @click="onClick"
  >
    <div
      v-for="tick in ticks"
      :key="tick.t"
      class="tick"
      :style="{ left: tick.x + 'px' }"
    >
      <span class="tick-label">{{ formatTime(tick.t) }}</span>
    </div>
  </div>
</template>

<style scoped>
.timeline-ruler {
  position: relative;
  height: 24px;
  background: var(--color-bg-elevated, #1f2937);
  border-bottom: 1px solid var(--color-border-subtle, #374151);
  cursor: pointer;
  flex-shrink: 0;
}

.tick {
  position: absolute;
  top: 0;
  bottom: 0;
  border-left: 1px solid var(--color-border-subtle, #374151);
  pointer-events: none;
}

.tick-label {
  font-size: 9px;
  color: var(--color-text-muted, #6b7280);
  padding-left: 3px;
  line-height: 24px;
  display: block;
  white-space: nowrap;
}
</style>
