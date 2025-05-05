<template>
  <div
    ref="stageRef"
    class="border-2 border-neutral-400 dark:border-neutral-700 flex items-center justify-center"
    :class="`w-[${room.width}px] h-[${room.height}px]`"
    @dragover.prevent
    @drop="handleDrop"
    @keydown="onKeyDown"
    @keyup="onKeyUp"
    tabindex="0"
  >
    <ContextMenu ref="contextMenuRef" :functionList="contextMenuActions" />
    <v-stage :config="{ width: room.width, height: room.height }" @contextmenu="(e) => e.evt.preventDefault()" @mousedown="handleStageClick">
      <v-layer ref="mainLayer">
        <SoundSourceNode
          v-for="(src, i) in audioEngine.soundSources.value"
          :key="i"
          :source="src"
          :selected="i === selectedIndex"
          :actionManager="actionManager"
          :room="room"
          :index="i"
          @select="$emit('selectNode', $event)"
          @contextmenu="showContextMenu"
        />
        <ListenerNode :listener="listener" :actionManager="actionManager" :room="room" />
      </v-layer>
    </v-stage>
    <SoundSourceLabel 
    v-for="sntc in soundNodeTitleCoords"
    v-bind="sntc"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

import ContextMenu from '@/components/ui/context/ContextMenu.vue'
import SoundSourceNode from '@/components/ui/canvas/SoundSourceNode.vue'
import ListenerNode from '@/components/ui/canvas/ListenerNode.vue'

import SoundSourceLabel from '@/components/ui/text/SoundSourceLabel.vue'

const props = defineProps({
  room: Object,
  handleDrop: Function,
  onKeyDown: Function,
  onKeyUp: Function,
  handleStageClick: Function,
  contextMenuActions: Object,
  showContextMenu: Function,
  actionManager: Object,
  selectedIndex: Number,
  listener: Object,
  audioEngine: Object,
  stageRef: Object,
})

defineEmits(['selectNode'])

const stageRef = ref(null)
const contextMenuRef = ref(null)
const coordsVersion = ref(0) // reactive bump trigger

onMounted(() => {
  window.addEventListener('resize', updateCoords)
})
onUnmounted(() => {
  window.removeEventListener('resize', updateCoords)
})

function updateCoords() {
  coordsVersion.value++
}


const soundNodeTitleCoords = computed(() => {
  coordsVersion.value // makes it reactive to resize
  return props.audioEngine.soundSources.value.map(sn => {          
  const stagePos = stageRef.value.getBoundingClientRect();
  return {
        x: stagePos.left + sn.instance.state.x,
        y: stagePos.top + sn.instance.state.y + 20, //20 is to account for directional arrow
        name: sn.name
      }
});
})



defineExpose({ stageRef, contextMenuRef })
</script>
