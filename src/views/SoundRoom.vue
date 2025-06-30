<template>
  <div class="h-full bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white flex flex-col">
    <!-- Main Layout -->
    <div class="flex flex-1 overflow-hidden">
      

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
        <Toolbar
          :canPlay="audioEngine.soundSources.value.length > 0"
          :canUndo="!actionStackEmpty"
          :canRedo="!redoStackEmpty"
          :playing="isPlaying"
          :audioEngine="audioEngine"
          @undo="actionManager.undoLastAction"
          @redo="actionManager.redoLastAction"
          @togglePlay="isPlaying ? audioEngine.pauseAll() : audioEngine.playAll()"
          @update:masterVolume="audioEngine.masterVolume.value = $event"
          @update:roomName="room.name = $event"
          :roomName="room.name"
          :masterVolume="audioEngine.masterVolume.value"
        />

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
           <PulsingOverlay
            v-if="isLoadingRoom || isSavingRoom"
            :text="isLoadingRoom ? 'Loading your room...' : 'Saving your room...'"
            />
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
      @saveRoom="saveRoom"
      v-bind="{isSaving: isSavingRoom}"
    />
  </div>
  <RouterView/>
  <WelcomeOverlay
    v-if="showWelcomeOverlay"
  />

</template>

<script setup>
import { ref, computed, provide, onBeforeMount, onUnmounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
// Shared constants
const SOUND_NODE_PART_NAME = 'sound-node-part'

// UI Components
import Toolbar from '@/components/SoundRoom/Toolbar.vue'
import SoundLibrary from '@/components/ui/modals/SoundLibrary/SoundLibrary.vue'
import SidebarLeft from '@/components/SoundRoom/SidebarLeft/SidebarLeft.vue'
import SidebarRight from '@/components/SoundRoom/SidebarRight/SidebarRight.vue'
import MainCanvasStage from '@/components/SoundRoom/MainCanvasStage/MainCanvasStage.vue'
import FooterBar from '@/components/SoundRoom/FooterBar.vue'
import PulsingOverlay from '@/components/ui/overlays/PulsingOverlay.vue'
import WelcomeOverlay from '@/components/ui/overlays/WelcomeOverlay.vue'

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

const { saveRoom, loadRoom, isLoadingRoom, isSavingRoom } = useSaveAndLoadRoom({
  room,
  listener,
  soundLibrarySources,
  audioEngine, 
  actionManager
})

registerCanvasActions(audioEngine, actionManager, listener, soundLibrarySources)
registerDraggableActions(audioEngine, actionManager, soundLibrarySources)
setMaxLibSources(MAX_LIB_SOURCES)

const showWelcomeOverlay = ref(false)
onBeforeMount(() => {
  if (sessionStorage.getItem('justLoggedIn') === 'true') {
    sessionStorage.removeItem('justLoggedIn')
    showWelcomeOverlay.value = true
    const router = useRouter()
    //router.push('/welcome')
  }
  setupAudioContext(audioEngine, listener)
})

onUnmounted(() => {
  audioEngine.value.dispose()
})
</script>
