<template>

  <Onboarding :startTour="startTour" />
  <div class="h-full bg-surface-app text-text-primary flex flex-col">
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
        <div class="flex-1 relative overflow-hidden bg-[var(--color-bg-surface)] flex items-center justify-center border-t border-[var(--color-border-subtle)]">
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
    @finished="onWelcomeFinished"
  />

  <PulsingOverlay
    v-if="showInitOverlay"
    :text="'Initializing Your SoundRoom...'"
    @done="showInitOverlay = false"
  />
  <!-- Audio Resume Overlay -->
  <div
    v-if="showAudioResumeOverlay"
    class="absolute inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm text-white text-xl cursor-pointer"
    @click="resumeAudio"
  >
    Click to enable audio
  </div>


</template>

<script setup>
import Onboarding from '@/components/ui/context/Onboarding.vue'
import { watch } from 'vue';

defineOptions({
  name: 'SoundRoomRoot',
})
import { ref, provide, onBeforeMount, onUnmounted, onMounted } from 'vue'

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
import { useRoute } from 'vue-router'
import { resetRoomState } from "@/utils/resetRoomState";
import { supabase } from '@/utils/supabase'

// State
const selectedIndex = ref(null)
const draggedSource = ref(null)
const route = useRoute()
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

const welcomeDone = ref(false)

function onWelcomeFinished() {
  welcomeDone.value = true
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
const { user, isAuthenticated } = useAuth()

const preferenceDefaults = Object.freeze({
  autoResumePlayback: false,
  showInterfaceTips: true
})

const LOCAL_PREF_KEY = 'soundroom.userPreferences'

const userPreferences = ref({ ...preferenceDefaults })
const preferencesLoaded = ref(false)

const showAudioResumeOverlay = ref(true)

function resumeAudio() {
  try {
    engineStore.resumeAudioContext()
    showAudioResumeOverlay.value = false
  } catch (err) {
    console.warn("Failed to resume audio context:", err)
  }
}

function applyPreferences(source = {}) {
  Object.entries(preferenceDefaults).forEach(([key, fallback]) => {
    userPreferences.value[key] = source[key] ?? fallback
  })
}

function loadCachedPreferences() {
  try {
    const stored = localStorage.getItem(LOCAL_PREF_KEY)
    if (!stored) return false

    const parsed = JSON.parse(stored)
    applyPreferences(parsed)
    return true
  } catch (error) {
    console.warn('Failed to parse cached preferences', error)
    return false
  }
}

async function hydrateUserPreferences({ forceLocal = false } = {}) {
  if (preferencesLoaded.value) {
    if (forceLocal) {
      loadCachedPreferences()
    }

    return userPreferences.value
  }

  if (!loadCachedPreferences() && user.value?.id) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('settings')
        .eq('id', user.value.id)
        .maybeSingle()

      if (error) throw error

      const preferences = data?.settings?.preferences ?? {}
      applyPreferences(preferences)
      localStorage.setItem(LOCAL_PREF_KEY, JSON.stringify(userPreferences.value))
    } catch (err) {
      console.warn('Failed to load preferences from Supabase, using defaults', err)
      applyPreferences(preferenceDefaults)
    }
  }

  preferencesLoaded.value = true
  return userPreferences.value
}

onBeforeMount(async () => {
  registerSoundRoomActions()
  
  if (sessionStorage.getItem('justLoggedIn') === 'true') {
    sessionStorage.removeItem('justLoggedIn')
    showWelcomeOverlay.value = true
    const tempSoundRoomData = localStorage.getItem('tempSoundRoomData')
    if (tempSoundRoomData) {
      loadRoomLocal()
      saveRoom()
    } 
  }
  
  engineStore.setupAudioContext()
  engineStore.loadIR('cathedral', '/impulses/1st_baptist_nashville_far_wide.wav') // Load the default impulse response
  roomStore.setExistingRoomNames() // Initialize with empty names
  roomStore.room.name.value = 'Untitled Room' // Default room name
  roomStore.getSaveSnapshot({ markAsInitial: true }) // Initialize stored snapshots for save/empty comparisons
})

const startTour = ref(false);

function waitForWelcome() {
  return new Promise((resolve) => {
    const stop = watch(welcomeDone, (done) => {
      if (done) {
        stop()
        resolve()
      }
    })
  })
}

let routeUnwatcher = null;

onMounted(async() => {
  routeUnwatcher = watch(
    () => route.path,
    async (newPath) => {

      // Only reset room/canvas state when fully leaving the /app workspace.
      // Opening modal child routes like /app/sound-library should not tear down audio/canvas state.
      if (!newPath.startsWith('/app')) {
        startTour.value = false;
        resetRoomState()
        audioEngine.value?.dispose()
        cacheStore.audioCacheManager.clearMemoryCache()
      }
    },
    { immediate: true }
  )
    
    // If welcome overlay exists, wait for it
    if (showWelcomeOverlay.value && !welcomeDone.value) {
      await waitForWelcome()
    }

    const preferences = await hydrateUserPreferences({ forceLocal: true })
    if (preferences.autoResumePlayback) {
      await loadMostRecentRoom()

      if (audioEngine.value?.getAudioContext().state === 'suspended') {
        try {
          await audioEngine.value.getAudioContext().resume()
        } catch (error) {
          console.warn('Failed to auto-resume audio context', error)
        }
      }
      showAudioResumeOverlay.value = audioEngine.value?.getAudioContext().state === 'suspended'
    } else {
      showAudioResumeOverlay.value = false;
    }

  let onboardingCompleted = localStorage.getItem('soundroom_onboarding_completed') === 'true'

  if (!onboardingCompleted && isAuthenticated.value && user.value?.id) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', user.value.id)
        .maybeSingle()

      if (error) throw error

      onboardingCompleted = data?.onboarding_completed === true
      if (onboardingCompleted) {
        localStorage.setItem('soundroom_onboarding_completed', 'true')
      }
    } catch (err) {
      console.warn('Failed to fetch onboarding status, falling back to local storage', err)
    }
  }

  if (onboardingCompleted) return;

  if (route.path == '/app') {
    startTour.value = true
    return
  }

  const routeUnwatch = watch(
    () => route.path,
    async (newPath) => {

      // Only start on /app
      if (newPath !== '/app') {
        startTour.value = false
        return
      }

      // Now it's safe to start
      startTour.value = true
      routeUnwatch() // only run once
    }
  )
})



onUnmounted(() => {
  if (routeUnwatcher) {
    routeUnwatcher()
  }
  resetRoomState()
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
  --vignette-inner: rgba(var(--color-text-inverse-rgb), 0.06);
  --vignette-middle: rgba(var(--color-text-inverse-rgb), 0.04);
  --vignette-outer: rgba(var(--color-text-inverse-rgb), 0.08);
  --vignette-shadow: inset 0 0 70px rgba(var(--color-text-inverse-rgb), 0.12);

  background: radial-gradient(circle at center, var(--vignette-inner) 0%, var(--vignette-middle) 38%, var(--vignette-outer) 100%);
  box-shadow: var(--vignette-shadow);
}
[data-theme="dark"] .canvas-vignette {
  --vignette-inner: rgba(var(--color-text-primary-rgb), 0.1);
  --vignette-middle: rgba(var(--color-text-primary-rgb), 0.06);
  --vignette-outer: rgba(var(--color-text-inverse-rgb), 0.48);
  --vignette-shadow: inset 0 0 140px rgba(var(--color-text-inverse-rgb), 0.42);
}
</style>
