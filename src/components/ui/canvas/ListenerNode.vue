<template>
  <v-group
  :x="listener.x"
  :y="listener.y"
  :draggable="true"
  :rotation="listener.angle"
  @dragmove="onDragMove"
  @mousedown="onMouseDown"
  @mouseup="onMouseUp"
>
  <!-- Listener Dot -->
  <v-circle
    :radius="10"
    fill="#00f"
  />

<!-- Direction Line -->
<v-line
  :points="[0, 0, 0, 20]"
  stroke="#fff"
  :strokeWidth="2"
/>

<!-- Arrowhead at the tip of the line -->
<v-circle
  :x="0"
  :y="20"
  :radius="3"
  fill="#ff0"
/>


</v-group>

</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  listener: Object,
  actionManager: Object,
  room: Object
})

const listener = props.listener
const actionManager = props.actionManager
const room = props.room

const positionsEqual = (a, b) => a.x === b.x && a.y === b.y
let moveListenerPayload = null

function onMouseDown(e) {
  if (e.button === 2) return // ignore right-click
  moveListenerPayload = {
    from: {
      x: listener.x,
      y: listener.y
    }
  }
}

function onDragMove(e) {
  //TODO: fix clamp functionality
  const pos = e.target.position()
  listener.x = room.clamp(pos.x, 0, room.width)
  listener.y = room.clamp(pos.y, 0, room.height)
  listener.updateAudio()
}

function onMouseUp(){
  const to = {
    x: listener.x,
    y: listener.y
  }

  if (!positionsEqual(moveListenerPayload.from, to)) {
    moveListenerPayload.to = to
    actionManager.doAction("move_listener", moveListenerPayload)
  }

  moveListenerPayload = null
}

</script>
