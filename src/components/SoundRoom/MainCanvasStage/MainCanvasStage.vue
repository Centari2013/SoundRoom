 <template>
  <div
    ref="stageDivRef"
    role="application"
    tabindex="0"
    aria-label="SoundRoom 2D audio environment. Use keyboard or mouse to interact with sound nodes."
    class="canvas-grid relative border border-[var(--color-border-subtle)] dark:border-2 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] shadow-[var(--color-shadow-soft)]"
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
      :config="stageConfig"
      @contextmenu="onStageContextMenu"
      @mousedown="handleStageClick"
      aria-hidden="true"
    >
      <v-layer ref="mainLayer">
        <SoundSourceNode
          v-for="(src, i) in audioEngine.soundSources.value"
          :key="getSourceKey(src, i)"
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
      :key="sntc.key"
      v-bind="sntc"
      :aria-hidden="true"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'

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

const stageConfig = computed(() => ({
  width: room.value.width,
  height: room.value.height
}))

function onStageContextMenu(e) {
  e.evt.preventDefault()
}

function getSourceKey(src, index) {
  return src?.instance?.state?.schedule?.id ?? src?.state?.schedule?.id ?? src?.id ?? `${src?.libraryId ?? src?.name ?? 'source'}:${index}`
}

defineEmits(['selectNode'])

const stageDivRef = ref(null)
const contextMenuRef = ref(null)
const vStageRef = ref(null) // for Konva stage
const mainLayer = ref(null)
const coordsVersion = ref(0) // reactive bump trigger
let stopSourceRenderWatch = null

onMounted(() => {
  window.addEventListener('resize', updateCoords)
  const canvasStore = useCanvasStore()
  canvasStore.setStageDivRef(stageDivRef.value)
  canvasStore.setContextMenuRef(contextMenuRef.value) // share context menu instance safely
  canvasStore.setVStageRef(vStageRef.value)
  stopSourceRenderWatch = watch(
    [
      audioEngine,
      () => audioEngine.value.soundSources.value.map((src, index) => getSourceKey(src, index)).join('|')
    ],
    reportRenderedSoundSources,
    { immediate: true, flush: 'post' }
  )
})
onUnmounted(() => {
  window.removeEventListener('resize', updateCoords)
  stopSourceRenderWatch?.()
  useCanvasStore().setRenderedSoundSourceCount(0)
})

function updateCoords() {
  coordsVersion.value++
}

async function reportRenderedSoundSources() {
  await nextTick()
  await nextAnimationFrame()

  const layer = mainLayer.value?.getNode?.()
  layer?.batchDraw?.()

  const renderedCount = layer?.find?.('.sound-source-node')?.length ?? 0
  useCanvasStore().setRenderedSoundSourceCount(renderedCount)
}

function nextAnimationFrame() {
  if (typeof requestAnimationFrame !== 'function') {
    return new Promise(resolve => setTimeout(resolve, 0))
  }

  return new Promise(resolve => requestAnimationFrame(() => resolve()))
}


const soundNodeTitleCoords = computed(() => {
  coordsVersion.value // makes it reactive to window resize

  if (!stageDivRef.value) {
    return []
  }

  return audioEngine.value.soundSources.value.map((sn, index) => ({
    key: getSourceKey(sn, index),
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
