 <template>
  <div
    ref="stageDivRef"
    role="application"
    tabindex="0"
    aria-label="SoundRoom 2D audio environment. Use keyboard or mouse to interact with sound nodes."
    class="relative flex items-center justify-center border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 canvas-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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

  const stageElement = stageDivRef.value
  if (!stageElement) {
    return []
  }

  const stagePos = stageElement.getBoundingClientRect()

  return audioEngine.value.soundSources.value.map(sn => ({
    x: stagePos.left + sn.instance.state.x,
    y: stagePos.top + sn.instance.state.y + 20, //20 is to account for directional arrow
    name: sn.name,
  }))
})


</script>

<style scoped>
/* Subtle surface treatment: tweak variables below to adjust grid spacing, line opacity, or vignette strength. */
.canvas-surface {
  --grid-size: 40px; /* change to tighten/loosen spacing */
  --grid-line: rgba(0, 0, 0, 0.06); /* lighten/darken grid in light mode */
  --vignette-edge: rgba(0, 0, 0, 0.16); /* increase for deeper edge falloff */

  background-image:
    radial-gradient(ellipse at center, rgba(255, 255, 255, 0) 45%, var(--vignette-edge) 100%),
    linear-gradient(to right, var(--grid-line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px);
  background-size:
    auto,
    var(--grid-size) var(--grid-size),
    var(--grid-size) var(--grid-size);
}

:global(.dark) .canvas-surface {
  --grid-line: rgba(255, 255, 255, 0.06);
  --vignette-edge: rgba(0, 0, 0, 0.32);
}
</style>
