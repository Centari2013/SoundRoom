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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

import ContextMenu from '@/components/ui/context/ContextMenu.vue'
import SoundSourceNode from '@/components/SoundRoom/MainCanvasStage/SoundSourceNode.vue'
import ListenerNode from '@/components/SoundRoom/MainCanvasStage/ListenerNode.vue'

import SoundSourceLabel from '@/components/ui/text/SoundSourceLabel.vue'

import { useRoomStore } from '@/stores/useRoomStore'
import { storeToRefs } from 'pinia'

const { room, actionManager, listener, audioEngine } = storeToRefs(useRoomStore())

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

const stageRef = ref(null)
const contextMenuRef = ref(null)
const coordsVersion = ref(0) // reactive bump trigger
const stageRect = ref(null)

// simple throttle implementation
function throttle(fn, delay = 100) {
  let timer = null
  return (...args) => {
    if (timer) return
    timer = setTimeout(() => {
      fn(...args)
      timer = null
    }, delay)
  }
}

function updateCoords() {
  if (!stageRef.value) return
  const rect = stageRef.value.getBoundingClientRect()
  const prev = stageRect.value
  if (!prev || prev.width !== rect.width || prev.height !== rect.height || prev.left !== rect.left || prev.top !== rect.top) {
    stageRect.value = rect
    coordsVersion.value++
  }
}

const throttledUpdateCoords = throttle(updateCoords, 100)

onMounted(() => {
  nextTick(() => {
    updateCoords()
  })
  window.addEventListener('resize', throttledUpdateCoords)
})
onUnmounted(() => {
  window.removeEventListener('resize', throttledUpdateCoords)
})

watch(() => [room.value.width, room.value.height], () => {
  nextTick(() => updateCoords())
})


const soundNodeTitleCoords = computed(() => {
  coordsVersion.value // re-compute when stageRect changes
  const stagePos = stageRect.value || { left: 0, top: 0 }
  return audioEngine.value.soundSources.value.map(sn => {
    return {
      x: stagePos.left + sn.instance.state.x,
      y: stagePos.top + sn.instance.state.y + 20, //20 is to account for directional arrow
      name: sn.name
    }
  })
})



defineExpose({ stageRef, contextMenuRef })
</script>
