<template>
  <div class="h-full bg-[var(--lm-bg-0)] text-[var(--lm-text-0)] dark:bg-neutral-950 dark:text-white flex flex-col">
    <!-- Main Layout -->
    <div class="flex flex-1 overflow-hidden">

      <!-- Left Sidebar -->
      <SidebarLeft 
        class="min-w-[7.5rem] max-w-64 w-[20%] flex-shrink"
        :MAX_SOURCES="MAX_LIB_SOURCES"
        :handleDragStart="handleDragStart"
        :listener="listener"
      />

      <!-- Canvas + Controls -->
      <main class="flex-1 flex flex-col">
        <!-- Toolbar -->
        <Toolbar/>

        <!-- Canvas Area -->
        <div class="flex-1 relative overflow-hidden bg-[var(--lm-bg-1)] dark:bg-neutral-900 flex items-center justify-center border-t border-[var(--lm-border)]/80 dark:border-0">
          <div class="pointer-events-none absolute inset-0 canvas-vignette" aria-hidden="true"></div>
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
import SidebarLeft from '@/components/SoundRoom/SidebarLeft/SidebarLeft.vue'
import SidebarRight from '@/components/SoundRoom/SidebarRight/SidebarRight.vue'
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

<style scoped>
.canvas-vignette {
  --vignette-inner: rgba(0, 0, 0, 0.06);
  --vignette-middle: rgba(0, 0, 0, 0.04);
  --vignette-outer: rgba(0, 0, 0, 0.08);
  --vignette-shadow: inset 0 0 70px rgba(0, 0, 0, 0.12);

  background: radial-gradient(circle at center, var(--vignette-inner) 0%, var(--vignette-middle) 38%, var(--vignette-outer) 100%);
  box-shadow: var(--vignette-shadow);
}

@media (prefers-color-scheme: dark) {
  .canvas-vignette {
    --vignette-inner: rgba(224, 224, 224, 0.1);
    --vignette-middle: rgba(255, 255, 255, 0.03);
    --vignette-outer: rgba(0, 0, 0, 0.48);
    --vignette-shadow: inset 0 0 140px rgba(0, 0, 0, 0.42);
  }
}
</style>
