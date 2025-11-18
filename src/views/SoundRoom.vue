<template>
  <div class="h-full bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white flex flex-col">
    <Transition name="mobile-panel">
      <div
        v-if="mobilePanel"
        class="sm:hidden fixed inset-0 z-40 flex flex-col justify-end pointer-events-none"
      >
        <button
          type="button"
          class="absolute inset-0 w-full h-full bg-black/40 pointer-events-auto"
          aria-label="Close mobile panel overlay"
          @click="toggleMobilePanel(null)"
        ></button>
        <div
          class="relative pointer-events-auto bg-white dark:bg-neutral-950 rounded-t-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800"
        >
          <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
            <p class="text-sm font-semibold">
              {{ mobilePanel === 'library' ? 'Sound Library' : 'Sound Settings' }}
            </p>
            <button
              type="button"
              class="min-h-[44px] px-3 text-sm font-medium text-blue-600 dark:text-blue-400"
              @click="toggleMobilePanel(null)"
            >
              Close
            </button>
          </div>
          <div
            :key="mobilePanel"
            class="overflow-y-auto max-h-[70vh]"
          >
            <SidebarLeft
              v-if="mobilePanel === 'library'"
              id="mobile-library-panel"
              class="border-0 rounded-t-3xl"
              :MAX_SOURCES="MAX_LIB_SOURCES"
              :handleDragStart="handleDragStart"
              :listener="listener"
            />
            <SidebarRight
              v-else
              id="mobile-inspector-panel"
              class="border-0 rounded-t-3xl"
              v-bind="{
                selectedSource
              }"
            />
          </div>
        </div>
      </div>
    </Transition>

    <!-- Main Layout -->
    <div
      class="flex flex-1 overflow-y-auto sm:overflow-hidden flex-col sm:flex-row"
    >
      <!-- Desktop left sidebar -->
      <SidebarLeft
        class="hidden sm:flex sm:w-[20%] min-w-[7.5rem] max-w-64 flex-shrink-0"
        :MAX_SOURCES="MAX_LIB_SOURCES"
        :handleDragStart="handleDragStart"
        :listener="listener"
      />

      <!-- Canvas + Controls -->
      <main class="flex-1 flex flex-col min-h-[20rem]">
        <!-- Mobile panel toggles -->
        <div class="sm:hidden border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 py-3 flex gap-3 sticky top-0 z-10">
          <button
            type="button"
            class="flex-1 min-h-[44px] rounded-full border text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            :class="[
              mobilePanel === 'library'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-transparent border-neutral-300 text-neutral-900 dark:text-white dark:border-neutral-700'
            ]"
            aria-controls="mobile-library-panel"
            :aria-expanded="mobilePanel === 'library'"
            @click="toggleMobilePanel('library')"
          >
            Library
          </button>
          <button
            type="button"
            class="flex-1 min-h-[44px] rounded-full border text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            :class="[
              mobilePanel === 'inspector'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-transparent border-neutral-300 text-neutral-900 dark:text-white dark:border-neutral-700'
            ]"
            aria-controls="mobile-inspector-panel"
            :aria-expanded="mobilePanel === 'inspector'"
            @click="toggleMobilePanel('inspector')"
          >
            Inspector
          </button>
        </div>

        <!-- Toolbar -->
        <Toolbar/>

        <!-- Canvas Area -->
        <div class="flex-1 bg-neutral-200 dark:bg-black relative flex flex-col">
          <!-- Scrollable canvas wrapper for small screens -->
          <div class="flex-1 overflow-y-auto overflow-x-auto sm:overflow-visible overscroll-contain">
            <div class="min-h-full flex items-center justify-center p-4 sm:p-6">
              <MainCanvasStage
                class="shrink-0"
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
            </div>
          </div>
          <!-- Frosted Load/Save Overlay -->
          <PulsingOverlay
            v-if="isLoadingRoom || isSavingRoom"
            :text="isLoadingRoom ? 'Loading your room...' : 'Saving your room...'"
          />
        </div>
      </main>

      <!-- Desktop right sidebar -->
      <SidebarRight
        class="hidden sm:flex sm:w-[20%] min-w-[7.5rem] max-w-64 flex-shrink-0"
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
import { ref, provide, onBeforeMount, onMounted, onUnmounted, watch } from 'vue'

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
const mobilePanel = ref(null)
const isDesktopViewport = ref(false)
let desktopViewportQuery
let desktopViewportHandler

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

onMounted(() => {
  if (typeof window === 'undefined' || !('matchMedia' in window)) {
    return
  }

  desktopViewportQuery = window.matchMedia('(min-width: 640px)')

  desktopViewportHandler = (event) => {
    isDesktopViewport.value = event.matches
    if (event.matches) {
      mobilePanel.value = null
      if (typeof document !== 'undefined') {
        document.body.style.overflow = ''
      }
    }
  }

  desktopViewportHandler(desktopViewportQuery)
  desktopViewportQuery.addEventListener('change', desktopViewportHandler)
})

watch(mobilePanel, (panel) => {
  if (typeof document === 'undefined') return
  if (isDesktopViewport.value) {
    document.body.style.overflow = ''
    return
  }
  document.body.style.overflow = panel ? 'hidden' : ''
})

function toggleMobilePanel(panel) {
  mobilePanel.value = mobilePanel.value === panel ? null : panel
}

onUnmounted(() => {
  unregisterSoundRoomActions()
  audioEngine.value.dispose()
  // Revoke object URLs to avoid memory leaks
  cacheStore.audioCacheManager.clearMemoryCache()
  // Uncomment to also wipe IndexedDB cache if long-term storage isn't desired
  // void cacheStore.audioCacheManager.clearPersistentCache()
  if (desktopViewportQuery && desktopViewportHandler) {
    desktopViewportQuery.removeEventListener('change', desktopViewportHandler)
  }
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})
</script>

<style scoped>
.mobile-panel-enter-active,
.mobile-panel-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.mobile-panel-enter-from,
.mobile-panel-leave-to {
  opacity: 0;
  transform: translateY(1rem);
}
</style>
