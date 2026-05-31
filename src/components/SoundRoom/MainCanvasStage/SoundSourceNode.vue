<template>
  <v-group
    ref="sourceGroup"
    name="sound-source-node"
    :x="source.instance.state.x"
    :y="source.instance.state.y"
    @dragmove="onSourceDragMove"
    :scaleX="selectedScale"
    :scaleY="selectedScale"
    :opacity="nodeOpacity"
    :title="isLocked ? lockTooltip : undefined"
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
      :fill="isTimelineAndSurround ? undefined : getFillColor"
      :fillLinearGradientStartPoint="isTimelineAndSurround ? { x: -10, y: 0 } : undefined"
      :fillLinearGradientEndPoint="isTimelineAndSurround ? { x: 10, y: 0 } : undefined"
      :fillLinearGradientColorStops="isTimelineAndSurround ? [0, TIMELINE_NODE_COLOR, 1, SURROUND_NODE_COLOR] : undefined"
      :stroke="dotStrokeColor"
      :strokeWidth="2"
      :shadowColor="getFillColor"
      :shadowBlur="nodeShadowBlur"
      :shadowOpacity="nodeShadowOpacity"
      :shadowForStrokeEnabled="false"
      name="sound-node-part"
      @mousedown="onSourceMouseDown"
      @mouseup="onSourceMouseUp"
      @touchstart="onSourceMouseDown"
      @touchend="onSourceMouseUp"
      @mouseover="setCursor($event, 'pointer')"
      @mouseout="setCursor($event, 'default')"
    />


    <ScheduledPlayRing
      v-if="true"
      :playing="sourceIsPlaying"
      :scheduled="isScheduled"
    />

    <!-- Surround ring: dashed circle indicating omnidirectional radiation -->
    <v-circle
      v-if="isSurround"
      :radius="28"
      fill="transparent"
      :stroke="surroundRingColor"
      :strokeWidth="1.5"
      :dash="[4, 3]"
      :listening="false"
    />

    <!-- Timeline badge: small amber dot above-right the node -->
    <v-circle
      v-if="isOnTimeline"
      :x="8"
      :y="-12"
      :radius="4"
      :fill="TIMELINE_NODE_COLOR"
      :stroke="'#78350f'"
      :strokeWidth="1"
      :listening="false"
    />

    <!-- Surround badge: small purple dot above-left the node -->
    <v-circle
      v-if="isSurround"
      :x="-8"
      :y="-12"
      :radius="4"
      :fill="SURROUND_NODE_COLOR"
      :stroke="'#6b21a8'"
      :strokeWidth="1"
      :listening="false"
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
      @touchstart="onSourceMouseDown"
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
      :outerRadius="45"
      :angle="135"
      :rotation="source.instance.state.angle - 90 + 20"
      fill="transparent"
      @mousedown="onHandleMouseDown"
      @mouseup="onHandleMouseUp"
      @touchstart="onHandleMouseDown"
      @touchend="onHandleMouseUp"
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
import { useAudioEngineStore } from '@/stores/useAudioEngineStore'
import { storeToRefs } from 'pinia'
import ScheduledPlayRing from '@/components/SoundRoom/MainCanvasStage/ScheduledPlayRing.vue'
import { useKonvaThemeRedraw } from '@/composables/useKonvaTheme'
import { useThemeStore } from '@/stores/useThemeStore'

const props = defineProps({
  source: Object,
  index: Number,
  selected: Boolean
})

const { room } = storeToRefs(useRoomStore())
const { actionManager } = storeToRefs(useActionManagerStore())
const engineStore = useAudioEngineStore()

const isOnTimeline = computed(() => {
  const sourceId = props.source?.instance?.state?.schedule?.id
  if (!sourceId || !engineStore.audioEngine) return false
  return engineStore.audioEngine.isSourceOnTimeline(sourceId)
})
const emit = defineEmits(['select'])
const themeStore = useThemeStore()

const isDarkMode = computed(() => themeStore.activeTheme !== 'light')
const sourceGroup = ref(null)
const { themeVersion } = useKonvaThemeRedraw(() => {
  const node = sourceGroup.value?.getNode()
  node?.clearCache?.()
  node?.getLayer?.()?.batchDraw()
})
const rootStyles = computed(() => {
  themeVersion.value
  return typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null
})
const getVar = (name, fallback) => rootStyles.value?.getPropertyValue(name)?.trim() || fallback
const rgbaFromVar = (name, alpha, fallback) => {
  const rgbValue = rootStyles.value?.getPropertyValue(name)?.trim()
  return rgbValue ? `rgba(${rgbValue}, ${alpha})` : fallback
}

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

const TIMELINE_NODE_COLOR = '#f59e0b' // amber-400
const SURROUND_NODE_COLOR = '#a855f7' // purple-500

const isSurround = computed(() => !!props.source.instance.state.surround)
const isTimelineAndSurround = computed(() => isOnTimeline.value && isSurround.value)

const surroundRingColor = computed(() =>
  rgbaFromVar('--color-node-surround-rgb', 0.45, 'rgba(168, 85, 247, 0.45)')
)

const getFillColor = computed(() => {
  if (isSurround.value && !isOnTimeline.value) return SURROUND_NODE_COLOR
  if (isOnTimeline.value && !isSurround.value) return TIMELINE_NODE_COLOR
  if (isTimelineAndSurround.value) return SURROUND_NODE_COLOR // gradient handles display; this is for shadow
  if (isDarkMode.value) {
    if (props.selected) return themeTokens.value.selected
    return isScheduled.value ? themeTokens.value.primary : themeTokens.value.danger
  }
  const colors = lightPalette.value
  if (props.selected) return themeTokens.value.selectionHighlight
  return isScheduled.value ? colors.nodeBlue : colors.nodeRed
})

const isLocked = computed(() => !!props.source?.locked)
const nodeOpacity = computed(() => (isLocked.value ? 0.5 : 1))
const lockTooltip = 'Available on Pro tier.'

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



// Cone visibility logic: hide directional cones when surround mode is active
const hasCone = computed(() =>
  !isSurround.value &&
  (props.source.instance.state.coneInner < 360 || props.source.instance.state.coneOuter < 360)
)
const hasInnerCone = computed(() => !isSurround.value && props.source.instance.state.coneInner < 360)
const hasOuterCone = computed(() => !isSurround.value && props.source.instance.state.coneOuter < 360)

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
  const isTouch = e.evt?.type === 'touchstart'

  if (isLocked.value) {
    emit('select', props.index)
    e.evt?.stopPropagation?.()
    return
  }

  // Mouse: select immediately so desktop highlights on mousedown.
  // Touch: defer select to touchend — if we emitted here, the bottom sheet
  // would open instantly and block the canvas before the drag threshold is met.
  if (!isTouch) {
    emit('select', props.index)
  }

  e.evt?.stopPropagation?.()
  e.evt?.preventDefault?.() // prevent scroll during touch drag

  const stage = e.target.getStage()
  const mousePos = stage.getPointerPosition()
  mouseDownPos = { ...mousePos }
  isDragging = false

  const group = e.target.getParent()
  group.draggable(true)

  stage.on("mousemove.sourceDragDetect touchmove.sourceDragDetect", () => {
    const currentPos = stage.getPointerPosition()
    const dx = currentPos.x - mouseDownPos.x
    const dy = currentPos.y - mouseDownPos.y

    if (!isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isDragging = true
      group.startDrag()
    }
  })

  stage.on("mouseup.sourceDragDetect touchend.sourceDragDetect", () => {
    stage.off("mousemove.sourceDragDetect touchmove.sourceDragDetect")
    stage.off("mouseup.sourceDragDetect touchend.sourceDragDetect")

    if (!isDragging) {
      group.draggable(false)
      // Touch tap (no drag): now it's safe to select and open the sheet.
      if (isTouch) emit('select', props.index)
    }
    // Touch drag end: don't select — user was positioning, not tapping.

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
  if (isLocked.value) {
    e.target?.draggable(false)
    return
  }
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
  const isTouch = e.evt?.type === 'touchstart'

  if (isLocked.value) {
    emit('select', props.index)
    e.evt?.stopPropagation?.()
    return
  }

  // Same deferred-select logic as drag: on touch, wait until touchend so the
  // bottom sheet doesn't open and block the canvas mid-rotation.
  if (!isTouch) {
    emit('select', props.index)
  }

  e.evt?.stopPropagation?.()
  e.evt?.preventDefault?.()

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

  stage.on("mousemove.sourceRotate touchmove.sourceRotate", onHandleMouseMove)
  stage.on("mouseup.sourceRotate touchend.sourceRotate", () => {
    onHandleMouseUp()
    stage.off("mousemove.sourceRotate touchmove.sourceRotate")
    stage.off("mouseup.sourceRotate touchend.sourceRotate")
    // On touch: never select after rotation — the gesture was purely for rotating.
    // The sheet can be opened by tapping the source body separately.
    // On mouse: select was already emitted on mousedown above.
  })
}

function onHandleMouseMove(e) {
  if (isLocked.value) return
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
