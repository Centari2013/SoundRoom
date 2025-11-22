<template>
  <v-group
    ref="listenerGroup"
    :x="listener.x"
    :y="listener.y"
    :draggable="false"
    @mouseover="setCursor($event, 'pointer')"
    @mouseout="setCursor($event, 'default')"
    @dragmove="onListenerDragMove"
  >

    <!-- Listener Body -->
    <v-circle
      :radius="12"
      fill="rgba(59, 130, 246, 0.1)"
      stroke="rgba(59, 130, 246, 0.8)"
      :strokeWidth="2"
      shadowColor="rgba(0, 0, 0, 0.15)"
      shadowBlur="6"
      shadowOffsetY="2"
      @mousedown="onListenerMouseDown"
      @mouseup="onListenerMouseUp"
    />
    <v-circle
      :radius="6"
      fill="rgba(15, 23, 42, 0.85)"
      stroke="rgba(59, 130, 246, 0.85)"
      :strokeWidth="1"
      @mousedown="onListenerMouseDown"
      @mouseup="onListenerMouseUp"
    />

    <!-- Directional Marker -->
    <v-shape
      :sceneFunc="(ctx, shape) => {
        ctx.beginPath()
        ctx.moveTo(0, 16)
        ctx.lineTo(9, -4)
        ctx.lineTo(-9, -4)
        ctx.closePath()
        ctx.fillStrokeShape(shape)
      }"
      :rotation="listener.angle"
      fill="rgba(59, 130, 246, 0.9)"
      stroke="rgba(15, 23, 42, 0.9)"
      :strokeWidth="1.5"
      opacity="0.95"
      @mousedown="onListenerMouseDown"
      @mouseup="onListenerMouseUp"
    />

    <!-- Rotation Hitbox -->
    <v-arc
      :x="Math.cos(toRad(listener.angle + 90)) * 7"
      :y="Math.sin(toRad(listener.angle + 90)) * 7"
      :innerRadius="0"
      :outerRadius="25"
      :angle="135"
      :rotation="listener.angle + 20"
      fill="transparent"
      @mousedown="onHandleMouseDown"
      @mouseup="onHandleMouseUp"
      @mouseover="onHandleMouseOver"
      @mouseout="onHandleMouseOut"
    />

    <!-- Rotation Icon -->
    <v-group
      :x="Math.cos(toRad(listener.angle + 90)) * 7"
      :y="Math.sin(toRad(listener.angle + 90)) * 7"
      :rotation="listener.angle + 20"
      :opacity="rotationHandleIconVisible ? 0.85 : 0"
      listening="false"
    >
      <v-arc
        :innerRadius="10"
        :outerRadius="14"
        :angle="220"
        :rotation="-110"
        stroke="rgba(59, 130, 246, 0.75)"
        :strokeWidth="2"
        lineCap="round"
      />
      <v-regular-polygon
        :x="12"
        :y="-2"
        :sides="3"
        :radius="4"
        fill="rgba(59, 130, 246, 0.85)"
        shadowColor="rgba(0, 0, 0, 0.15)"
        shadowBlur="2"
      />
    </v-group>
  </v-group>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue';
import { useListenerStore } from '@/stores/useListenerStore';
import { useActionManagerStore } from '@/stores/useActionManagerStore';
import { useRoomStore } from '@/stores/useRoomStore';
import { storeToRefs } from 'pinia';


const { listener } = storeToRefs(useListenerStore())
const { actionManager } = storeToRefs(useActionManagerStore())
const { room } = storeToRefs(useRoomStore())

let moveListenerPayload = null
let initialMouseAngle = null
let initialListenerAngle = null
let mouseMoveListener = null

const rotationHandleIconVisible = ref(false)


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

function onHandleMouseOver() {
  rotationHandleIconVisible.value = true
}

function onHandleMouseOut() {
  rotationHandleIconVisible.value = false
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
