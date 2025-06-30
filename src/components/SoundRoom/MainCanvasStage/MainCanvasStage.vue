 <template>
  <div
    ref="stageRef"
    role="application"
    tabindex="0"
    aria-label="SoundRoom 2D audio environment. Use keyboard or mouse to interact with sound nodes."
    class="border-2 border-neutral-400 dark:border-neutral-700 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    :class="`w-[${room.width}px] h-[${room.height}px]`"
    @dragover.prevent
    @drop="handleDrop"
    @keydown="onKeyDown"
    @keyup="onKeyUp"
  >
    <!-- Context menu is visual only -->
    <ContextMenu
      ref="contextMenuRef"
      :functionList="contextMenuActions"
      aria-hidden="true"
    />

    <!-- Konva stage: purely visual, hide from screen readers -->
    <v-stage
      :config="{ width: room.width, height: room.height }"
      @contextmenu="(e) => e.evt.preventDefault()"
      @mousedown="handleStageClick"
      aria-hidden="true"
    >
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
        <ListenerNode
          v-bind="{ listener, actionManager, room }"
        />
      </v-layer>
    </v-stage>

    <!-- Labels — depends if they're meaningful or decorative -->
    <SoundSourceLabel
      v-for="sntc in soundNodeTitleCoords"
      v-bind="sntc"
      :aria-hidden="true"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

import ContextMenu from '@/components/ui/context/ContextMenu.vue'
import SoundSourceNode from '@/components/SoundRoom/MainCanvasStage/SoundSourceNode.vue'
import ListenerNode from '@/components/SoundRoom/MainCanvasStage/ListenerNode.vue'

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
  coordsVersion.value // makes it reactive to window resize
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
