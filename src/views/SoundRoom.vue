<template>
  <div class="h-full bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white flex flex-col">
    <!-- Main Layout -->
    <div class="flex-1 flex flex-col overflow-y-auto md:overflow-hidden">
      <div class="flex flex-col md:flex-row md:flex-1 md:overflow-hidden">

        <!-- Left Sidebar (Desktop) -->
        <SidebarLeft
          class="hidden md:flex min-w-[7.5rem] max-w-64 w-[20%] flex-shrink"
          :MAX_SOURCES="MAX_LIB_SOURCES"
          :handleDragStart="handleDragStart"
          :listener="listener"
        />

        <!-- Canvas + Controls -->
        <main class="flex flex-col order-2 md:order-none md:flex-1">
          <!-- Toolbar (Desktop) -->
          <div class="hidden md:block">
            <Toolbar />
          </div>

          <!-- Canvas Area -->
          <div class="relative md:flex-1 bg-neutral-200 dark:bg-black">
            <div
              class="flex h-[80vh] min-h-[70vh] max-h-[90vh] w-full items-center justify-center overflow-auto touch-pan-y touch-pinch-zoom md:h-full md:min-h-0 md:max-h-none md:overflow-hidden"
            >
              <MainCanvasStage
                v-bind="{
                  handleDrop,
                  onKeyDown,
                  onKeyUp,
                  contextMenuActions,
                  showContextMenu,
                  selectedIndex,
                  handleStageClick
                }"
                @selectNode="e => {
                  selectedIndex = e
                }"
              />
            </div>
            <!-- Frosted Load/Save Overlay -->
            <PulsingOverlay
              v-if="isLoadingRoom || isSavingRoom"
              :text="isLoadingRoom ? 'Loading your room...' : 'Saving your room...'"
            />
          </div>

          <!-- Mobile Controls -->
          <div class="md:hidden flex flex-col gap-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
            <MobileToolbar />
            <SourceDrawer
              v-model:open="isSourceDrawerOpen"
              :MAX_SOURCES="MAX_LIB_SOURCES"
              :handleDragStart="handleDragStart"
              :listener="listener"
            />
          </div>
        </main>

        <!-- Right Sidebar (Desktop) -->
        <SidebarRight
          class="hidden md:flex min-w-[7.5rem] max-w-64 w-[20%] flex-shrink"
          v-bind="{
            selectedSource
          }"
        />
      </div>
    </div>

    <SelectedSourceDrawer
      v-if="selectedSource"
      class="md:hidden"
      :selected-source="selectedSource"
      @close="selectedIndex = null"
    />

    <FooterBar
      :on-save="saveRoom"
      v-bind="{ isSaving: isSavingRoom }"
    />
  </div>
  <RouterView/>
  <WelcomeOverlay
    v-if="showWelcomeOverlay"
  />
  <PulsingOverlay
    v-if="showInitOverlay"
    :text="'Initializing Your SoundRoom...'"
    @done="showInitOverlay = false"
  />

</template>

<script setup>
defineOptions({
  name: 'SoundRoomRoot',
})
import { ref, provide, onBeforeMount, onUnmounted } from 'vue'

// Shared constants
const SOUND_NODE_PART_NAME = 'sound-node-part'

// UI Components
import Toolbar from '@/components/SoundRoom/Toolbar.vue'
import MobileToolbar from '@/components/SoundRoom/MobileToolbar.vue'
import SidebarLeft from '@/components/SoundRoom/SidebarLeft/SidebarLeft.vue'
import SidebarRight from '@/components/SoundRoom/SidebarRight/SidebarRight.vue'
import SourceDrawer from '@/components/SoundRoom/SourceDrawer.vue'
import SelectedSourceDrawer from '@/components/SoundRoom/SelectedSourceDrawer.vue'
import MainCanvasStage from '@/components/SoundRoom/MainCanvasStage/MainCanvasStage.vue'
import FooterBar from '@/components/SoundRoom/FooterBar.vue'
import PulsingOverlay from '@/components/ui/overlays/PulsingOverlay.vue'
import WelcomeOverlay from '@/components/ui/overlays/WelcomeOverlay.vue'

// Store
import { useRoomStore } from '@/stores/useRoomStore'
import { useListenerStore } from '@/stores/useListenerStore'
import { useAudioEngineStore } from '@/stores/useAudioEngineStore'
import { useAudioCacheStore } from '@/stores/useAudioCacheStore'

// Composables
import { useKeyboardControls } from '@/composables/useKeyboardControls'
import { useDragDropAudio } from '@/composables/useDragDropAudio'
import { useSelectedSource } from '@/composables/useSelectedSource'
import { useContextMenuLogic } from '@/composables/useContextMenuLogic'
import { registerSoundRoomActions, unregisterSoundRoomActions, setMaxLibSources } from '@/composables/useSoundRoomActions'
import { useSaveAndLoadRoom } from '@/composables/useSaveAndLoadRoom';
import { useAuth } from '@/composables/useAuth'
import { storeToRefs } from 'pinia'

// State
const selectedIndex = ref(null)
const draggedSource = ref(null)
const isSourceDrawerOpen = ref(false)

const roomStore = useRoomStore()
const listenerStore = useListenerStore()
const engineStore = useAudioEngineStore()
const cacheStore = useAudioCacheStore()
const { listener } = storeToRefs(listenerStore)
const { audioEngine } = storeToRefs(engineStore)

const MAX_LIB_SOURCES = 20
const MAX_CANVAS_SOURCES = 30


engineStore.setMaxCanvasSources(MAX_CANVAS_SOURCES)


// Selection
const { selectedSource } = useSelectedSource(selectedIndex)
provide('selectedIndex', selectedIndex)
provide('selectedSource', selectedSource)

// Event Handlers
/**
 * Deselect the currently active sound source when the user clicks
 * on an empty area of the canvas stage.
 *
 * @param {import('konva/lib/Node').KonvaEventObject<MouseEvent>} e - stage click event
 * @returns {void}
 */
function handleStageClick(e) {
  if (e.target.getAttr('name') !== SOUND_NODE_PART_NAME) { // if NOT part of a konva SoundSourceNode.vue group
    selectedIndex.value = null // deselect sound source node
  }
}


// Composable Logic
const { handleDragStart, handleDrop } = useDragDropAudio({
  draggedSource
})

const { showContextMenu, contextMenuActions } = useContextMenuLogic(selectedSource)

const { onKeyDown, onKeyUp } = useKeyboardControls({selectedIndex, selectedSource})

const { saveRoom, isLoadingRoom, isSavingRoom, loadRoomLocal, loadMostRecentRoom } = useSaveAndLoadRoom()

setMaxLibSources(MAX_LIB_SOURCES)

const showWelcomeOverlay = ref(false)
const showInitOverlay = ref(false)
onBeforeMount(async () => {
  registerSoundRoomActions()
  const { isAuthenticated } = useAuth()
  if (sessionStorage.getItem('justLoggedIn') === 'true') {
    sessionStorage.removeItem('justLoggedIn')
    showWelcomeOverlay.value = true
    const tempSoundRoomData = localStorage.getItem('tempSoundRoomData')
    if (tempSoundRoomData) {
      loadRoomLocal()
      saveRoom()
    } else {
      // auto-load most recent room if available
      if (isAuthenticated.value) {
        // leave commented out until resume lastplaying sources is implemented to combat:
        //Uncaught (in promise) DOMException: The play method is not allowed by the user agent 
        // or the platform in the current context, possibly because the user denied permission.

        //loadMostRecentRoom()
      }
    }
    //const router = useRouter()
    //router.push('/welcome')
  } else {
    // auto-load most recent room if available
    if (isAuthenticated.value) {
      // leave commented out until resume lastplaying sources is implemented to combat:
      //Uncaught (in promise) DOMException: The play method is not allowed by the user agent 
      // or the platform in the current context, possibly because the user denied permission.
      //loadMostRecentRoom()
    }
  }
  
  engineStore.setupAudioContext()
  engineStore.loadIR('cathedral', '/impulses/1st_baptist_nashville_far_wide.wav') // Load the default impulse response
  roomStore.setExistingRoomNames() // Initialize with empty names
  roomStore.room.name.value = 'Untitled Room' // Default room name
  roomStore.getSaveSnapshot({ markAsInitial: true }) // Initialize stored snapshots for save/empty comparisons
})

onUnmounted(() => {
  unregisterSoundRoomActions()
  audioEngine.value.dispose()
  // Revoke object URLs to avoid memory leaks
  cacheStore.audioCacheManager.clearMemoryCache()
  // Uncomment to also wipe IndexedDB cache if long-term storage isn't desired
  // void cacheStore.audioCacheManager.clearPersistentCache()
})
</script>
