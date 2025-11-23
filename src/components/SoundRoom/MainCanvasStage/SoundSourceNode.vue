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
  bg2: getVar('--lm-bg-2', 'var(--sr-source-selected-bg)'),
  nodeRed: getVar('--lm-node-red', 'var(--sr-source-node-red)'),
  nodeBlue: getVar('--lm-node-blue', 'var(--sr-source-node-blue)'),
  coneRed: getVar('--lm-cone-red', 'var(--sr-source-cone-red)'),
  coneBlue: getVar('--lm-cone-blue', 'var(--sr-source-cone-blue)'),
}))

const themeTokens = computed(() => ({
  primary: getVar('--sr-primary', 'var(--sr-primary)'),
  danger: getVar('--sr-accent-danger', 'var(--sr-accent-danger)'),
  selected: getVar('--sr-accent-yellow', 'var(--sr-accent-yellow)'),
  selectionHighlight: getVar('--sr-highlight-blue', 'var(--sr-highlight-blue)'),
  mutedStroke: getVar('--sr-surface-muted', 'var(--sr-surface-muted)'),
  white: getVar('--sr-white', 'var(--sr-white)'),
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
  if (isDarkMode.value) return props.selected ? themeTokens.value.white : rgbaFromVar('--sr-white-rgb', 0.9, 'var(--sr-white-90)')
  return themeTokens.value.mutedStroke
})
const selectionGlowColor = computed(() => (isDarkMode.value
  ? themeTokens.value.selectionHighlight
  : rgbaFromVar('--sr-black-rgb', 0.05, 'var(--sr-source-selection-glow)')))
const selectedScale = computed(() => (props.selected ? 1.05 : 1))

const outerConeFill = computed(() => {
  if (isDarkMode.value) return rgbaFromVar('--sr-dark-warm-red-rgb', 0.16, 'var(--sr-dark-warm-red-16)')
  const colors = lightPalette.value
  return isScheduled.value ? colors.coneBlue : colors.coneRed
})
const outerConeStroke = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-dark-warm-red-rgb', 0.28, 'var(--sr-dark-warm-red-28)')
  : (isScheduled.value
    ? rgbaFromVar('--sr-node-blue-rgb', 0.24, 'var(--sr-node-blue-24)')
    : rgbaFromVar('--sr-node-red-rgb', 0.2, 'var(--sr-node-red-20)')))
const outerConeShadowColor = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-dark-bright-red-rgb', 0.65, 'var(--sr-dark-bright-red-65)')
  : rgbaFromVar('--sr-black-rgb', 0.12, 'var(--sr-black-12)'))
const outerConeShadowBlur = computed(() => isDarkMode.value ? 18 : 10)

const innerConeFill = computed(() => {
  if (isDarkMode.value) return rgbaFromVar('--sr-dark-soft-red-rgb', 0.18, 'var(--sr-dark-soft-red-18)')
  const colors = lightPalette.value
  return isScheduled.value
    ? rgbaFromVar('--sr-node-blue-rgb', 0.18, 'var(--sr-node-blue-18)')
    : rgbaFromVar('--sr-node-red-rgb', 0.16, 'var(--sr-node-red-16)')
})
const innerConeStroke = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-dark-soft-red-rgb', 0.35, 'var(--sr-dark-soft-red-35)')
  : rgbaFromVar('--sr-black-rgb', 0.18, 'var(--sr-black-18)'))

const selectionGlowOpacity = computed(() => isDarkMode.value ? 0.75 : 0.22)
const selectionGlowBlur = computed(() => isDarkMode.value ? 14 : 8)

const nodeShadowBlur = computed(() => isDarkMode.value ? 10 : 6)
const nodeShadowOpacity = computed(() => isDarkMode.value ? 0.65 : 0.08)

const directionGradientStops = computed(() => isDarkMode.value
  ? [0, rgbaFromVar('--sr-white-rgb', 0.95, 'var(--sr-white-95)'), 1, rgbaFromVar('--sr-white-rgb', 0.65, 'var(--sr-white-65)')]
  : [0, rgbaFromVar('--sr-white-rgb', 0.7, 'var(--sr-white-70)'), 1, rgbaFromVar('--sr-black-rgb', 0.12, 'var(--sr-black-12)')]
)
const directionStroke = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-black-rgb', 0.6, 'var(--sr-black-60)')
  : themeTokens.value.mutedStroke)
const directionShadowColor = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-black-rgb', 0.35, 'var(--sr-black-35)')
  : rgbaFromVar('--sr-black-rgb', 0.12, 'var(--sr-black-12)'))



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
