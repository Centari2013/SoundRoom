<template>
  <div class="h-screen min-w-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white flex flex-col">
    <!-- Header -->
    <HeaderBar @openHelp="isHelpOpen = true" />

    <!-- Main Layout -->
    <div class="flex flex-1 overflow-hidden">
      <Help
        :isHelpOpen="isHelpOpen"
        @close="isHelpOpen = false"
      />

      <SoundLibrary
        v-bind="{
          isLibraryOpen,
          soundLibrarySources
        }"
        @close="isLibraryOpen = false"
        @load="handleAddLibrarySoundSource"
        @delete="handleDeleteLibrarySource"
      />

      <!-- Left Sidebar -->
      <SidebarLeft 
        class="min-w-[7.5rem] max-w-64 w-[20%] flex-shrink"
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
            v-bind="{
              room,
              handleDrop,
              onKeyDown,
              onKeyUp,
              contextMenuActions,
              showContextMenu,
              actionManager,
              selectedIndex,
              listener,
              audioEngine,
              handleStageClick
            }"
            @selectNode="e => { selectedIndex = e }"
          />
          <!-- Frosted Load/Save Overlay -->
          <div
            v-if="isLoadingRoom || isSavingRoom"
            class="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-white/30 dark:bg-black/40 z-50"
          >
            <div class="text-xl font-medium tracking-wide text-neutral-800 dark:text-white animate-pulse">
              {{ isLoadingRoom ? 'Loading your room...' : 'Saving your room...'}}
            </div>
          </div>
        </div>
      </main>

      <!-- Right Sidebar -->
      <SidebarRight
        class="min-w-[7.5rem] max-w-64 w-[20%] flex-shrink"
        :actionManager="actionManager"
        :selectedSource="selectedSource"
      />
    </div>
    <FooterBar
      @saveRoom="saveRoomLocal"
      @loadRoom="loadRoomLocal"
      v-bind="{
        isSaving: isSavingRoom,
        isLoading: isLoadingRoom
      }"
    />
  </div>
</template>

<script setup>
import { ref, computed, provide, onMounted, onUnmounted, shallowRef } from 'vue'

// Shared constants
const SOUND_NODE_PART_NAME = 'sound-node-part'

// UI Components
import VueSlider from 'vue-3-slider-component'
import ToolbarControls from '@/components/ui/controls/ToolbarControls.vue'
import SoundLibrary from '@/components/ui/modals/SoundLibrary.vue'
import Help from '@/components/ui/modals/Help.vue'
import HeaderBar from '@/components/SoundRoom/HeaderBar.vue'
import SidebarLeft from '@/components/SoundRoom/SidebarLeft.vue'
import SidebarRight from '@/components/SoundRoom/SidebarRight.vue'
import MainCanvasStage from '@/components/SoundRoom/MainCanvasStage.vue'
import FooterBar from '@/components/SoundRoom/FooterBar.vue'

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
import { useSaveAndLoadRoom } from '@/composables/useSaveAndLoadRoom';

// State
const isHelpOpen = ref(false)
const isLibraryOpen = ref(false)
const selectedIndex = ref(null)
const draggedSource = ref(null)
const stageWrapper = ref(null)

const room = ref(new Room())
const listener = ref(new Listener())
const soundLibrarySources = ref([])
const MAX_LIB_SOURCES = 20
const MAX_CANVAS_SOURCES = 30
const loadedCanvasSoundSources = [] // to be populated with sources loaded from last user session

const audioEngine = shallowRef(new AudioEngine(loadedCanvasSoundSources))
audioEngine.value.maxSourceCount = MAX_CANVAS_SOURCES

const isPlaying = computed(() => audioEngine.value.isPlaying.value)
const masterVolumeProxy = computed({
  get: () => audioEngine.value.masterVolume.value,
  set: v => (audioEngine.value.masterVolume.value = v),
})

// Actions
const actionManager = new ActionManager()
const actionStackEmpty = computed(() => actionManager.actionStackEmpty.value)
const redoStackEmpty = computed(() => actionManager.redoStackEmpty.value)

// Selection
const { selectedSource } = useSelectedSource(
  audioEngine,
  selectedIndex
)
provide('selectedIndex', selectedIndex)
provide('selectedSource', selectedSource)

// Event Handlers
function handleStageClick(e) {
  if (e.target.getAttr('name') !== SOUND_NODE_PART_NAME) { // if NOT part of a konva SoundSourceNode.vue group
    selectedIndex.value = null // deselect sound source node
  }
}

const handleAddLibrarySoundSource = async (src) => {
  await actionManager.doAction('add_draggable_sound_source', { src })
}

function handleDeleteLibrarySource(src) {
  actionManager.doAction('delete_draggable_sound_source', { src })
}

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
  soundSources: audioEngine.value.soundSources,
  actionManager,
  room,
})

const { saveRoomLocal, loadRoomLocal, isLoadingRoom, isSavingRoom } = useSaveAndLoadRoom({
  room,
  listener,
  soundLibrarySources,
  audioEngine, 
  actionManager
})

registerCanvasActions(audioEngine, actionManager, listener, soundLibrarySources)
registerDraggableActions(audioEngine, actionManager, soundLibrarySources)
setMaxLibSources(MAX_LIB_SOURCES)


onMounted(() => {
  setupAudioContext(audioEngine, listener)
})

onUnmounted(() => {
  audioEngine.value.dispose()
})
</script>
