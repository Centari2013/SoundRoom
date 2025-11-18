<template>
  <v-group
    :x="source.instance.state.x"
    :y="source.instance.state.y"
    @dragmove="onSourceDragMove"
  >
    <!-- Outer Cone -->
    <v-wedge
      v-if="hasOuterCone"
      :angle="coneOuter"
      :rotation="(-coneOuter / 2) + source.instance.state.angle"
      :radius="50"
      fill="rgba(255, 100, 100, 0.2)"
      shadowColor="rgba(255, 100, 100, 0.7)"
      :shadowBlur="12"
      :listening="false"
    />

    <!-- Inner Cone -->
    <v-wedge
      v-if="hasInnerCone"
      :angle="coneInner"
      :rotation="(-coneInner / 2) + source.instance.state.angle"
      :radius="50"
      fill="rgba(255, 120, 120, 0.2)"
      :listening="false"
    />

    <!-- Source Dot -->
    <v-circle
      :radius="10"
      :fill="getFillColor"
      name="sound-node-part"
      @mousedown="onSourceMouseDown"
      @touchstart="onSourceMouseDown"
      @mouseup="onSourceMouseUp"
      @touchend="onSourceMouseUp"
      @mouseover="setCursor($event, 'pointer')"
      @mouseout="setCursor($event, 'default')"
    />

    <ScheduledPlayRing
      v-if="true"
      :playing="sourceIsPlaying"
      :scheduled="isScheduled"
    />



    <!-- Direction Diamond -->
    <v-shape
      v-if="hasCone"
      :sceneFunc="(ctx, shape) => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(7, 5);
        ctx.lineTo(0, 25);
        ctx.lineTo(-7, 5);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      }"
      :rotation="source.instance.state.angle - 90"
      fill="#fff"
      stroke="#000"
      :strokeWidth="1"
      @mousedown="onSourceMouseDown"
      @touchstart="onSourceMouseDown"
      @mouseup="onSourceMouseUp"
      @touchend="onSourceMouseUp"
      @mouseover="setCursor($event, 'pointer')"
      @mouseout="setCursor($event, 'default')"
      name="sound-node-part"
    />

    <!-- Rotation Hitbox -->
    <v-arc
      v-if="hasCone"
      :x="Math.cos(toRad(source.instance.state.angle)) * 7"
      :y="Math.sin(toRad(source.instance.state.angle)) * 7"
      :innerRadius="0"
      :outerRadius="25"
      :angle="135"
      :rotation="source.instance.state.angle - 90 + 20"
      fill="transparent"
      @mousedown="onHandleMouseDown"
      @touchstart="onHandleMouseDown"
      @mouseup="onHandleMouseUp"
      @touchend="onHandleMouseUp"
      @mouseover="setCursor($event, 'pointer')"
      @mouseout="setCursor($event, 'default')"
      name="sound-node-part"
    />
  </v-group>
</template>

<script setup>
import { computed } from 'vue'
import { useRoomStore } from '@/stores/useRoomStore'
import { useActionManagerStore } from '@/stores/useActionManagerStore'
import { storeToRefs } from 'pinia'
import ScheduledPlayRing from '@/components/SoundRoom/MainCanvasStage/ScheduledPlayRing.vue'

// Props and emits
const props = defineProps({
  source: Object,
  index: Number,
  selected: Boolean
})

const { room } = storeToRefs(useRoomStore())
const { actionManager } = storeToRefs(useActionManagerStore())
const emit = defineEmits(['select'])

const sched = computed(() => props.source.instance.state.schedule)
const isScheduled = computed(() => sched.value?.enabled)
const isScheduledPlaying = computed(() => sched.value?.isPlaying)
const sourceIsPlaying = computed(() => props.source.instance.playing);

const getFillColor = computed(() => {
  if (props.selected) return '#ff0' // Yellow for selected node
  return isScheduled.value ? '#2e90fa' : '#f44336' // Red for unscheduled/looping
})



// Cone visibility logic
const hasCone = computed(() =>
  props.source.instance.state.coneInner < 360 || props.source.instance.state.coneOuter < 360
)
const hasInnerCone = computed(() => props.source.instance.state.coneInner < 360)
const hasOuterCone = computed(() => props.source.instance.state.coneOuter < 360)

const coneInner = computed(() => props.source.instance.state.coneInner)
const coneOuter = computed(() => props.source.instance.state.coneOuter)

// Utility functions
function toRad(deg) {
  return deg * (Math.PI / 180)
}

function positionsEqual(a, b) {
  return a.x === b.x && a.y === b.y
}

// Cursor styling
function setCursor(e, type) {
  const stage = e.target.getStage()
  if (stage) {
    stage.container().style.cursor = type
  }
}

// Internal state
let mouseDownPos = null
let isDragging = false
let moveSourcePayload = null
let initialMouseAngle = null
let initialSourceAngle = null

// Source dragging
function onSourceMouseDown(e) {
  emit('select', props.index) // select current SoundSourceNode to display in SelectSourcePanel.vue
  e.evt.stopPropagation()
  e.evt.preventDefault()

  const stage = e.target.getStage()
  const mousePos = stage.getPointerPosition()
  mouseDownPos = { ...mousePos }
  isDragging = false

  const group = e.target.getParent()
  group.draggable(true)

  // Listen for both mouse and touch move events so dragging works on touchscreens
  const moveEvents = ["mousemove", "touchmove"]
  const upEvents = ["mouseup", "touchend"]

  const handleDragDetect = () => {
    const currentPos = stage.getPointerPosition()
    const dx = currentPos.x - mouseDownPos.x
    const dy = currentPos.y - mouseDownPos.y

    if (!isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isDragging = true
      group.startDrag()
    }
  }

  moveEvents.forEach(evt => stage.on(`${evt}.sourceDragDetect`, handleDragDetect))

  const handlePointerUp = (evt) => {
    moveEvents.forEach(eventName => stage.off(`${eventName}.sourceDragDetect`))
    upEvents.forEach(eventName => stage.off(`${eventName}.sourceDragDetect`))

    if (!isDragging) {
      group.draggable(false)
    }

    onSourceMouseUp(evt)
  }

  upEvents.forEach(evt => stage.on(`${evt}.sourceDragDetect`, handlePointerUp))

  moveSourcePayload = {
    index: props.index,
    from: {
      x: props.source.instance.state.x,
      y: props.source.instance.state.y
    }
  }
}

function onSourceDragMove(e) {
  const pos = e.target.position()
  const clampedX = room.value.clamp(pos.x, 0, room.value.width)
  const clampedY = room.value.clamp(pos.y, 0, room.value.height)

  e.target.position({ x: clampedX, y: clampedY })

  props.source.instance.state.x = clampedX
  props.source.instance.state.y = clampedY
  props.source.instance.updateAudio()
}

// Source drop
function onSourceMouseUp(e) {
  const to = {
    x: props.source.instance.state.x,
    y: props.source.instance.state.y
  }

  if (moveSourcePayload && !positionsEqual(moveSourcePayload.from, to)) {
    moveSourcePayload.to = to
    actionManager.value.doAction("move_canvas_sound_source", moveSourcePayload)
  }

  moveSourcePayload = null
}

// Rotation interaction
function onHandleMouseDown(e) {
  emit('select', props.index)
  e.evt.stopPropagation()
  e.evt.preventDefault()

  initialSourceAngle = props.source.instance.state.angle

  const stage = e.target.getStage()
  const mousePos = stage.getPointerPosition()
  const dx = mousePos.x - props.source.instance.state.x
  const dy = mousePos.y - props.source.instance.state.y
  initialMouseAngle = Math.atan2(dy, dx) * (180 / Math.PI)

  const moveEvents = ["mousemove", "touchmove"]
  const upEvents = ["mouseup", "touchend"]

  moveEvents.forEach(evt => stage.on(`${evt}.sourceRotate`, onHandleMouseMove))
  const stopRotate = () => {
    onHandleMouseUp()
    moveEvents.forEach(evt => stage.off(`${evt}.sourceRotate`))
    upEvents.forEach(evt => stage.off(`${evt}.sourceRotate`))
  }
  upEvents.forEach(evt => stage.on(`${evt}.sourceRotate`, stopRotate))
}

function onHandleMouseMove(e) {
  const stage = e.target.getStage()
  const mousePos = stage.getPointerPosition()
  const dx = mousePos.x - props.source.instance.state.x
  const dy = mousePos.y - props.source.instance.state.y
  const currentMouseAngle = Math.atan2(dy, dx) * (180 / Math.PI)

  const delta = currentMouseAngle - initialMouseAngle
  const newAngle = initialSourceAngle + delta

  props.source.instance.state.angle = newAngle
  props.source.instance.updateAudio()
}

function onHandleMouseUp() {
  const finalSourceAngle = props.source.instance.state.angle

  if (initialSourceAngle !== null && initialSourceAngle !== finalSourceAngle) {
    actionManager.value.doAction("rotate_source_angle", {
      from: initialSourceAngle,
      to: finalSourceAngle
    })
  }

  initialSourceAngle = null
}

</script>
