<template>
  <v-group
    :x="source.instance.state.x"
    :y="source.instance.state.y"
    @dragmove="onSourceDragMove"
    :scaleX="selectedScale"
    :scaleY="selectedScale"
  >
    <!-- Outer Cone -->
    <v-wedge
      v-if="hasOuterCone"
      :angle="coneOuter"
      :rotation="(-coneOuter / 2) + source.instance.state.angle"
      :radius="50"
      :fill="outerConeFill"
      :stroke="outerConeStroke"
      :strokeWidth="1.5"
      :shadowColor="outerConeShadowColor"
      :shadowBlur="outerConeShadowBlur"
      :listening="false"
    />

    <!-- Inner Cone -->
    <v-wedge
      v-if="hasInnerCone"
      :angle="coneInner"
      :rotation="(-coneInner / 2) + source.instance.state.angle"
      :radius="50"
      :fill="innerConeFill"
      :stroke="innerConeStroke"
      :strokeWidth="1"
      :listening="false"
    />

    <!-- Source Dot -->
    <v-circle
      v-if="props.selected"
      :radius="16"
      :stroke="selectionGlowColor"
      :strokeWidth="3"
      :opacity="selectionGlowOpacity"
      shadowForStrokeEnabled="true"
      :shadowColor="selectionGlowColor"
      :shadowBlur="selectionGlowBlur"
      :listening="false"
    />
    <v-circle
      :radius="10"
      :fill="getFillColor"
      :stroke="dotStrokeColor"
      :strokeWidth="2"
      :shadowColor="getFillColor"
      :shadowBlur="nodeShadowBlur"
      :shadowOpacity="nodeShadowOpacity"
      shadowForStrokeEnabled="false"
      name="sound-node-part"
      @mousedown="onSourceMouseDown"
      @mouseup="onSourceMouseUp"
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
      :fillLinearGradientStartPoint="{ x: 0, y: 0 }"
      :fillLinearGradientEndPoint="{ x: 0, y: 25 }"
      :fillLinearGradientColorStops="directionGradientStops"
      :stroke="directionStroke"
      :strokeWidth="1.25"
      :shadowColor="directionShadowColor"
      :shadowBlur="4"
      @mousedown="onSourceMouseDown"
      @mouseup="onSourceMouseUp"
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
      @mouseup="onHandleMouseUp"
      @mouseover="setCursor($event, 'pointer')"
      @mouseout="setCursor($event, 'default')"
      name="sound-node-part"
    />
  </v-group>
</template>

<script setup>
import { computed, ref } from 'vue'
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

const rootStyles = computed(() => (typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null))
const getVar = (name, fallback) => rootStyles.value?.getPropertyValue(name)?.trim() || fallback
const rgbaFromVar = (name, alpha, fallback) => {
  const rgbValue = rootStyles.value?.getPropertyValue(name)?.trim()
  return rgbValue ? `rgba(${rgbValue}, ${alpha})` : fallback
}

const sched = computed(() => props.source.instance.state.schedule)
const isScheduled = computed(() => sched.value?.enabled)
const isScheduledPlaying = computed(() => sched.value?.isPlaying)
const sourceIsPlaying = computed(() => props.source.instance.playing);

const palette = computed(() => ({
  surface: getVar('--sr-bg-2', '#dcdcdc'),
  nodeRed: getVar('--sr-node-red', '#d45a5a'),
  nodeBlue: getVar('--sr-node-blue', '#6c8edb'),
  coneRed: getVar('--sr-cone-red', 'rgba(212, 90, 90, 0.1)'),
  coneBlue: getVar('--sr-cone-blue', 'rgba(108, 142, 219, 0.12)'),
  primary: getVar('--sr-primary', '#2e90fa'),
  danger: getVar('--sr-danger', '#f44336'),
  selectionHighlight: getVar('--sr-selection-glow', '#6fd7ff'),
  outline: getVar('--sr-outline-contrast', '#111827'),
  white: getVar('--sr-white', '#ffffff'),
}))

const getFillColor = computed(() => {
  if (props.selected) return palette.value.surface
  return isScheduled.value ? palette.value.nodeBlue : palette.value.nodeRed
})

const dotStrokeColor = computed(() => (props.selected
  ? palette.value.white
  : palette.value.outline))
const selectionGlowColor = computed(() => palette.value.selectionHighlight)
const selectedScale = computed(() => (props.selected ? 1.05 : 1))

const outerConeFill = computed(() => (isScheduled.value ? palette.value.coneBlue : palette.value.coneRed))
const outerConeStroke = computed(() => (isScheduled.value
  ? rgbaFromVar('--sr-node-blue-rgb', 0.24, 'rgba(108, 142, 219, 0.24)')
  : rgbaFromVar('--sr-node-red-rgb', 0.2, 'rgba(212, 90, 90, 0.2)')))
const outerConeShadowColor = computed(() => (isScheduled.value
  ? rgbaFromVar('--sr-node-blue-rgb', 0.45, 'rgba(108, 142, 219, 0.45)')
  : rgbaFromVar('--sr-node-red-rgb', 0.45, 'rgba(212, 90, 90, 0.45)')))
const outerConeShadowBlur = computed(() => parseFloat(getVar('--sr-node-shadow-blur', '10')) || 10)

const innerConeFill = computed(() => (isScheduled.value
  ? rgbaFromVar('--sr-node-blue-rgb', 0.18, 'rgba(108, 142, 219, 0.18)')
  : rgbaFromVar('--sr-node-red-rgb', 0.16, 'rgba(212, 90, 90, 0.16)')))
const innerConeStroke = computed(() => rgbaFromVar('--sr-outline-contrast-rgb', 0.18, 'rgba(17, 24, 39, 0.18)'))

const selectionGlowOpacity = computed(() => parseFloat(getVar('--sr-selection-glow-opacity', '0.38')) || 0.38)
const selectionGlowBlur = computed(() => parseFloat(getVar('--sr-selection-glow-blur', '10')) || 10)

const nodeShadowBlur = computed(() => parseFloat(getVar('--sr-node-shadow-blur', '8')) || 8)
const nodeShadowOpacity = computed(() => parseFloat(getVar('--sr-node-shadow-opacity', '0.18')) || 0.18)

const directionGradientStops = computed(() => [
  0,
  rgbaFromVar('--sr-white-rgb', 0.7, 'rgba(255,255,255,0.7)'),
  1,
  rgbaFromVar('--sr-black-rgb', 0.12, 'rgba(0,0,0,0.12)')
])
const directionStroke = computed(() => palette.value.outline)
const directionShadowColor = computed(() => rgbaFromVar('--sr-black-rgb', 0.12, 'rgba(0,0,0,0.12)'))



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
  const group = e.target?.getParent?.()
  if (group?.draggable()) {
    group.draggable(false)
  }

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

  const group = e.target.getParent()
  if (group?.draggable()) {
    group.stopDrag()
    group.draggable(false)
  }

  initialSourceAngle = props.source.instance.state.angle

  const stage = e.target.getStage()
  const mousePos = stage.getPointerPosition()
  const dx = mousePos.x - props.source.instance.state.x
  const dy = mousePos.y - props.source.instance.state.y
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
