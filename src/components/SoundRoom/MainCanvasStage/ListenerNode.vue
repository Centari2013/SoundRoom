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

    <!-- Listener Dot -->
    <v-circle
      :radius="10"
      fill="rgba(0,0,0,0.001)"
      strokeEnabled="false"
      @mousedown="onListenerMouseDown"
      @mouseup="onListenerMouseUp"
    />

    <!-- Direction Diamond (hidden; keeps hit target consistent) -->
    <v-shape
      :sceneFunc="(ctx, shape) => {
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(7, 5)
        ctx.lineTo(0, 25)
        ctx.lineTo(-7, 5)
        ctx.closePath()
        ctx.fillStrokeShape(shape)
      }"
      :rotation="listener.angle"
      opacity="0"
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
    />
  </v-group>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue';
import { useListenerStore } from '@/stores/useListenerStore';
import { useActionManagerStore } from '@/stores/useActionManagerStore';
import { useRoomStore } from '@/stores/useRoomStore';
import { storeToRefs } from 'pinia';


const listenerStore = useListenerStore()
const { listener } = storeToRefs(listenerStore)
const { actionManager } = storeToRefs(useActionManagerStore())
const { room } = storeToRefs(useRoomStore())

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

  listenerStore.setIsActive(true)

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
  listenerStore.setIsActive(false)
}


// Rotation handling
function onHandleMouseDown(e) {
  e.evt.stopPropagation()

  listenerStore.setIsActive(true)

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

  listenerStore.setIsActive(false)

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
  listenerStore.setIsActive(false)
})

</script>
