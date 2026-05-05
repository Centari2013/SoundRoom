<script setup>
import { computed, ref, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAudioEngineStore } from '@/stores/useAudioEngineStore'
import TimelineRuler from './TimelineRuler.vue'
import TimelineTrack from './TimelineTrack.vue'

// ── Store ────────────────────────────────────────────────────────────
const store = useAudioEngineStore()
const { audioEngine } = storeToRefs(store)

const timeline = computed(() => audioEngine.value?.timeline)
const scheduler = computed(() => audioEngine.value?.timelineScheduler)
const isRunning = computed(() => scheduler.value?.isRunning.value ?? false)
const currentTime = computed(() => scheduler.value?.currentTime.value ?? 0)

// ── Zoom ─────────────────────────────────────────────────────────────
const pxPerSecond = ref(20)
const ZOOM_MIN = 5
const ZOOM_MAX = 100

function zoomIn() { pxPerSecond.value = Math.min(pxPerSecond.value * 1.5, ZOOM_MAX) }
function zoomOut() { pxPerSecond.value = Math.max(pxPerSecond.value / 1.5, ZOOM_MIN) }

// ── Tracks ────────────────────────────────────────────────────────────
// Group clips by sourceId, then resolve the matching SoundSource wrapper.
const tracks = computed(() => {
  if (!timeline.value || !audioEngine.value) return []
  const sources = audioEngine.value.soundSources.value
  const bySource = new Map()

  for (const clip of timeline.value.clips) {
    if (!bySource.has(clip.sourceId)) bySource.set(clip.sourceId, [])
    bySource.get(clip.sourceId).push(clip)
  }

  return [...bySource.entries()].map(([sourceId, clips]) => {
    const src = sources.find(s => s.instance?.state?.schedule?.id === sourceId)
    return src ? { source: src, clips } : null
  }).filter(Boolean)
})

// ── Clip colors ───────────────────────────────────────────────────────
const COLORS = ['#4ade80', '#60a5fa', '#f472b6', '#fb923c', '#a78bfa', '#34d399', '#f87171', '#facc15']
function colorFor(sourceId) {
  let h = 0
  for (let i = 0; i < sourceId.length; i++) h = (h * 31 + sourceId.charCodeAt(i)) >>> 0
  return COLORS[h % COLORS.length]
}

// ── Playhead ─────────────────────────────────────────────────────────
const scrollEl = ref(null)
const playheadX = computed(() => {
  const scrollLeft = scrollEl.value?.scrollLeft ?? 0
  return 120 + currentTime.value * pxPerSecond.value - scrollLeft
})

// ── Seek via ruler ────────────────────────────────────────────────────
function onSeek(seconds) {
  store.seekTimeline(Math.max(0, Math.min(seconds, timeline.value.duration)))
}

// ── Duration input ────────────────────────────────────────────────────
function onDurationInput(e) {
  const v = parseFloat(e.target.value)
  if (Number.isFinite(v) && v >= 10) store.setTimelineDuration(v)
}

// ── Playback controls ─────────────────────────────────────────────────
function togglePlay() {
  if (isRunning.value) {
    store.pauseTimeline()
  } else {
    store.playTimeline()
  }
}

function stop() {
  store.stopTimeline()
}

// ── Drag / resize clips ───────────────────────────────────────────────
const dragState = ref(null) // { clip, startX, originalStart }
const resizeState = ref(null) // { clip, startX, originalDuration }

function onClipDragStart({ clip, startX }) {
  dragState.value = { clip, startX, originalStart: clip.startTime }
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
}

function onDragMove(e) {
  if (!dragState.value) return
  const { clip, startX, originalStart } = dragState.value
  const dx = e.clientX - startX
  const newStart = Math.max(0, originalStart + dx / pxPerSecond.value)
  store.updateTimelineClip(clip.id, { startTime: newStart })
}

function onDragEnd() {
  dragState.value = null
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
}

function onClipResizeStart({ clip, startX }) {
  resizeState.value = { clip, startX, originalDuration: clip.duration }
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
}

function onResizeMove(e) {
  if (!resizeState.value) return
  const { clip, startX, originalDuration } = resizeState.value
  const dx = e.clientX - startX
  const newDuration = Math.max(0.5, originalDuration + dx / pxPerSecond.value)
  store.updateTimelineClip(clip.id, { duration: newDuration })
}

function onResizeEnd() {
  resizeState.value = null
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
}

function onClipDelete(clipId) {
  store.removeTimelineClip(clipId)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
})
</script>

<template>
  <div class="timeline-panel" v-if="timeline">
    <!-- Header ─────────────────────────────────────────── -->
    <div class="tl-header">
      <span class="tl-title">Timeline</span>

      <button class="tl-btn" @click="togglePlay" :title="isRunning ? 'Pause' : 'Play'">
        {{ isRunning ? '⏸' : '▶' }}
      </button>
      <button class="tl-btn" @click="stop" title="Stop">⏹</button>

      <span class="tl-time">{{ currentTime.toFixed(1) }}s</span>

      <label class="tl-label">
        Duration
        <input
          class="tl-duration-input"
          type="number"
          min="10"
          step="10"
          :value="timeline.duration"
          @change="onDurationInput"
        />s
      </label>

      <label class="tl-label tl-loop">
        <input type="checkbox" :checked="timeline.loop" @change="e => store.setTimelineLoop(e.target.checked)" />
        Loop
      </label>

      <div class="tl-zoom">
        <button class="tl-btn" @click="zoomOut" title="Zoom out">−</button>
        <button class="tl-btn" @click="zoomIn" title="Zoom in">+</button>
      </div>
    </div>

    <!-- Scroll area ─────────────────────────────────────── -->
    <div class="tl-scroll" ref="scrollEl">
      <!-- Label gutter spacer above ruler -->
      <div class="tl-ruler-row">
        <div class="tl-label-gutter" />
        <TimelineRuler
          :duration="timeline.duration"
          :pxPerSecond="pxPerSecond"
          @seek="onSeek"
        />
      </div>

      <!-- Tracks -->
      <div class="tl-tracks">
        <TimelineTrack
          v-for="track in tracks"
          :key="track.source.instance.state.schedule.id"
          :source="track.source"
          :clips="track.clips"
          :color="colorFor(track.source.instance.state.schedule.id)"
          :pxPerSecond="pxPerSecond"
          :duration="timeline.duration"
          @clip-dragstart="onClipDragStart"
          @clip-resizestart="onClipResizeStart"
          @clip-delete="onClipDelete"
        />

        <div v-if="tracks.length === 0" class="tl-empty">
          Select a source and click "Add to Timeline" to place it here.
        </div>
      </div>

      <!-- Playhead -->
      <div
        class="tl-playhead"
        :style="{ left: playheadX + 'px' }"
        v-if="currentTime > 0 || isRunning"
      />
    </div>
  </div>
</template>

<style scoped>
.timeline-panel {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-surface, #111827);
  border-top: 1px solid var(--color-border-subtle, #374151);
  height: 200px;
  overflow: hidden;
  flex-shrink: 0;
}

/* Header */
.tl-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 36px;
  border-bottom: 1px solid var(--color-border-subtle, #374151);
  flex-shrink: 0;
  background: var(--color-bg-elevated, #1f2937);
}

.tl-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-right: 4px;
}

.tl-btn {
  background: transparent;
  border: none;
  color: var(--color-text-primary, #f9fafb);
  cursor: pointer;
  font-size: 13px;
  padding: 2px 6px;
  border-radius: 3px;
  line-height: 1;
}
.tl-btn:hover { background: var(--color-bg-surface, #111827); }

.tl-time {
  font-size: 11px;
  color: var(--color-text-muted, #9ca3af);
  min-width: 36px;
  font-variant-numeric: tabular-nums;
}

.tl-label {
  font-size: 11px;
  color: var(--color-text-muted, #9ca3af);
  display: flex;
  align-items: center;
  gap: 4px;
}

.tl-duration-input {
  width: 52px;
  background: var(--color-bg-surface, #111827);
  border: 1px solid var(--color-border-subtle, #374151);
  border-radius: 3px;
  color: var(--color-text-primary, #f9fafb);
  font-size: 11px;
  padding: 1px 4px;
  text-align: right;
}

.tl-loop { margin-left: 4px; cursor: pointer; }
.tl-loop input { cursor: pointer; }

.tl-zoom {
  margin-left: auto;
  display: flex;
  gap: 2px;
}

/* Scroll area */
.tl-scroll {
  flex: 1;
  overflow-x: auto;
  overflow-y: auto;
  position: relative;
  display: flex;
  flex-direction: column;
}

.tl-ruler-row {
  display: flex;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 2;
}

.tl-label-gutter {
  width: 120px;
  min-width: 120px;
  background: var(--color-bg-surface, #111827);
  border-right: 1px solid var(--color-border-subtle, #374151);
  border-bottom: 1px solid var(--color-border-subtle, #374151);
  flex-shrink: 0;
}

.tl-tracks {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tl-empty {
  padding: 16px 140px;
  font-size: 11px;
  color: var(--color-text-muted, #6b7280);
}

/* Playhead */
.tl-playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: #f9fafb;
  pointer-events: none;
  z-index: 10;
  opacity: 0.7;
}
</style>
