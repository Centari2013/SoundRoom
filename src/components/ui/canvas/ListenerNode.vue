<template>
  <v-group
    :x="listener.x"
    :y="listener.y"
    @mouseover="setCursor($event, 'pointer')"
    @mouseout="setCursor($event, 'default')"
    @dragmove="onListenerDragMove"
  >
    <!-- Listener Dot -->
    <v-circle
      :radius="10"
      fill="#00f"
      @mousedown="onListenerMouseDown"
      @mouseup="onListenerMouseUp"
    />

    <!-- Direction Diamond -->
    <v-shape
      :sceneFunc="(ctx, shape) => {
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(7, 5)
        ctx.lineTo(0, 30)
        ctx.lineTo(-7, 5)
        ctx.closePath()
        ctx.fillStrokeShape(shape)
      }"
      :rotation="listener.angle"
      fill="#fff"
      stroke="#000"
      :strokeWidth="1"
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
// Props and setup
const props = defineProps({
  listener: Object,
  actionManager: Object,
  room: Object,
})

const listener = props.listener
const actionManager = props.actionManager
const room = props.room

let moveListenerPayload = null
let initialMouseAngle = null
let initialListenerAngle = null

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

// Listener movement (drag)
function onListenerMouseDown(e) {
  if (e.button === 2) return

  const group = e.target.getParent()
  group.draggable(true)
  group.startDrag()

  moveListenerPayload = {
    from: { x: listener.x, y: listener.y },
  }
}

function onListenerDragMove(e) {
  const pos = e.target.position()
  const clampedX = room.clamp(pos.x, 0, room.width)
  const clampedY = room.clamp(pos.y, 0, room.height)

  e.target.position({ x: clampedX, y: clampedY })

  listener.x = clampedX
  listener.y = clampedY
  listener.updateAudio()
}

function onListenerMouseUp(e) {
  const group = e.target.getParent()
  group.draggable(false)

  const to = { x: listener.x, y: listener.y }

  if (!positionsEqual(moveListenerPayload.from, to)) {
    moveListenerPayload.to = to
    actionManager.doAction("move_listener", moveListenerPayload)
  }

  moveListenerPayload = null
}

// Rotation handling
function onHandleMouseDown(e) {
  e.evt.stopPropagation()

  initialListenerAngle = listener.angle

  const stage = e.target.getStage()
  const mousePos = stage.getPointerPosition()
  const dx = mousePos.x - listener.x
  const dy = mousePos.y - listener.y
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
  const dx = mousePos.x - listener.x
  const dy = mousePos.y - listener.y
  const currentMouseAngle = Math.atan2(dy, dx) * (180 / Math.PI)

  const delta = currentMouseAngle - initialMouseAngle
  const newAngle = initialListenerAngle + delta

  listener.updateAngle(newAngle)
  listener.updateAudio()
}

function onHandleMouseUp() {
  const finalAngle = listener.angle

  if (initialListenerAngle !== null && initialListenerAngle !== finalAngle) {
    actionManager.doAction("rotate_listener_angle", {
      from: initialListenerAngle,
      to: finalAngle,
    })
  }

  initialListenerAngle = null
}
</script>
