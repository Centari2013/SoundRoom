<template>
  <div class="min-h-screen min-w-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white flex flex-col">
    <!-- Header -->
    <HeaderBar @openHelp="isHelpOpen = true" />

    <!-- Main Layout -->
    <div class="flex flex-1 overflow-hidden">
      <Help 
      :isHelpOpen="isHelpOpen"
      @close="isHelpOpen = false"
      />
      <SoundLibrary 
      :isLibraryOpen="isLibraryOpen" 
      :sounds="[]"
      @close="isLibraryOpen = false"
      @load="handleAddLibrarySoundSource"
      />
      <!-- Left Sidebar -->
      <SidebarLeft 
        :soundLibrarySources="soundLibrarySources"
        :MAX_SOURCES="MAX_SOURCES"
        :audioEngine="audioEngine"
        :handleDragStart="handleDragStart"
        :addSourceClick="() => {isLibraryOpen = true}"
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
          <div 
            ref="stageWrapper"
            class="border-2 border-neutral-400 dark:border-neutral-700 flex items-center justify-center"
            :class="`w-[${room.width}px] h-[${room.height}px]`"
            @dragover.prevent
            @drop="handleDrop"
            @keydown="onKeyDown"
            @keyup="onKeyUp"
            tabindex="0" 
          >
          <ContextMenu ref="contextMenuRef" :functionList="contextMenuActions"/>
          <v-stage
            :config="{ width: room.width, height: room.height }"
            @contextmenu="(e) => e.evt.preventDefault()"
            @mousedown="handleStageClick"
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
              @select="selectedIndex = $event"
              @contextmenu="showContextMenu"
            />
            <ListenerNode
              :listener="listener"
              :actionManager="actionManager"
              :room="room"
            />
          </v-layer>

          </v-stage>

          </div>
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
import { ref, onMounted, computed, reactive, provide, onUnmounted } from 'vue'

// UI Components
import VueSlider from 'vue-3-slider-component'
import ContextMenu from '@/components/ui/context/ContextMenu.vue'
import ToolbarControls from '@/components/ui/controls/ToolbarControls.vue'
import SelectedSourcePanel from '@/components/ui/panels/SelectedSourcePanel.vue'
import ListenerNode from '@/components/ui/canvas/ListenerNode.vue'
import SoundSourceNode from '@/components/ui/canvas/SoundSourceNode.vue'
import SoundLibrary from '@/components/ui/modals/SoundLibrary.vue'
import Help from '@/components/ui/modals/Help.vue'
import HeaderBar from '@/components/SoundRoom/HeaderBar.vue'
import SidebarLeft from '@/components/SoundRoom/SidebarLeft.vue'
import SidebarRight from '@/components/SoundRoom/SidebarRight.vue'

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
import { registerCanvasActions, registerDraggableActions } from '@/composables/useSoundRoomActions'



// ===================================
// Help Modal
// ===================================
const isHelpOpen = ref(false)
// ===================================
// Library
// ===================================
const isLibraryOpen = ref(false)
const handleAddLibrarySoundSource = async (src) => {
  await actionManager.doAction('add_draggable_sound_source', { src })
}
function handleDeleteLibrarySource(src){
 actionManager.doAction('delete_draggable_sound_source', { src })
}

// ===================================
// Global Refs & Reactive State
// ===================================
const canvasCtx = ref(null)
const draggedSource = ref(null)
const contextMenuRef = ref(null)
const stageWrapper = ref(null)
const selectedIndex = ref(null)

provide('selectedIndex', selectedIndex)

const room = new Room()
const listener = reactive(new Listener())
const soundLibrarySources = ref([])
const MAX_SOURCES = 20
const loadedCanvasSoundSources = []


// ===================================
// Engine, State, Selection
// ===================================
const audioEngine = new AudioEngine(loadedCanvasSoundSources, canvasCtx)

const masterVolumeProxy = computed({
  get: () => audioEngine.masterVolume.value,
  set: v => (audioEngine.masterVolume.value = v),
})

const isPlaying = computed(() => audioEngine.isPlaying.value)
let audioContext = null

const { selectedSource } = useSelectedSource(audioEngine.soundSources, selectedIndex)
provide('selectedSource', selectedSource)

const actionManager = new ActionManager()
const actionStackEmpty = computed(() => actionManager.actionStackEmpty.value)
const redoStackEmpty = computed(() => actionManager.redoStackEmpty.value)


// ===================================
// Handlers & Interaction Logic
// ===================================
// Click logic
function handleStageClick(e) {
  if (e.target.getAttr('name') !== 'sound-node-part') {
    selectedIndex.value = null
  }
}

const { showContextMenu, contextMenuActions } = useContextMenuLogic(selectedSource, contextMenuRef, actionManager)


// Drag and drop
const { handleDragStart, handleDrop } = useDragDropAudio({
  draggedSource,
  actionManager,
  stageWrapper,
})



// Keyboard controls
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

// ===================================
// Lifecycle
// ===================================
onMounted(() => {
  audioContext = setupAudioContext(audioEngine, listener)
})

onUnmounted(() => {
  audioEngine.dispose()
})
</script>


