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
      :listening="false"
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
      :shadowBlur="6"
      :shadowOpacity="highlightShadowOpacity"
      :listening="false"
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
      :shadowBlur="6"
      :opacity="0.96"
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
import { computed, ref } from 'vue';
import { useListenerStore } from '@/stores/useListenerStore';
import { useActionManagerStore } from '@/stores/useActionManagerStore';
import { useRoomStore } from '@/stores/useRoomStore';
import { storeToRefs } from 'pinia';
import { useKonvaThemeRedraw } from '@/composables/useKonvaTheme';
import { useThemeStore } from '@/stores/useThemeStore';


const { listener } = storeToRefs(useListenerStore())
const { actionManager } = storeToRefs(useActionManagerStore())
const { room } = storeToRefs(useRoomStore())
const themeStore = useThemeStore()

const isDarkMode = computed(() => themeStore.activeTheme !== 'light')
const { themeVersion } = useKonvaThemeRedraw(() => {
  const node = listenerGroup.value?.getNode()
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

const anchorGlowFill = computed(() => isDarkMode.value
  ? rgbaFromVar('--color-accent-strong-rgb', 0.08, 'rgba(var(--color-accent-strong-rgb), 0.08)')
  : rgbaFromVar('--base-black-rgb', 0.06, 'rgba(var(--base-black-rgb), 0.06)'))
const anchorShadowColor = computed(() => isDarkMode.value
  ? rgbaFromVar('--color-accent-strong-rgb', 0.3, 'rgba(var(--color-accent-strong-rgb), 0.3)')
  : rgbaFromVar('--base-black-rgb', 0.1, 'rgba(var(--base-black-rgb), 0.1)'))
const anchorShadowBlur = computed(() => isDarkMode.value ? 18 : 10)
const anchorShadowOpacity = computed(() => isDarkMode.value ? 0.35 : 0.18)

const bodyFill = computed(() => isDarkMode.value
  ? rgbaFromVar('--color-accent-strong-rgb', 0.15, 'rgba(var(--color-accent-strong-rgb), 0.15)')
  : rgbaFromVar('--color-body-fill-rgb', 0.35, 'rgba(var(--color-body-fill-rgb), 0.35)'))
const bodyStroke = computed(() => isDarkMode.value
  ? rgbaFromVar('--color-accent-soft-rgb', 0.9, 'rgba(var(--color-accent-soft-rgb), 0.9)')
  : getVar('--color-detail-stroke', 'var(--color-detail-stroke)'))
const bodyShadowColor = computed(() => isDarkMode.value
  ? rgbaFromVar('--base-black-rgb', 0.2, 'rgba(var(--base-black-rgb), 0.2)')
  : rgbaFromVar('--base-black-rgb', 0.08, 'rgba(var(--base-black-rgb), 0.08)'))
const bodyShadowBlur = computed(() => isDarkMode.value ? 10 : 8)
const bodyShadowOpacity = computed(() => isDarkMode.value ? 0.55 : 0.18)

const detailFill = computed(() => isDarkMode.value
  ? rgbaFromVar('--color-outline-contrast-rgb', 0.9, 'rgba(var(--color-outline-contrast-rgb), 0.9)')
  : rgbaFromVar('--color-detail-fill-rgb', 0.85, 'rgba(var(--color-detail-fill-rgb), 0.85)'))
const detailStroke = computed(() => isDarkMode.value
  ? rgbaFromVar('--color-accent-soft-rgb', 0.85, 'rgba(var(--color-accent-soft-rgb), 0.85)')
  : rgbaFromVar('--color-body-stroke-rgb', 0.6, 'rgba(var(--color-body-stroke-rgb), 0.6)'))

const detailShadowColor = computed(() => isDarkMode.value
  ? rgbaFromVar('--color-accent-strong-rgb', 0.35, 'rgba(var(--color-accent-strong-rgb), 0.35)')
  : rgbaFromVar('--base-black-rgb', 0.08, 'rgba(var(--base-black-rgb), 0.08)'))
const detailShadowBlur = computed(() => isDarkMode.value ? 8 : 6)
const detailShadowOpacity = computed(() => isDarkMode.value ? 0.45 : 0.2)

const centerHighlightFill = computed(() => isDarkMode.value
  ? rgbaFromVar('--base-white-rgb', 0.75, 'rgba(var(--base-white-rgb), 0.75)')
  : rgbaFromVar('--base-white-rgb', 0.6, 'rgba(var(--base-white-rgb), 0.6)'))
const centerHighlightStroke = computed(() => isDarkMode.value
  ? rgbaFromVar('--base-white-rgb', 0.2, 'rgba(var(--base-white-rgb), 0.2)')
  : rgbaFromVar('--base-black-rgb', 0.08, 'rgba(var(--base-black-rgb), 0.08)'))
const highlightShadowColor = computed(() => isDarkMode.value
  ? rgbaFromVar('--base-white-rgb', 0.35, 'rgba(var(--base-white-rgb), 0.35)')
  : rgbaFromVar('--base-black-rgb', 0.06, 'rgba(var(--base-black-rgb), 0.06)'))
const highlightShadowOpacity = computed(() => isDarkMode.value ? 0.5 : 0.28)

const directionGradientStops = computed(() => isDarkMode.value
  ? [0, rgbaFromVar('--color-accent-soft-rgb', 0.18, 'rgba(var(--color-accent-soft-rgb), 0.18)'), 1, rgbaFromVar('--color-accent-strong-rgb', 0.85, 'rgba(var(--color-accent-strong-rgb), 0.85)')]
  : [0, rgbaFromVar('--color-detail-gradient-rgb', 0.2, 'rgba(var(--color-detail-gradient-rgb), 0.2)'), 1, rgbaFromVar('--color-body-stroke-rgb', 0.8, 'rgba(var(--color-body-stroke-rgb), 0.8)')]
)
const directionStroke = computed(() => isDarkMode.value
  ? rgbaFromVar('--color-outline-contrast-rgb', 0.85, 'rgba(var(--color-outline-contrast-rgb), 0.85)')
  : getVar('--color-text-primary', 'var(--color-text-primary)'))
const directionShadowColor = computed(() => isDarkMode.value
  ? rgbaFromVar('--color-accent-strong-rgb', 0.35, 'rgba(var(--color-accent-strong-rgb), 0.35)')
  : rgbaFromVar('--base-black-rgb', 0.1, 'rgba(var(--base-black-rgb), 0.1)'))

const rotationHandleFill = computed(() => isDarkMode.value
  ? rgbaFromVar('--color-accent-strong-rgb', 0.1, 'rgba(var(--color-accent-strong-rgb), 0.1)')
  : rgbaFromVar('--base-black-rgb', 0.06, 'rgba(var(--base-black-rgb), 0.06)'))

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
