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
  </div>
</template>

<script setup>
import { ref } from 'vue'

import ContextMenu from '@/components/ui/context/ContextMenu.vue'
import SoundSourceNode from '@/components/ui/canvas/SoundSourceNode.vue'
import ListenerNode from '@/components/ui/canvas/ListenerNode.vue'

const props = defineProps([
  'room',
  'handleDrop',
  'onKeyDown',
  'onKeyUp',
  'handleStageClick',
  'contextMenuActions',
  'showContextMenu',
  'actionManager',
  'selectedIndex',
  'listener',
  'audioEngine',
  'stageRef'
])
defineEmits(['selectNode'])

const stageRef = ref(null)
const contextMenuRef = ref(null)

defineExpose({ stageRef, contextMenuRef })
</script>
