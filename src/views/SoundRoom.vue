<template>

  <Onboarding :startTour="startTour" />
  <div class="h-full w-full min-h-0 min-w-0 overflow-hidden bg-surface-app text-text-primary flex flex-col">
    <!-- Main Layout -->
    <div class="flex flex-1 min-h-0 min-w-0 overflow-hidden">

      <!-- Left Sidebar -->
      <SidebarLeft 
        class="min-w-[7.5rem] max-w-64 w-[20%] flex-shrink-0"
        :MAX_SOURCES="MAX_LIB_SOURCES"
        :handleDragStart="handleDragStart"
        :listener="listener"
      />

      <!-- Canvas + Controls -->
      <main class="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
        <!-- Toolbar -->
        <Toolbar/>

        <!-- Canvas Area -->
        <div class="flex-1 min-h-0 min-w-0 relative overflow-hidden bg-[var(--color-bg-surface)] flex items-center justify-center border-t border-[var(--color-border-subtle)]">
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
        class="min-w-[7.5rem] max-w-64 w-[20%] flex-shrink-0"
        v-bind="{
          selectedSource
        }"
      />
    </div>
    <Transition
      :css="false"
      @enter="onTimelineEnter"
      @leave="onTimelineLeave"
    >
      <TimelinePanel v-if="timelineOpen && canUseTimeline" />
    </Transition>
    <FooterBar
      :on-save="saveRoom"
      :timeline-open="timelineOpen"
      :on-toggle-timeline="toggleTimeline"
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
import { computed, getCurrentInstance, onBeforeMount, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import VueKonva from 'vue-konva'

defineOptions({
  name: 'SoundRoomRoot',
})
import { gsap } from 'gsap'

// Shared constants
const SOUND_NODE_PART_NAME = 'sound-node-part'

// UI Components
import Toolbar from '@/components/SoundRoom/Toolbar.vue'
import SidebarLeft from '@/components/SoundRoom/SidebarLeft/SidebarLeft.vue'
import SidebarRight from '@/components/SoundRoom/SidebarRight/SidebarRight.vue'
import MainCanvasStage from '@/components/SoundRoom/MainCanvasStage/MainCanvasStage.vue'
import FooterBar from '@/components/SoundRoom/FooterBar.vue'
import TimelinePanel from '@/components/SoundRoom/Timeline/TimelinePanel.vue'
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
import { useEntitlements } from '@/composables/useEntitlements'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { resetRoomState } from "@/utils/resetRoomState";
import { supabase } from '@/utils/supabase'

const app = getCurrentInstance()?.appContext?.app
if (app && !app.config.globalProperties.$soundRoomKonvaInstalled) {
  app.use(VueKonva)
  app.config.globalProperties.$soundRoomKonvaInstalled = true
}

// State
const selectedIndex = ref(null)
const draggedSource = ref(null)
const timelineOpen = ref(false)
const route = useRoute()
const roomStore = useRoomStore()
const listenerStore = useListenerStore()
const engineStore = useAudioEngineStore()
const cacheStore = useAudioCacheStore()
const { listener } = storeToRefs(listenerStore)
const { audioEngine } = storeToRefs(engineStore)
const { canAccess } = useEntitlements()
const canUseTimeline = computed(() => canAccess('timelineScheduler'))

const MAX_LIB_SOURCES = 20
const MAX_CANVAS_SOURCES = 30


engineStore.setMaxCanvasSources(MAX_CANVAS_SOURCES)

function toggleTimeline() {
  if (!canUseTimeline.value) {
    timelineOpen.value = false
    return
  }

  timelineOpen.value = !timelineOpen.value
}

watch(() => [canUseTimeline.value, audioEngine.value], ([allowed, engine]) => {
  if (!engine) return
  engineStore.setTimelineEnabled(allowed)
  if (!allowed) {
    timelineOpen.value = false
  }
}, { immediate: true })

function onTimelineEnter(el, done) {
  gsap.killTweensOf(el)
  gsap.fromTo(
    el,
    {
      height: 0,
      y: 18,
      autoAlpha: 0,
    },
    {
      height: el.scrollHeight,
      y: 0,
      autoAlpha: 1,
      duration: 0.22,
      ease: 'power2.out',
      clearProps: 'height,transform,opacity,visibility',
      onComplete: done,
    }
  )
}

function onTimelineLeave(el, done) {
  gsap.killTweensOf(el)
  gsap.to(el, {
    height: 0,
    y: 18,
    autoAlpha: 0,
    duration: 0.18,
    ease: 'power2.in',
    onComplete: done,
  })
}


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
  showWelcomeOverlay.value = false
  markWelcomeSeen()
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
const { user, isAuthenticated, sessionLoaded } = useAuth()

const preferenceDefaults = Object.freeze({
  autoResumePlayback: false,
  showInterfaceTips: true
})

const LOCAL_PREF_KEY = 'soundroom.userPreferences'
const WELCOME_LAST_SEEN_PREFIX = 'soundroom.welcomeLastSeen'

const userPreferences = ref({ ...preferenceDefaults })
const preferencesLoaded = ref(false)

const showAudioResumeOverlay = ref(false)
const pendingAutoPlayback = ref(false)
const justLoggedInThisSession = ref(false)

async function resumeAudio() {
  try {
    const engine = audioEngine.value
    const context = engine?.getAudioContext?.()

    if (context?.state === 'suspended') {
      await context.resume()
    } else {
      engineStore.resumeAudioContext()
    }

    const stillSuspended = context?.state === 'suspended'
    showAudioResumeOverlay.value = !!stillSuspended

    if (!stillSuspended && pendingAutoPlayback.value) {
      pendingAutoPlayback.value = false
      engine?.playAll?.()
    }
  } catch (err) {
    console.warn("Failed to resume audio context:", err)
    showAudioResumeOverlay.value = true
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

  const hasCachedPreferences = loadCachedPreferences()

  if (user.value?.id) {
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
      console.warn('Failed to load preferences from Supabase, using local/default preferences', err)
      if (!hasCachedPreferences) {
        applyPreferences(preferenceDefaults)
      }
    }
  } else if (!hasCachedPreferences) {
    applyPreferences(preferenceDefaults)
  }

  preferencesLoaded.value = true
  return userPreferences.value
}

function todayKey() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function welcomeStorageKey() {
  return `${WELCOME_LAST_SEEN_PREFIX}:${user.value?.id ?? 'anonymous'}`
}

function shouldShowWelcome({ force = false } = {}) {
  if (force) return true

  try {
    return localStorage.getItem(welcomeStorageKey()) !== todayKey()
  } catch (err) {
    console.warn('Failed to read welcome overlay state', err)
    return true
  }
}

function markWelcomeSeen() {
  try {
    localStorage.setItem(welcomeStorageKey(), todayKey())
  } catch (err) {
    console.warn('Failed to store welcome overlay state', err)
  }
}

function scheduleWelcomeOverlay({ force = false } = {}) {
  if (welcomeDone.value || showWelcomeOverlay.value) return

  if (shouldShowWelcome({ force })) {
    showWelcomeOverlay.value = true
  } else {
    welcomeDone.value = true
  }
}

function waitForSessionReady() {
  if (sessionLoaded.value) return Promise.resolve()

  return new Promise((resolve) => {
    const stop = watch(sessionLoaded, (loaded) => {
      if (loaded) {
        stop()
        resolve()
      }
    })
  })
}

onBeforeMount(async () => {
  registerSoundRoomActions()

  justLoggedInThisSession.value = sessionStorage.getItem('justLoggedIn') === 'true'
  if (justLoggedInThisSession.value) {
    sessionStorage.removeItem('justLoggedIn')
  }
  scheduleWelcomeOverlay({ force: justLoggedInThisSession.value })
  
  engineStore.setupAudioContext()
  engineStore.loadIR('cathedral', '/impulses/1st_baptist_nashville_far_wide.wav') // Load the default impulse response
  roomStore.setExistingRoomNames() // Initialize with empty names
  roomStore.room.name.value = 'Untitled Room' // Default room name
  roomStore.getSaveSnapshot({ markAsInitial: true }) // Initialize stored snapshots for save/empty comparisons
})

const startTour = ref(false);

function waitForWelcome() {
  if (!showWelcomeOverlay.value || welcomeDone.value) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const stop = watch(welcomeDone, (done) => {
      if (done) {
        stop()
        resolve()
      }
    })
  })
}

async function loadStartupRoom(preferences) {
  const tempSoundRoomData = localStorage.getItem('tempSoundRoomData')

  if (justLoggedInThisSession.value && tempSoundRoomData) {
    const loadedLocalRoom = await loadRoomLocal()
    if (loadedLocalRoom && isAuthenticated.value) {
      await saveRoom()
    }
    return !!loadedLocalRoom
  }

  if (!preferences.autoResumePlayback || !isAuthenticated.value) {
    return false
  }

  return await loadMostRecentRoom()
}

async function startOrRequestAutoPlayback(loadedRoom) {
  if (!loadedRoom || !userPreferences.value.autoResumePlayback) {
    pendingAutoPlayback.value = false
    showAudioResumeOverlay.value = false
    return
  }

  const engine = audioEngine.value
  if (!engine?.soundSources?.value?.length) {
    pendingAutoPlayback.value = false
    showAudioResumeOverlay.value = false
    return
  }

  const context = engine.getAudioContext()

  if (context.state === 'suspended') {
    pendingAutoPlayback.value = true
    showAudioResumeOverlay.value = true
    return
  }

  pendingAutoPlayback.value = false
  showAudioResumeOverlay.value = false
  engine.playAll()
}

let routeUnwatcher = null;

onMounted(async() => {
  await waitForSessionReady()
  scheduleWelcomeOverlay({ force: justLoggedInThisSession.value })

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
    await waitForWelcome()

    const preferences = await hydrateUserPreferences({ forceLocal: true })
    const loadedRoom = await loadStartupRoom(preferences)
    await startOrRequestAutoPlayback(loadedRoom)

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
