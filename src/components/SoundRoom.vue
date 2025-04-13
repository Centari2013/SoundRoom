<template>
  <div class="min-h-screen min-w-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white flex flex-col">
    <!-- Header -->
    <header class="px-6 py-4 border-b border-neutral-300 dark:border-neutral-800 flex items-center justify-between">
      <h1 class="text-xl font-bold tracking-wide">SoundRoom</h1>
      <nav class="space-x-4">
        <button class="px-3 py-1 text-sm rounded hover:bg-neutral-200 dark:hover:bg-neutral-800">Settings</button>
        <button class="px-3 py-1 text-sm rounded hover:bg-neutral-200 dark:hover:bg-neutral-800">Help</button>
      </nav>
    </header>

    <!-- Main Layout -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Left Sidebar -->
      <aside class="w-64 bg-neutral-200 dark:bg-neutral-900 border-r border-neutral-400 dark:border-neutral-800 p-4 space-y-6">
        <!-- Sound Sources -->
        <DraggableSourcePanel 
          :librarySources="soundLibrarySources"
          :MAX_SOURCES="MAX_SOURCES"
          :audioEngine="audioEngine"
          :handleDragStart="handleDragStart"
        />

        <!-- Listener Info -->
        <ListenerReadout :listener="listener"/>
      </aside>

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

          <v-stage
            :config="{ width: room.width, height: room.height }"
            @contextmenu="(e) => e.evt.preventDefault()"
          >
          <v-layer ref="mainLayer" @click="handleStageClick">
            <SoundSourceNode
              v-for="(src, i) in audioEngine.soundSources.value"
              :key="i"
              :source="src"
              :selected="i === selectedIndex"
              :actionManager="actionManager"
              :room="room"
              :index="i"
              @select="selectedIndex = $event"
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
      <aside class="w-64 bg-neutral-100 dark:bg-neutral-900 border-l border-neutral-300 dark:border-neutral-800 p-4 space-y-4">
        <!-- Source Details -->
        <SelectedSourcePanel 
          :listener="listener"
          :actionManager="actionManager"
          :selectedSource="selectedSource"
        />
      </aside>
    </div>
  </div>
</template>

<script setup>
// Imports
// Core Imports
import { ref, onMounted, computed, reactive, provide } from 'vue'

// UI Components
import VueSlider from 'vue-3-slider-component'

import ToolbarControls from '@/components/ui/controls/ToolbarControls.vue'
import ListenerReadout from '@/components/ui/readouts/ListenerReadout.vue'
import SelectedSourcePanel from '@/components/ui/panels/SelectedSourcePanel.vue'
import DraggableSourcePanel from '@/components/ui/panels/DraggableSourcePanel.vue'
import ListenerNode from '@/components/ui/canvas/ListenerNode.vue';
import SoundSourceNode from '@/components/ui/canvas/SoundSourceNode.vue';

// Audio / Canvas / State Classes
import Listener from '@/lib/Listener'
import AudioEngine from '@/lib/AudioEngine'
import Room from '@/lib/Room'
import ActionManager from '@/lib/ActionManager'

// Composables
import { useKeyboardControls } from '@/composables/useKeyboardControls'
import { useDragDropAudio } from '@/composables/useDragDropAudio'
import { useSelectedSource } from '@/composables/useSelectedSource';


// Global State & Reactive References
const canvasCtx = ref(null)
const draggedSource = ref(null)

const room = new Room()

const listener = reactive(new Listener())


const selectedIndex = ref(null)
provide('selectedIndex', selectedIndex)
const soundLibrarySources = ref([
  { audioPath: '/ambient.mp3', coneInner: 60,  coneOuter: 300},
  { audioPath: '/water.mp3', coneInner:60, coneOuter:180 },
])
const loadedCanvasSoundSources = []
const MAX_SOURCES = 20
function handleStageClick(e) {
  // TODO: fix source deselect
  // If click target has no parent node or isn't a group,
  // it's likely a click on empty space
  const clickedShape = e.target
  if (clickedShape === e.currentTarget) {
    // Clicked on the layer itself — empty space
    selectedIndex.value = null
    return
  }
}

// Audio Engine & Playback State
const audioEngine = new AudioEngine(loadedCanvasSoundSources, canvasCtx)
const masterVolumeProxy = computed({
  get: () => audioEngine.masterVolume.value,
  set: (v) => (audioEngine.masterVolume.value = v)
})
const isPlaying = computed(() => audioEngine.isPlaying.value)
let audioContext = null
const { selectedSource } = useSelectedSource(audioEngine.soundSources, selectedIndex)
provide('selectedSource', selectedSource)
// Action Manager Setup
const actionManager = new ActionManager()
const actionStackEmpty = computed(() => actionManager.actionStackEmpty.value)
const redoStackEmpty = computed(() => actionManager.redoStackEmpty.value)


// Drag-Drop Logic
const stageWrapper = ref(null)
const { handleDragStart, handleDrop } = useDragDropAudio({
  draggedSource,
  actionManager,
  stageWrapper
})

// Keyboard Interaction
const { onKeyDown, onKeyUp } = useKeyboardControls({
  listener,
  selectedIndex,
  selectedSource,
  soundSources: audioEngine.soundSources,
  actionManager,
  room
})

// Action Manager Registration
function registerAction(name, doFn, undoFn) {
  actionManager.registerActionHandlers(name, doFn, undoFn)
}

registerAction(
  "add_canvas_sound_source",
  (payload) => {
    audioEngine.addSoundSource(payload)
    listener.updateAudio()
  },
  (payload) => {
    audioEngine.deleteSoundSource(payload)
    listener.updateAudio()
  }
)

registerAction(
  "delete_canvas_sound_source",
  (payload) => {
    audioEngine.deleteSoundSource(payload)
  },
  (payload) => {
    audioEngine.addSoundSource(payload)
  }
)

const moveSoundSource = (src, coords) => {
  src.instance.state.x = coords.x
  src.instance.state.y = coords.y
  src.instance.updateAudio()
  listener.updateAudio()
}

registerAction(
  "move_canvas_sound_source",
  (payload) => {
    const src = audioEngine.soundSources.value[payload.index]
    moveSoundSource(src, payload.to)
  },
  (payload) => {
    const src = audioEngine.soundSources.value[payload.index]
    moveSoundSource(src, payload.from)
  }
)

// Initializes all source instances with audio + connects listener to context
function setupAudioContext() {
  audioEngine.setupAudioEngine()
  audioContext = audioEngine.getAudioContext()
  listener.setAudioContext(audioContext)
}


// Mount Hook
onMounted(() => {

  setupAudioContext()
})
</script>

