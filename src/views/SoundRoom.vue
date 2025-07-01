<template>
  <div class="h-full bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white flex flex-col">
    <!-- Main Layout -->
    <div class="flex flex-1 overflow-hidden">
      

      <SoundLibrary
        v-bind="{
          isLibraryOpen
        }"
        @close="isLibraryOpen = false"
      />

      <!-- Left Sidebar -->
      <SidebarLeft 
        class="min-w-[7.5rem] max-w-64 w-[20%] flex-shrink"
        :MAX_SOURCES="MAX_LIB_SOURCES"
        :handleDragStart="handleDragStart"
        :addSourceClick="() => { isLibraryOpen = true }"
        :listener="listener"
      />

      <!-- Canvas + Controls -->
      <main class="flex-1 flex flex-col">
        <!-- Toolbar -->
        <Toolbar/>

        <!-- Canvas Area -->
        <div class="flex-1 bg-neutral-200 dark:bg-black flex items-center justify-center">
          <MainCanvasStage 
            ref="stageWrapper"
            v-bind="{
              handleDrop,
              onKeyDown,
              onKeyUp,
              contextMenuActions,
              showContextMenu,
              selectedIndex,
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
        v-bind="{
          selectedSource
        }"
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
import { ref, provide, onBeforeMount, onUnmounted } from 'vue'
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

// Store
import { useRoomStore } from '@/stores/useRoomStore'

// Composables
import { useKeyboardControls } from '@/composables/useKeyboardControls'
import { useDragDropAudio } from '@/composables/useDragDropAudio'
import { useSelectedSource } from '@/composables/useSelectedSource'
import { useContextMenuLogic } from '@/composables/useContextMenuLogic'
import { registerSoundRoomActions, unregisterSoundRoomActions, setMaxLibSources } from '@/composables/useSoundRoomActions'
import { useSaveAndLoadRoom } from '@/composables/useSaveAndLoadRoom';
import { storeToRefs } from 'pinia'

// State
const isLibraryOpen = ref(false)
const selectedIndex = ref(null)
const draggedSource = ref(null)
const stageWrapper = ref(null)

const store = useRoomStore()
const { listener, audioEngine, } = storeToRefs(store)

const MAX_LIB_SOURCES = 20
const MAX_CANVAS_SOURCES = 30


store.setMaxCanvasSources(MAX_CANVAS_SOURCES)


// Selection
const { selectedSource } = useSelectedSource(selectedIndex)
provide('selectedIndex', selectedIndex)
provide('selectedSource', selectedSource)

// Event Handlers
function handleStageClick(e) {
  if (e.target.getAttr('name') !== SOUND_NODE_PART_NAME) { // if NOT part of a konva SoundSourceNode.vue group
    selectedIndex.value = null // deselect sound source node
  }
}


// Composable Logic
const { handleDragStart, handleDrop } = useDragDropAudio({
  draggedSource,
  stageWrapper
})

const { showContextMenu, contextMenuActions } = useContextMenuLogic(selectedSource,stageWrapper)

const { onKeyDown, onKeyUp } = useKeyboardControls({selectedIndex, selectedSource})

const { saveRoom, isLoadingRoom, isSavingRoom, loadRoomLocal } = useSaveAndLoadRoom()

setMaxLibSources(MAX_LIB_SOURCES)

const showWelcomeOverlay = ref(false)
onBeforeMount(() => {
  registerSoundRoomActions()
  store.clearSoundLibrarySources() // Clear any previous sound library sources
  if (sessionStorage.getItem('justLoggedIn') === 'true') {
    sessionStorage.removeItem('justLoggedIn')
    showWelcomeOverlay.value = true
    const tempSoundRoomData = localStorage.getItem('tempSoundRoomData')
    if (tempSoundRoomData) {
      loadRoomLocal()
      saveRoom() // Save the room data immediately after loading from temp
    }
    //const router = useRouter()
    //router.push('/welcome')
  }
  store.setupAudioContext()
})

onUnmounted(() => {
  unregisterSoundRoomActions()
  audioEngine.value.dispose()
  // Revoke object URLs to avoid memory leaks
  store.audioCacheManager.clearMemoryCache()
  // Uncomment to also wipe IndexedDB cache if long-term storage isn't desired
  // void store.audioCacheManager.clearPersistentCache()
})
</script>
