<template>
  <div class="h-screen min-w-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white flex flex-col">
    <!-- Header -->
    <HeaderBar @openHelp="isHelpOpen = true" />

    <!-- Main Layout -->
    <div class="flex flex-1 overflow-hidden">
      
      <Help :isHelpOpen="isHelpOpen" @close="isHelpOpen = false" />
      
      <SoundLibrary
        :isLibraryOpen="isLibraryOpen"
        :sounds="[]"
        @close="isLibraryOpen = false"
        @load="handleAddLibrarySoundSource"
      />
      
      <!-- Left Sidebar -->
      <SidebarLeft 
        :soundLibrarySources="soundLibrarySources"
        :MAX_SOURCES="MAX_LIB_SOURCES"
        :handleDragStart="handleDragStart"
        :addSourceClick="() => { isLibraryOpen = true }"
        :listener="listener"
        @deleteSource="handleDeleteLibrarySource"
      />

      <!-- Canvas + Controls -->
      <main class="flex-1 flex flex-col">
        <!-- Toolbar -->
        <div class="flex items-center justify-between p-4 border-b border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
          <ToolbarControls
            :canPlay="audioEngine.soundSources.value.length > 0"
            :canUndo="!actionStackEmpty"
            :canRedo="!redoStackEmpty"
            :playing="isPlaying"
            @undo="actionManager.undoLastAction"
            @redo="actionManager.redoLastAction"
            @togglePlay="isPlaying ? audioEngine.pauseAll() : audioEngine.playAll()"
          />
          <div class="flex items-center space-x-2">
            <span class="text-xs text-neutral-500">Master</span>
            <VueSlider 
              v-model="masterVolumeProxy"
              :min="0" 
              :max="1" 
              :interval="0.01"
              :width="100"
              :height="4"
              tooltip="none"
              class="mr-3"
            />
          </div>
        </div>

        <!-- Canvas Area -->
        <div class="flex-1 bg-neutral-200 dark:bg-black flex items-center justify-center">
          <MainCanvasStage 
            ref="stageWrapper"
            :room="room"
            :handleDrop="handleDrop"
            :onKeyDown="onKeyDown"
            :onKeyUp="onKeyUp"
            :contextMenuActions="contextMenuActions"
            :showContextMenu="showContextMenu"
            :actionManager="actionManager"
            :selectedIndex="selectedIndex"
            :listener="listener"
            :MAX_CANVAS_SOURCES="MAX_CANVAS_SOURCES"
            :audioEngine="audioEngine"
            :handleStageClick="handleStageClick"
            @selectNode="e => { selectedIndex = e }"
          />
        </div>
      </main>

      <!-- Right Sidebar -->
      <SidebarRight
        :listener="listener"
        :actionManager="actionManager"
        :selectedSource="selectedSource"
      />
      
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, provide, onMounted, onUnmounted } from 'vue'

// UI Components
import VueSlider from 'vue-3-slider-component'
import ToolbarControls from '@/components/ui/controls/ToolbarControls.vue'
import SoundLibrary from '@/components/ui/modals/SoundLibrary.vue'
import Help from '@/components/ui/modals/Help.vue'
import HeaderBar from '@/components/SoundRoom/HeaderBar.vue'
import SidebarLeft from '@/components/SoundRoom/SidebarLeft.vue'
import SidebarRight from '@/components/SoundRoom/SidebarRight.vue'
import MainCanvasStage from '@/components/SoundRoom/MainCanvasStage.vue'

// Core Classes
import Listener from '@/lib/Listener'
import AudioEngine from '@/lib/AudioEngine'
import Room from '@/lib/Room'
import ActionManager from '@/lib/ActionManager'

// Composables
import { useKeyboardControls } from '@/composables/useKeyboardControls'
import { useDragDropAudio } from '@/composables/useDragDropAudio'
import { useSelectedSource } from '@/composables/useSelectedSource'
import { setupAudioContext } from '@/composables/useAudioSetup'
import { useContextMenuLogic } from '@/composables/useContextMenuLogic'
import { registerCanvasActions, registerDraggableActions, setMaxLibSources } from '@/composables/useSoundRoomActions'

// State
const isHelpOpen = ref(false)
const isLibraryOpen = ref(false)
const selectedIndex = ref(null)
const draggedSource = ref(null)
const stageWrapper = ref(null)

const room = new Room()
const listener = reactive(new Listener())
const soundLibrarySources = ref([])
const MAX_LIB_SOURCES = 20
const MAX_CANVAS_SOURCES = 30
const loadedCanvasSoundSources = []

const audioEngine = new AudioEngine(loadedCanvasSoundSources)
const isPlaying = computed(() => audioEngine.isPlaying.value)
const masterVolumeProxy = computed({
  get: () => audioEngine.masterVolume.value,
  set: v => (audioEngine.masterVolume.value = v),
})

// Actions
const actionManager = new ActionManager()
const actionStackEmpty = computed(() => actionManager.actionStackEmpty.value)
const redoStackEmpty = computed(() => actionManager.redoStackEmpty.value)

// Selection
const { selectedSource } = useSelectedSource(audioEngine.soundSources, selectedIndex)
provide('selectedIndex', selectedIndex)
provide('selectedSource', selectedSource)

// Event Handlers
function handleStageClick(e) {
  if (e.target.getAttr('name') !== 'sound-node-part') {
    selectedIndex.value = null
  }
}

const handleAddLibrarySoundSource = async (src) => {
  await actionManager.doAction('add_draggable_sound_source', { src })
}

function handleDeleteLibrarySource(src) {
  actionManager.doAction('delete_draggable_sound_source', { src })
}
//TODO: fix play/pause not updating w OS controls 
//TODO: possibly add sound 'events' (progressive environment, temp node playbacks, visuals etc)
// Composable Logic
const { handleDragStart, handleDrop } = useDragDropAudio({
  draggedSource,
  actionManager,
  stageWrapper
})

const { showContextMenu, contextMenuActions } = useContextMenuLogic(
  selectedSource,
  stageWrapper,
  actionManager
)

const { onKeyDown, onKeyUp } = useKeyboardControls({
  listener,
  selectedIndex,
  selectedSource,
  soundSources: audioEngine.soundSources,
  actionManager,
  room,
})

registerCanvasActions(audioEngine, actionManager, listener, soundLibrarySources)
registerDraggableActions(audioEngine, actionManager, soundLibrarySources)
setMaxLibSources(MAX_LIB_SOURCES)
// Lifecycle
let audioContext = null
onMounted(() => {
  audioContext = setupAudioContext(audioEngine, listener)
})

onUnmounted(() => {
  audioEngine.dispose()
})
</script>
