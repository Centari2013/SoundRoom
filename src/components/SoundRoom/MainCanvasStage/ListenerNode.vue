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
      :fill="listenerBodyFill"
      :stroke="listenerBodyStroke"
      :strokeWidth="2.5"
      :shadowColor="listenerBodyShadow"
      :shadowBlur="listenerBodyShadowBlur"
      :shadowOpacity="listenerBodyShadowOpacity"
      @mousedown="onListenerMouseDown"
      @mouseup="onListenerMouseUp"
      @mouseover="setCursor($event, 'pointer')"
      @mouseout="setCursor($event, 'default')"
    />
    <v-circle
      :radius="8"
      fill="rgba(15, 23, 42, 0.9)"
      stroke="rgba(191, 219, 254, 0.85)"
      :strokeWidth="1.25"
      :shadowColor="innerShadowColor"
      :shadowBlur="innerShadowBlur"
      :shadowOpacity="innerShadowOpacity"
      @mousedown="onListenerMouseDown"
      @mouseup="onListenerMouseUp"
      @mouseover="setCursor($event, 'pointer')"
      @mouseout="setCursor($event, 'default')"
    />
    <v-circle
      :radius="4"
      fill="rgba(255, 255, 255, 0.75)"
      stroke="rgba(255, 255, 255, 0.2)"
      :strokeWidth="0.5"
      shadowColor="rgba(255, 255, 255, 0.35)"
      shadowBlur="6"
      shadowOpacity="0.5"
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
      :fillLinearGradientColorStops="[0, 'rgba(191, 219, 254, 0.18)', 1, directionGradientEnd]"
      :stroke="directionStroke"
      :strokeWidth="1.25"
      :shadowColor="directionShadow"
      :shadowBlur="6"
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
      fill="rgba(59, 130, 246, 0.1)"
      :rotation="listener.angle + 20"
      @mouseover="setCursor($event, 'grabbing')"
      @mouseout="setCursor($event, 'default')"
      @mousedown="onHandleMouseDown"
      @mouseup="onHandleMouseUp"
    />
  </v-group>
</template>

<script setup>
import { ref, onBeforeUnmount, computed } from 'vue';
import { useListenerStore } from '@/stores/useListenerStore';
import { useActionManagerStore } from '@/stores/useActionManagerStore';
import { useRoomStore } from '@/stores/useRoomStore';
import { storeToRefs } from 'pinia';


const { listener } = storeToRefs(useListenerStore())
const { actionManager } = storeToRefs(useActionManagerStore())
const { room } = storeToRefs(useRoomStore())
const isDarkMode = document.documentElement.classList.contains('dark') ||
  (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)

let moveListenerPayload = null
let initialMouseAngle = null
let initialListenerAngle = null
let mouseMoveListener = null


let dragStartPos = null
const listenerGroup = ref(null)

const anchorGlowFill = computed(() => isDarkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.06)')
const anchorShadowColor = computed(() => isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)')
const anchorShadowBlur = computed(() => isDarkMode ? 18 : 14)
const anchorShadowOpacity = computed(() => isDarkMode ? 0.35 : 0.22)
const listenerBodyFill = computed(() => isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.12)')
const listenerBodyStroke = computed(() => isDarkMode ? 'rgba(96, 165, 250, 0.9)' : 'rgba(96, 165, 250, 0.82)')
const listenerBodyShadow = computed(() => isDarkMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.12)')
const listenerBodyShadowBlur = computed(() => isDarkMode ? 10 : 7)
const listenerBodyShadowOpacity = computed(() => isDarkMode ? 0.55 : 0.36)
const innerShadowColor = computed(() => isDarkMode ? 'rgba(59, 130, 246, 0.35)' : 'rgba(59, 130, 246, 0.22)')
const innerShadowBlur = computed(() => isDarkMode ? 8 : 6)
const innerShadowOpacity = computed(() => isDarkMode ? 0.45 : 0.28)
const directionGradientEnd = computed(() => isDarkMode ? 'rgba(59, 130, 246, 0.85)' : 'rgba(59, 130, 246, 0.7)')
const directionStroke = computed(() => isDarkMode ? 'rgba(15, 23, 42, 0.85)' : 'rgba(15, 23, 42, 0.65)')
const directionShadow = computed(() => isDarkMode ? 'rgba(59, 130, 246, 0.35)' : 'rgba(59, 130, 246, 0.22)')

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
