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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
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

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
const isDarkMode = ref(prefersDark.matches)
const rootStyles = computed(() => (typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null))
const getVar = (name, fallback) => rootStyles.value?.getPropertyValue(name)?.trim() || fallback
const rgbaFromVar = (name, alpha, fallback) => {
  const rgbValue = rootStyles.value?.getPropertyValue(name)?.trim()
  return rgbValue ? `rgba(${rgbValue}, ${alpha})` : fallback
}

const syncTheme = (event) => {
  isDarkMode.value = event.matches
}

onMounted(() => prefersDark.addEventListener('change', syncTheme))
onBeforeUnmount(() => prefersDark.removeEventListener('change', syncTheme))

const sched = computed(() => props.source.instance.state.schedule)
const isScheduled = computed(() => sched.value?.enabled)
const isScheduledPlaying = computed(() => sched.value?.isPlaying)
const sourceIsPlaying = computed(() => props.source.instance.playing);

const lightPalette = computed(() => ({
  bg2: getVar('--lm-bg-2', '#dcdcdc'),
  nodeRed: getVar('--lm-node-red', '#d45a5a'),
  nodeBlue: getVar('--lm-node-blue', '#6c8edb'),
  coneRed: getVar('--lm-cone-red', 'rgba(212, 90, 90, 0.1)'),
  coneBlue: getVar('--lm-cone-blue', 'rgba(108, 142, 219, 0.12)'),
}))

const themeTokens = computed(() => ({
  primary: getVar('--sr-primary', '#2e90fa'),
  danger: getVar('--sr-accent-danger', '#f44336'),
  selected: getVar('--sr-accent-yellow', '#ffff00'),
  selectionHighlight: getVar('--sr-highlight-blue', '#6fd7ff'),
  mutedStroke: getVar('--sr-surface-muted', '#333333'),
  white: getVar('--sr-white', '#ffffff'),
}))

const getFillColor = computed(() => {
  if (isDarkMode.value) {
    if (props.selected) return themeTokens.value.selected
    return isScheduled.value ? themeTokens.value.primary : themeTokens.value.danger
  }
  const colors = lightPalette.value
  if (props.selected) return colors.bg2
  return isScheduled.value ? colors.nodeBlue : colors.nodeRed
})

const dotStrokeColor = computed(() => {
  if (isDarkMode.value) return props.selected ? themeTokens.value.white : rgbaFromVar('--sr-white-rgb', 0.9, 'rgba(255, 255, 255, 0.9)')
  return themeTokens.value.mutedStroke
})
const selectionGlowColor = computed(() => (isDarkMode.value
  ? themeTokens.value.selectionHighlight
  : rgbaFromVar('--sr-black-rgb', 0.05, 'rgba(0, 0, 0, 0.05)')))
const selectedScale = computed(() => (props.selected ? 1.05 : 1))

const outerConeFill = computed(() => {
  if (isDarkMode.value) return rgbaFromVar('--sr-dark-warm-red-rgb', 0.16, 'rgba(255, 137, 137, 0.16)')
  const colors = lightPalette.value
  return isScheduled.value ? colors.coneBlue : colors.coneRed
})
const outerConeStroke = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-dark-warm-red-rgb', 0.28, 'rgba(255, 137, 137, 0.28)')
  : (isScheduled.value
    ? rgbaFromVar('--sr-node-blue-rgb', 0.24, 'rgba(108, 142, 219, 0.24)')
    : rgbaFromVar('--sr-node-red-rgb', 0.2, 'rgba(212, 90, 90, 0.2)')))
const outerConeShadowColor = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-dark-bright-red-rgb', 0.65, 'rgba(255, 120, 120, 0.65)')
  : rgbaFromVar('--sr-black-rgb', 0.12, 'rgba(0, 0, 0, 0.12)'))
const outerConeShadowBlur = computed(() => isDarkMode.value ? 18 : 10)

const innerConeFill = computed(() => {
  if (isDarkMode.value) return rgbaFromVar('--sr-dark-soft-red-rgb', 0.18, 'rgba(255, 180, 180, 0.18)')
  const colors = lightPalette.value
  return isScheduled.value
    ? rgbaFromVar('--sr-node-blue-rgb', 0.18, 'rgba(108, 142, 219, 0.18)')
    : rgbaFromVar('--sr-node-red-rgb', 0.16, 'rgba(212, 90, 90, 0.16)')
})
const innerConeStroke = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-dark-soft-red-rgb', 0.35, 'rgba(255, 180, 180, 0.35)')
  : rgbaFromVar('--sr-black-rgb', 0.18, 'rgba(0, 0, 0, 0.18)'))

const selectionGlowOpacity = computed(() => isDarkMode.value ? 0.75 : 0.22)
const selectionGlowBlur = computed(() => isDarkMode.value ? 14 : 8)

const nodeShadowBlur = computed(() => isDarkMode.value ? 10 : 6)
const nodeShadowOpacity = computed(() => isDarkMode.value ? 0.65 : 0.08)

const directionGradientStops = computed(() => isDarkMode.value
  ? [0, rgbaFromVar('--sr-white-rgb', 0.95, 'rgba(255,255,255,0.95)'), 1, rgbaFromVar('--sr-white-rgb', 0.65, 'rgba(255,255,255,0.65)')]
  : [0, rgbaFromVar('--sr-white-rgb', 0.7, 'rgba(255,255,255,0.7)'), 1, rgbaFromVar('--sr-black-rgb', 0.12, 'rgba(0,0,0,0.12)')]
)
const directionStroke = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-black-rgb', 0.6, 'rgba(0, 0, 0, 0.6)')
  : themeTokens.value.mutedStroke)
const directionShadowColor = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-black-rgb', 0.35, 'rgba(0,0,0,0.35)')
  : rgbaFromVar('--sr-black-rgb', 0.12, 'rgba(0,0,0,0.12)'))



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
  const group = e.target.getParent()

  if (group) {
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

  initialSourceAngle = props.source.instance.state.angle

  const group = e.target.getParent()
  if (group) {
    group.draggable(false)
  }

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
