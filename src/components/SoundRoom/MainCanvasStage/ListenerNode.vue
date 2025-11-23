<template>
  <v-group
    ref="listenerGroup"
    :x="listener.x"
    :y="listener.y"
    :draggable="false"
    @dragmove="onListenerDragMove"
  >

    <!-- Anchor Glow -->
    <v-circle
      :radius="22"
      :fill="anchorGlowFill"
      :shadowColor="anchorShadowColor"
      :shadowBlur="anchorShadowBlur"
      :shadowOpacity="anchorShadowOpacity"
      listening="false"
    />

    <!-- Listener Body -->
    <v-circle
      :radius="14"
      :fill="bodyFill"
      :stroke="bodyStroke"
      :strokeWidth="2.5"
      :shadowColor="bodyShadowColor"
      :shadowBlur="bodyShadowBlur"
      :shadowOpacity="bodyShadowOpacity"
      @mousedown="onListenerMouseDown"
      @mouseup="onListenerMouseUp"
      @mouseover="setCursor($event, 'pointer')"
      @mouseout="setCursor($event, 'default')"
    />
    <v-circle
      :radius="8"
      :fill="detailFill"
      :stroke="detailStroke"
      :strokeWidth="1.25"
      :shadowColor="detailShadowColor"
      :shadowBlur="detailShadowBlur"
      :shadowOpacity="detailShadowOpacity"
      @mousedown="onListenerMouseDown"
      @mouseup="onListenerMouseUp"
      @mouseover="setCursor($event, 'pointer')"
      @mouseout="setCursor($event, 'default')"
    />
    <v-circle
      :radius="4"
      :fill="centerHighlightFill"
      :stroke="centerHighlightStroke"
      :strokeWidth="0.5"
      :shadowColor="highlightShadowColor"
      shadowBlur="6"
      :shadowOpacity="highlightShadowOpacity"
      listening="false"
    />

    <!-- Directional Marker -->
    <v-shape
      :sceneFunc="(ctx, shape) => {
        ctx.beginPath()
        ctx.moveTo(0, 25)
        ctx.lineTo(9.5, -0)
        ctx.quadraticCurveTo(0, -7, -9.5, 0)
        ctx.closePath()
        ctx.fillStrokeShape(shape)
      }"
      :rotation="listener.angle"
      :fillLinearGradientStartPoint="{ x: -12, y: 12 }"
      :fillLinearGradientEndPoint="{ x: 12, y: -10 }"
      :fillLinearGradientColorStops="directionGradientStops"
      :stroke="directionStroke"
      :strokeWidth="1.25"
      :shadowColor="directionShadowColor"
      shadowBlur="6"
      opacity="0.96"
      @mousedown="onListenerMouseDown"
      @mouseup="onListenerMouseUp"
      @mouseover="setCursor($event, 'pointer')"
      @mouseout="setCursor($event, 'default')"
    />

    <!-- Rotation Hitbox -->
    <v-arc
      :x="Math.cos(toRad(listener.angle + 90))"
      :y="Math.sin(toRad(listener.angle + 90))"
      :innerRadius="0"
      :outerRadius="40"
      :angle="135"
      :fill="rotationHandleFill"
      :rotation="listener.angle + 20"
      @mouseover="setCursor($event, 'grabbing')"
      @mouseout="setCursor($event, 'default')"
      @mousedown="onHandleMouseDown"
      @mouseup="onHandleMouseUp"
    />
  </v-group>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useListenerStore } from '@/stores/useListenerStore';
import { useActionManagerStore } from '@/stores/useActionManagerStore';
import { useRoomStore } from '@/stores/useRoomStore';
import { storeToRefs } from 'pinia';


const { listener } = storeToRefs(useListenerStore())
const { actionManager } = storeToRefs(useActionManagerStore())
const { room } = storeToRefs(useRoomStore())

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

const anchorGlowFill = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-blue-500-rgb', 0.08, 'var(--sr-blue-500-08)')
  : rgbaFromVar('--sr-black-rgb', 0.06, 'var(--sr-listener-anchor-glow)'))
const anchorShadowColor = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-blue-500-rgb', 0.3, 'var(--sr-blue-500-30)')
  : rgbaFromVar('--sr-black-rgb', 0.1, 'var(--sr-listener-anchor-shadow)'))
const anchorShadowBlur = computed(() => isDarkMode.value ? 18 : 10)
const anchorShadowOpacity = computed(() => isDarkMode.value ? 0.35 : 0.18)

const bodyFill = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-blue-500-rgb', 0.15, 'var(--sr-blue-500-15)')
  : rgbaFromVar('--sr-body-fill-rgb', 0.35, 'var(--sr-listener-body-fill)'))
const bodyStroke = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-blue-400-rgb', 0.9, 'var(--sr-blue-400-90)')
  : getVar('--sr-detail-stroke', 'var(--sr-detail-stroke)'))
const bodyShadowColor = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-black-rgb', 0.2, 'var(--sr-black-20)')
  : rgbaFromVar('--sr-black-rgb', 0.08, 'var(--sr-listener-body-shadow)'))
const bodyShadowBlur = computed(() => isDarkMode.value ? 10 : 8)
const bodyShadowOpacity = computed(() => isDarkMode.value ? 0.55 : 0.18)

const detailFill = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-outline-contrast-rgb', 0.9, 'var(--sr-outline-contrast-90)')
  : rgbaFromVar('--sr-detail-fill-rgb', 0.85, 'var(--sr-listener-detail-fill)'))
const detailStroke = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-blue-100-rgb', 0.85, 'var(--sr-blue-100-85)')
  : rgbaFromVar('--sr-body-stroke-rgb', 0.6, 'var(--sr-listener-detail-stroke)'))

const detailShadowColor = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-blue-500-rgb', 0.35, 'var(--sr-blue-500-35)')
  : rgbaFromVar('--sr-black-rgb', 0.08, 'var(--sr-listener-detail-shadow)'))
const detailShadowBlur = computed(() => isDarkMode.value ? 8 : 6)
const detailShadowOpacity = computed(() => isDarkMode.value ? 0.45 : 0.2)

const centerHighlightFill = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-white-rgb', 0.75, 'var(--sr-white-75)')
  : rgbaFromVar('--sr-white-rgb', 0.6, 'var(--sr-listener-center-highlight)'))
const centerHighlightStroke = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-white-rgb', 0.2, 'var(--sr-white-20)')
  : rgbaFromVar('--sr-black-rgb', 0.08, 'var(--sr-listener-center-stroke)'))
const highlightShadowColor = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-white-rgb', 0.35, 'var(--sr-white-35)')
  : rgbaFromVar('--sr-black-rgb', 0.06, 'var(--sr-listener-highlight-shadow)'))
const highlightShadowOpacity = computed(() => isDarkMode.value ? 0.5 : 0.28)

const directionGradientStops = computed(() => isDarkMode.value
  ? [0, rgbaFromVar('--sr-blue-100-rgb', 0.18, 'var(--sr-blue-100-18)'), 1, rgbaFromVar('--sr-blue-500-rgb', 0.85, 'var(--sr-blue-500-85)')]
  : [0, rgbaFromVar('--sr-detail-gradient-rgb', 0.2, 'var(--sr-listener-direction-start)'), 1, rgbaFromVar('--sr-body-stroke-rgb', 0.8, 'var(--sr-listener-direction-end)')]
)
const directionStroke = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-outline-contrast-rgb', 0.85, 'var(--sr-outline-contrast-85)')
  : getVar('--sr-text-strong', 'var(--sr-text-strong)'))
const directionShadowColor = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-blue-500-rgb', 0.35, 'var(--sr-blue-500-35)')
  : rgbaFromVar('--sr-black-rgb', 0.1, 'var(--sr-listener-direction-shadow)'))

const rotationHandleFill = computed(() => isDarkMode.value
  ? rgbaFromVar('--sr-blue-500-rgb', 0.1, 'var(--sr-blue-500-10)')
  : rgbaFromVar('--sr-black-rgb', 0.06, 'var(--sr-listener-rotation-fill)'))

let moveListenerPayload = null
let initialMouseAngle = null
let initialListenerAngle = null
let mouseMoveListener = null


let dragStartPos = null
const listenerGroup = ref(null)

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
  if (stage) stage.container().style.cursor = type
}

function onListenerMouseDown(e) {
  if (e.button === 2) return // if right click, do nothing

  const stage = e.target.getStage()
  dragStartPos = stage.getPointerPosition()
  moveListenerPayload = null

  const group = listenerGroup.value?.getNode()
  if (!group) return

  // Add global mousemove to detect drag
  mouseMoveListener = (evt) => {
    const movePos = stage.getPointerPosition()
    const dx = movePos.x - dragStartPos.x
    const dy = movePos.y - dragStartPos.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > 4) {
      group.draggable(true)
      group.startDrag()

      moveListenerPayload = {
        from: { x: listener.value.x, y: listener.value.y },
      }

      window.removeEventListener('mousemove', mouseMoveListener)
      mouseMoveListener = null
    }
  }

  window.addEventListener('mousemove', mouseMoveListener)
}


function onListenerDragMove(e) {
  const pos = e.target.position()
  const clampedX = room.value.clamp(pos.x, 0, room.value.width)
  const clampedY = room.value.clamp(pos.y, 0, room.value.height)

  e.target.position({ x: clampedX, y: clampedY })

  listener.value.x = clampedX
  listener.value.y = clampedY
  listener.value.updateAudio()
}

function onListenerMouseUp(e) {
  const group = listenerGroup.value?.getNode()
  if (group) group.draggable(false)

  if (mouseMoveListener) {
    window.removeEventListener('mousemove', mouseMoveListener)
    mouseMoveListener = null
  }

  if (moveListenerPayload) {
    const to = { x: listener.value.x, y: listener.value.y }

    if (!positionsEqual(moveListenerPayload.from, to)) {
      moveListenerPayload.to = to
      actionManager.value.doAction("move_listener", moveListenerPayload)
    }
  }

  moveListenerPayload = null
}


// Rotation handling
function onHandleMouseDown(e) {
  e.evt.stopPropagation()

  initialListenerAngle = listener.value.angle

  const stage = e.target.getStage()
  const mousePos = stage.getPointerPosition()
  const dx = mousePos.x - listener.value.x
  const dy = mousePos.y - listener.value.y
  initialMouseAngle = Math.atan2(dy, dx) * (180 / Math.PI)

  stage.on("mousemove.listenerRotate", onHandleMouseMove)
  stage.on("mouseup.listenerRotate", () => {
    onHandleMouseUp()
    stage.off("mousemove.listenerRotate")
    stage.off("mouseup.listenerRotate")
  })
}

function onHandleMouseMove(e) {
  const stage = e.target.getStage()
  const mousePos = stage.getPointerPosition()
  const dx = mousePos.x - listener.value.x
  const dy = mousePos.y - listener.value.y
  const currentMouseAngle = Math.atan2(dy, dx) * (180 / Math.PI)

  const delta = currentMouseAngle - initialMouseAngle
  const newAngle = initialListenerAngle + delta

  listener.value.updateAngle(newAngle)
  listener.value.updateAudio()
}

function onHandleMouseUp() {
  const finalAngle = listener.value.angle

  if (initialListenerAngle !== null && initialListenerAngle !== finalAngle) {
    actionManager.value.doAction("rotate_listener_angle", {
      from: initialListenerAngle,
      to: finalAngle,
    })
  }

  initialListenerAngle = null
}

onBeforeUnmount(() => {
  if (mouseMoveListener) {
    window.removeEventListener('mousemove', mouseMoveListener)
    mouseMoveListener = null
  }
})

</script>
