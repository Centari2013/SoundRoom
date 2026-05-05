<script setup>
import { computed } from 'vue'

const props = defineProps({
  clip: { type: Object, required: true },
  color: { type: String, required: true },
  pxPerSecond: { type: Number, required: true },
})

const emit = defineEmits(['dragstart', 'resizestart', 'delete'])

const style = computed(() => ({
  left: `${props.clip.startTime * props.pxPerSecond}px`,
  width: `${Math.max(props.clip.duration * props.pxPerSecond, 24)}px`,
  backgroundColor: props.color + '33',
  borderColor: props.color,
}))

function onMousedownClip(e) {
  if (e.button !== 0) return
  e.stopPropagation()
  emit('dragstart', { clip: props.clip, startX: e.clientX })
}

function onMousedownResize(e) {
  if (e.button !== 0) return
  e.stopPropagation()
  emit('resizestart', { clip: props.clip, startX: e.clientX })
}
</script>

<template>
  <div
    class="timeline-clip"
    :style="style"
    @mousedown="onMousedownClip"
  >
    <span class="clip-label">{{ clip._name }}</span>

    <button
      class="clip-delete"
      @mousedown.stop
      @click.stop="emit('delete', clip.id)"
      title="Remove clip"
    >×</button>

    <div class="clip-resize-handle" @mousedown="onMousedownResize" />
  </div>
</template>

<style scoped>
.timeline-clip {
  position: absolute;
  top: 4px;
  height: calc(100% - 8px);
  border: 1px solid;
  border-radius: 4px;
  cursor: grab;
  display: flex;
  align-items: center;
  overflow: hidden;
  user-select: none;
  box-sizing: border-box;
}

.timeline-clip:active {
  cursor: grabbing;
}

.clip-label {
  font-size: 10px;
  padding: 0 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  color: #e5e7eb;
  pointer-events: none;
}

.clip-delete {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  font-size: 12px;
  line-height: 1;
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  margin-right: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}

.timeline-clip:hover .clip-delete {
  opacity: 1;
}

.clip-resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  background: transparent;
}
</style>
