<template>
  <v-group
  :x="source.x"
  :y="source.y"
  :draggable="true"
  :rotation="angle"
  @dragmove="onDragMove"
  @mousedown="onMouseDown"
  @mouseup="onMouseUp"
>
  <!-- Outer Cone -->
  <v-wedge
    v-if="hasOuterCone"
    :angle="coneOuter"
    :rotation="-coneOuter / 2" 
    :radius="50"
    fill="rgba(255, 100, 100, 0.05)"
    shadowColor="rgba(255, 100, 100, 0.2)"
    :shadowBlur="12"
  />

  <!-- Inner Cone -->
  <v-wedge
    v-if="hasInnerCone"
    :angle="coneInner"
    :rotation="-coneInner / 2"
    :radius="50"
    fill="rgba(255, 120, 120, 0.2)"
  />

  <!-- Source Dot -->
  <v-circle @mousedown="() => emit('select', props.index)"
    :radius="10"
    :fill="props.selected ? '#ff0' : '#f00'"
    name="sound-node"
    class="curosr-pointer"
  />

  <!-- Direction Line (should point right in base state) -->
<v-line
  v-if="hasCone"
  :points="[0, 0, 14, 0]" 
  stroke="#fff"
  :strokeWidth="2"
/>

<!-- Rotation Handle (also right in base state) -->
<v-circle
  :x="50" 
  :y="0"  
  :radius="6"
  fill="rgba(255, 255, 255, 0.6)"
  stroke="#000"
  :strokeWidth="1.5"
/>

</v-group>

</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  source: Object,
  actionManager: Object,
  room: Object,
  index: Number,
  selected: Boolean
})

const actionManager = props.actionManager
const room = props.room
const source = props.source
const emit = defineEmits(['select'])


const hasCone = computed(() => source.coneInner < 360 || source.coneOuter < 360)
const hasInnerCone = computed(() => source.instance.state.coneInner < 360)
const hasOuterCone = computed(() => source.instance.state.coneOuter < 360)

const coneInner = computed(() => source.instance.state.coneInner)
const coneOuter = computed(() => source.instance.state.coneOuter)
const angle = computed(() => source.instance.state.angle)

let moveSourcePayload = null
const positionsEqual = (a, b) => a.x === b.x && a.y === b.y


function onMouseDown(_e) {
  moveSourcePayload = {
    index: props.index,
    from: {
      x: source.instance.state.x,
      y: source.instance.state.y
    }
  }
}

function onDragMove(e) {
  //TODO: fix clamp functionality here
  const pos = e.target.position()
  source.instance.state.x = room.clamp(pos.x, 0, room.width)
  source.instance.state.y = room.clamp(pos.y, 0, room.height)
  source.instance.updateAudio()
}

function onMouseUp(){
  const to = {
    x: source.instance.state.x,
    y: source.instance.state.y
  }

  if (!positionsEqual(moveSourcePayload.from, to)) {
    moveSourcePayload.to = to
    actionManager.doAction("move_canvas_sound_source", moveSourcePayload)
  }

  moveSourcePayload = null
}

// TODO: add pointer hover

</script>
