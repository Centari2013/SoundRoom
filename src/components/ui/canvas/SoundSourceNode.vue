<template>
  <v-group
    :x="source.instance.state.x"
    :y="source.instance.state.y"
    @mouseover="setCursor($event, 'pointer')"
    @mouseout="setCursor($event, 'default')"
    @dragmove="onSourceDragMove"
  >
    <!-- Outer Cone -->
    <v-wedge
      v-if="hasOuterCone"
      :angle="coneOuter"
      :rotation="(-coneOuter / 2) + source.instance.state.angle"
      :radius="50"
      fill="rgba(255, 100, 100, 0.05)"
      shadowColor="rgba(255, 100, 100, 0.7)"
      :shadowBlur="12"
    />

    <!-- Inner Cone -->
    <v-wedge
      v-if="hasInnerCone"
      :angle="coneInner"
      :rotation="(-coneInner / 2) + source.instance.state.angle"
      :radius="50"
      fill="rgba(255, 120, 120, 0.2)"
    />

    <!-- Source Dot -->
    <v-circle
      :radius="10"
      :fill="props.selected ? '#ff0' : '#f00'"
      name="sound-node-part"
      @mousedown="onSourceMouseDown"
      @mouseup="onSourceMouseUp"
    />

    <!-- Direction Diamond -->
    <v-shape
      v-if="hasCone"
      :sceneFunc="(ctx, shape) => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(7, 5);
        ctx.lineTo(0, 30);
        ctx.lineTo(-7, 5);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      }"
      :rotation="source.instance.state.angle - 90"
      fill="#fff"
      stroke="#000"
      :strokeWidth="1"
      @mousedown="onSourceMouseDown"
      @mouseup="onSourceMouseUp"
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
      @mouseup="onHandleMouseUp"
      name="sound-node-part"
    />
  </v-group>
</template>

<script setup>
import { computed } from 'vue'

// Props and emits
const props = defineProps({
  source: Object,
  actionManager: Object,
  room: Object,
  index: Number,
  selected: Boolean
})

const emit = defineEmits(['select'])

const source = props.source
const room = props.room
const actionManager = props.actionManager

// Cone visibility logic
const hasCone = computed(() =>
  source.instance.state.coneInner < 360 || source.instance.state.coneOuter < 360
)
const hasInnerCone = computed(() => source.instance.state.coneInner < 360)
const hasOuterCone = computed(() => source.instance.state.coneOuter < 360)

const coneInner = computed(() => source.instance.state.coneInner)
const coneOuter = computed(() => source.instance.state.coneOuter)

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
  emit('select', props.index)
  e.evt.stopPropagation()

  const stage = e.target.getStage()
  const mousePos = stage.getPointerPosition()
  mouseDownPos = { ...mousePos }
  isDragging = false

  const group = e.target.getParent()
  group.draggable(true)

  stage.on("mousemove.sourceDragDetect", () => {
    const currentPos = stage.getPointerPosition()
    const dx = currentPos.x - mouseDownPos.x
    const dy = currentPos.y - mouseDownPos.y

    if (!isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isDragging = true
      group.startDrag()
    }
  })

  stage.on("mouseup.sourceDragDetect", () => {
    stage.off("mousemove.sourceDragDetect")
    stage.off("mouseup.sourceDragDetect")

    if (!isDragging) {
      group.draggable(false)
    }

    onSourceMouseUp(e)
  })

  moveSourcePayload = {
    index: props.index,
    from: {
      x: source.instance.state.x,
      y: source.instance.state.y
    }
  }
}

function onSourceDragMove(e) {
  const pos = e.target.position()
  const clampedX = room.clamp(pos.x, 0, room.width)
  const clampedY = room.clamp(pos.y, 0, room.height)

  e.target.position({ x: clampedX, y: clampedY })

  source.instance.state.x = clampedX
  source.instance.state.y = clampedY
  source.instance.updateAudio()
}

// Source drop
function onSourceMouseUp(e) {
  const to = {
    x: source.instance.state.x,
    y: source.instance.state.y
  }

  if (moveSourcePayload && !positionsEqual(moveSourcePayload.from, to)) {
    moveSourcePayload.to = to
    actionManager.doAction("move_canvas_sound_source", moveSourcePayload)
  }

  moveSourcePayload = null
}

// Rotation interaction
function onHandleMouseDown(e) {
  emit('select', props.index)
  e.evt.stopPropagation()

  initialSourceAngle = source.instance.state.angle

  const stage = e.target.getStage()
  const mousePos = stage.getPointerPosition()
  const dx = mousePos.x - source.instance.state.x
  const dy = mousePos.y - source.instance.state.y
  initialMouseAngle = Math.atan2(dy, dx) * (180 / Math.PI)

  stage.on("mousemove.sourceRotate", onHandleMouseMove)
  stage.on("mouseup.sourceRotate", () => {
    onHandleMouseUp()
    stage.off("mousemove.sourceRotate")
    stage.off("mouseup.sourceRotate")
  })
}

function onHandleMouseMove(e) {
  const stage = e.target.getStage()
  const mousePos = stage.getPointerPosition()
  const dx = mousePos.x - source.instance.state.x
  const dy = mousePos.y - source.instance.state.y
  const currentMouseAngle = Math.atan2(dy, dx) * (180 / Math.PI)

  const delta = currentMouseAngle - initialMouseAngle
  const newAngle = initialSourceAngle + delta

  source.instance.state.angle = newAngle
  source.instance.updateAudio()
}

function onHandleMouseUp() {
  const finalSourceAngle = source.instance.state.angle

  if (initialSourceAngle !== null && initialSourceAngle !== finalSourceAngle) {
    actionManager.doAction("rotate_source_angle", {
      from: initialSourceAngle,
      to: finalSourceAngle
    })
  }

  initialSourceAngle = null
}
</script>
