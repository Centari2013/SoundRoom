<script setup>
import { computed } from 'vue'
import TimelineClip from './TimelineClip.vue'

const props = defineProps({
  source: { type: Object, required: true },
  clips: { type: Array, required: true },
  color: { type: String, required: true },
  pxPerSecond: { type: Number, required: true },
  duration: { type: Number, required: true },
})

const emit = defineEmits(['clip-dragstart', 'clip-resizestart', 'clip-delete'])

// Attach the source name onto each clip so the clip label renders correctly
const annotatedClips = computed(() =>
  props.clips.map(c => ({ ...c, _name: props.source.name ?? 'Sound' }))
)

const trackWidth = computed(() => props.duration * props.pxPerSecond)
</script>

<template>
  <div class="timeline-track">
    <div class="track-label" :title="source.name">
      {{ source.name }}
    </div>
    <div class="track-lane" :style="{ width: trackWidth + 'px' }">
      <TimelineClip
        v-for="clip in annotatedClips"
        :key="clip.id"
        :clip="clip"
        :color="color"
        :pxPerSecond="pxPerSecond"
        @dragstart="emit('clip-dragstart', $event)"
        @resizestart="emit('clip-resizestart', $event)"
        @delete="emit('clip-delete', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.timeline-track {
  display: flex;
  height: 40px;
  border-bottom: 1px solid var(--color-border-subtle, #374151);
  width: max-content;
  min-width: 100%;
  flex-shrink: 0;
}

.track-label {
  width: 120px;
  min-width: 120px;
  padding: 0 10px;
  font-size: 11px;
  color: var(--color-text-muted, #9ca3af);
  display: flex;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-right: 1px solid var(--color-border-subtle, #374151);
  background: var(--color-bg-surface, #111827);
  flex-shrink: 0;
}

.track-lane {
  position: relative;
  flex: 0 0 auto;
  background: var(--color-bg-elevated, #1f2937);
  overflow: hidden;
}
</style>
