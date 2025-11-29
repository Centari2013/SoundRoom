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
      :shadowForStrokeEnabled="true"
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
      :shadowForStrokeEnabled="false"
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
      :outerRadius="45"
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

const isDarkMode = ref(document.documentElement.dataset.theme !== 'light')
let themeObserver = null
const rootStyles = computed(() => {
  // eslint-disable-next-line no-unused-expressions
  isDarkMode.value
  return typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null
})
const getVar = (name, fallback) => rootStyles.value?.getPropertyValue(name)?.trim() || fallback
const rgbaFromVar = (name, alpha, fallback) => {
  const rgbValue = rootStyles.value?.getPropertyValue(name)?.trim()
  return rgbValue ? `rgba(${rgbValue}, ${alpha})` : fallback
}

const syncTheme = () => {
  isDarkMode.value = document.documentElement.dataset.theme !== 'light'
}

onMounted(() => {
  syncTheme()
  themeObserver = new MutationObserver(syncTheme)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] })
})

onBeforeUnmount(() => themeObserver?.disconnect())

const sched = computed(() => props.source.instance.state.schedule)
const isScheduled = computed(() => sched.value?.enabled)
const isScheduledPlaying = computed(() => sched.value?.isPlaying)
const sourceIsPlaying = computed(() => props.source.instance.playing);

const lightPalette = computed(() => ({
  bg2: getVar('--color-bg-elevated', 'var(--color-bg-elevated)'),
  nodeRed: getVar('--color-node-red', 'var(--color-node-red)'),
  nodeBlue: getVar('--color-node-blue', 'var(--color-node-blue)'),
}))

const themeTokens = computed(() => ({
  primary: getVar('--color-accent', 'var(--color-accent)'),
  danger: getVar('--color-danger', 'var(--color-danger)'),
  selected: getVar('--color-selection-strong', 'var(--color-selection-strong)'),
  selectionHighlight: getVar('--color-node-highlight', 'var(--color-node-highlight)'),
  mutedStroke: getVar('--color-surface-muted', 'var(--color-surface-muted)'),
  white: getVar('--base-white', '#ffffff'),
}))

const getFillColor = computed(() => {
  if (isDarkMode.value) {
    if (props.selected) return themeTokens.value.selected
    return isScheduled.value ? themeTokens.value.primary : themeTokens.value.danger
  }
  const colors = lightPalette.value
  if (props.selected) return themeTokens.value.selectionHighlight
  return isScheduled.value ? colors.nodeBlue : colors.nodeRed
})

const dotStrokeColor = computed(() => {
  if (isDarkMode.value) return props.selected ? themeTokens.value.white : rgbaFromVar('--base-white-rgb', 0.9, 'rgba(var(--base-white-rgb), 0.9)')
  return themeTokens.value.mutedStroke
})
const selectionGlowColor = computed(() => (isDarkMode.value
  ? themeTokens.value.selectionHighlight
  : rgbaFromVar('--base-black-rgb', 0.05, 'rgba(var(--base-black-rgb), 0.05)')))
const selectedScale = computed(() => (props.selected ? 1.05 : 1))

const outerConeFill = computed(() => {
  if (isDarkMode.value) return rgbaFromVar('--color-danger-rgb', 0.16, 'rgba(var(--color-danger-rgb), 0.16)')
  return isScheduled.value
    ? rgbaFromVar('--color-node-blue-rgb', 0.14, 'rgba(var(--color-node-blue-rgb), 0.14)')
    : rgbaFromVar('--color-node-red-rgb', 0.12, 'rgba(var(--color-node-red-rgb), 0.12)')
})
const outerConeStroke = computed(() => isDarkMode.value
  ? rgbaFromVar('--color-danger-rgb', 0.28, 'rgba(var(--color-danger-rgb), 0.28)')
  : (isScheduled.value
    ? rgbaFromVar('--color-node-blue-rgb', 0.24, 'rgba(var(--color-node-blue-rgb), 0.24)')
    : rgbaFromVar('--color-node-red-rgb', 0.2, 'rgba(var(--color-node-red-rgb), 0.2)')))
const outerConeShadowColor = computed(() => isDarkMode.value
  ? rgbaFromVar('--color-danger-rgb', 0.65, 'rgba(var(--color-danger-rgb), 0.65)')
  : rgbaFromVar('--base-black-rgb', 0.12, 'rgba(var(--base-black-rgb), 0.12)'))
const outerConeShadowBlur = computed(() => isDarkMode.value ? 18 : 10)

const innerConeFill = computed(() => {
  if (isDarkMode.value) return rgbaFromVar('--color-danger-rgb', 0.18, 'rgba(var(--color-danger-rgb), 0.18)')
  const colors = lightPalette.value
  return isScheduled.value
    ? rgbaFromVar('--color-node-blue-rgb', 0.18, 'rgba(var(--color-node-blue-rgb), 0.18)')
    : rgbaFromVar('--color-node-red-rgb', 0.16, 'rgba(var(--color-node-red-rgb), 0.16)')
})
const innerConeStroke = computed(() => isDarkMode.value
  ? rgbaFromVar('--color-danger-rgb', 0.35, 'rgba(var(--color-danger-rgb), 0.35)')
  : rgbaFromVar('--base-black-rgb', 0.18, 'rgba(var(--base-black-rgb), 0.18)'))

const selectionGlowOpacity = computed(() => isDarkMode.value ? 0.75 : 0.22)
const selectionGlowBlur = computed(() => isDarkMode.value ? 14 : 8)

const nodeShadowBlur = computed(() => isDarkMode.value ? 10 : 6)
const nodeShadowOpacity = computed(() => isDarkMode.value ? 0.65 : 0.08)

const directionGradientStops = computed(() => isDarkMode.value
  ? [0, rgbaFromVar('--base-white-rgb', 0.95, 'rgba(var(--base-white-rgb),0.95)'), 1, rgbaFromVar('--base-white-rgb', 0.65, 'rgba(var(--base-white-rgb),0.65)')]
  : [0, rgbaFromVar('--base-white-rgb', 0.7, 'rgba(var(--base-white-rgb),0.7)'), 1, rgbaFromVar('--base-black-rgb', 0.12, 'rgba(var(--base-black-rgb),0.12)')]
)
const directionStroke = computed(() => isDarkMode.value
  ? rgbaFromVar('--base-black-rgb', 0.6, 'rgba(var(--base-black-rgb), 0.6)')
  : themeTokens.value.mutedStroke)
const directionShadowColor = computed(() => isDarkMode.value
  ? rgbaFromVar('--base-black-rgb', 0.35, 'rgba(var(--base-black-rgb),0.35)')
  : rgbaFromVar('--base-black-rgb', 0.12, 'rgba(var(--base-black-rgb),0.12)'))



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
