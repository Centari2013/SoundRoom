 <template>
  <div
    ref="stageDivRef"
    role="application"
    tabindex="0"
    aria-label="SoundRoom 2D audio environment. Use keyboard or mouse to interact with sound nodes."
    class="canvas-grid relative border border-border-subtle dark:border-2 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-focus shadow-soft"
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
      ref="vStageRef"
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
          :index="i"
          @select="$emit('selectNode', $event)"
          @contextmenu="showContextMenu"
        />
        <ListenerNode/>
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

import { useRoomStore } from '@/stores/useRoomStore'
import { useAudioEngineStore } from '@/stores/useAudioEngineStore'
import { useCanvasStore } from '@/stores/useCanvasStore'
import { storeToRefs } from 'pinia'

const { room } = storeToRefs(useRoomStore())
const { audioEngine } = storeToRefs(useAudioEngineStore())

const props = defineProps({
  handleDrop: Function,
  onKeyDown: Function,
  onKeyUp: Function,
  handleStageClick: Function,
  contextMenuActions: Object,
  showContextMenu: Function,
  selectedIndex: Number,
})


defineEmits(['selectNode'])

const stageDivRef = ref(null)
const contextMenuRef = ref(null)
const vStageRef = ref(null) // for Konva stage
const coordsVersion = ref(0) // reactive bump trigger

onMounted(() => {
  window.addEventListener('resize', updateCoords)
  const canvasStore = useCanvasStore()
  canvasStore.setStageDivRef(stageDivRef.value)
  canvasStore.setVStageRef(vStageRef.value)
})
onUnmounted(() => {
  window.removeEventListener('resize', updateCoords)
})

function updateCoords() {
  coordsVersion.value++
}


const soundNodeTitleCoords = computed(() => {
  coordsVersion.value // makes it reactive to window resize

  if (!stageDivRef.value) {
    return []
  }

  return audioEngine.value.soundSources.value.map(sn => ({
    x: sn.instance.state.x,
    y: sn.instance.state.y + 20, //20 is to account for directional arrow
    name: sn.name,
  }))
})


</script>

<style scoped>
/* Grid spacing and line opacity can be tuned here to adjust density/visibility */
.canvas-grid {
  background-size: 40px 40px; /* Adjust spacing between grid lines */
  background-color: var(--lm-bg-1);
  background-image:
    linear-gradient(to right, var(--lm-grid-line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--lm-grid-line) 1px, transparent 1px); /* Adjust line opacity */
}

[data-theme="dark"] .canvas-grid {
  background-color: transparent;
  background-image:
    linear-gradient(to right, rgba(var(--base-white-rgb), 0.08) 2px, transparent 2px),
    linear-gradient(to bottom, rgba(var(--base-white-rgb), 0.08) 2px, transparent 2px); /* Adjust dark mode opacity separately */
}
</style>
