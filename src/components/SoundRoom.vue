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
        <section>
          <h5 class="text-sm font-semibold uppercase text-neutral-600 dark:text-neutral-400 mb-2">Sound Sources</h5>
          <ul class="space-y-2 text-sm">
            <li
              v-for="s in soundLibrarySources"
              :key="s.audioPath"
              class="cursor-move bg-neutral-300 dark:bg-neutral-700 p-1 rounded text-center"
              draggable="true"
              @dragstart="(e) => handleDragStart(e, s)"
            >
              {{ getSourceName(s.audioPath) }}
            </li>
          </ul>
          <button :disabled="audioEngine.soundSources.length == MAX_SOURCES" class="mt-4 w-full bg-neutral-300 dark:bg-neutral-800 text-xs py-1 rounded hover:bg-neutral-400 dark:hover:bg-neutral-700">
            + Add Source
          </button>
        </section>

        <!-- Listener Info -->
        <section>
          <h5 class="text-sm font-semibold uppercase text-neutral-600 dark:text-neutral-400 mb-2">Listener</h5>
          <div class="text-xs space-y-1">
            <p>X: {{ listener.x }}</p>
            <p>Y: {{ listener.y }}</p>
            <p>Angle: {{ displayListenerAngle }}°</p>
          </div>
        </section>
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
          <span class="text-xs text-neutral-500">Press 'U' to restore last deleted</span>
        </div>

        <!-- Canvas Area -->
        <div class="flex-1 bg-neutral-200 dark:bg-black flex items-center justify-center">
          <ContextMenu ref="contextMenu" :functionList="contextMenuActions" />
          <div 
            class="border-2 border-neutral-400 dark:border-neutral-700 flex items-center justify-center"
            :class="`w-[${room.width}px] h-[${room.height}px]`"
          >
            <canvas
              ref="canvas"
              :width="room.width"
              :height="room.height"
              @dragover.prevent
              @drop="handleDrop"
              @keydown="handleKeyDown"
              tabindex="0"
            />
          </div>
        </div>
      </main>

      <!-- Right Sidebar -->
      <aside class="w-64 bg-neutral-100 dark:bg-neutral-900 border-l border-neutral-300 dark:border-neutral-800 p-4 space-y-4">
        <!-- Source Details -->
        <section>
          <h5 class="text-sm font-semibold uppercase text-neutral-500 dark:text-neutral-400 mb-2">Selected Source</h5>
          <div v-if="selectedSource" class="text-xs space-y-1 flex flex-col items-center">
            <h4>{{ selectedSource.name }}</h4>
            <p>X: {{ selectedSource.x }}</p>
            <p>Y: {{ selectedSource.y }}</p>
            <p>Angle: {{ selectedSource.angle }}°</p>
            <p>Inner Cone: {{ selectedSource.innerCone }}°</p>
            <p>Outer Cone: {{ selectedSource.outerCone }}°</p>
            <div class="w-5/6">
              <VueSlider 
                v-model="selectedSource.volume" 
                @drag-start="onStart"
                @change="onChange"
                @drag-end="onEnd"
              />
            </div>
          </div>
          <div v-else>
            <p>No Source Selected</p>
          </div>
          <button
            v-if="selectedSource"
            @click="playPauseAllSound"
            class="mt-10 w-full bg-red-600 text-xs py-1 rounded hover:bg-red-500"
          >
            {{ playPauseLabel }}
          </button>
          <button
            v-if="selectedSource"
            @click="actionManager.doAction(
              'delete_canvas_sound_source', 
              { index: selectedIndex, src: audioEngine.soundSources.value[selectedIndex] }
              )"
            class="mt-3 w-full bg-red-600 text-xs py-1 rounded hover:bg-red-500"
          >
            Delete
          </button>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup>
// Imports
// Core Imports
import { ref, onMounted, computed, reactive } from 'vue'

// UI Components
import ContextMenu from '@/components/ui/context/ContextMenu.vue'
import ToolbarControls from '@/components/ui/controls/ToolbarControls.vue'
import VueSlider from 'vue-3-slider-component'

// Audio / Canvas / State Classes
import Listener from '@/lib/Listener'
import AudioEngine from '@/lib/AudioEngine'
import Room from '@/lib/Room'
import ActionManager from '@/lib/ActionManager'

// Composables
import { useCanvasControls } from '@/composables/useCanvasControls'
import { useKeyboardControls } from '@/composables/useKeyboardControls'
import { useDragDropAudio } from '@/composables/useDragDropAudio'
import { useCanvasRenderer } from '@/composables/useCanvasRenderer'
import { useSelectedSource } from '@/composables/useSelectedSource'
import { useVolumeSlider } from '@/composables/useVolumeSlider'


// Global State & Reactive References
const canvas = ref(null)
const canvasCtx = ref(null)
const contextMenu = ref(null)
const draggedSource = ref(null)

const room = new Room()

const listener = reactive(new Listener())
const displayListenerAngle = computed(() => ((listener.angle % 360 + 360) % 360))

const selectedIndex = ref(null)
const soundLibrarySources = ref([
  { audioPath: '/ambient.mp3' },
  { audioPath: '/water.mp3' },
])
const loadedCanvasSoundSources = []
const MAX_SOURCES = 20


// Audio Engine & Playback State
const audioEngine = new AudioEngine(loadedCanvasSoundSources, canvasCtx)
const isPlaying = computed(() => audioEngine.isPlaying.value)
let audioContext = null
const playPauseLabel = computed(() => { 
              const src = audioEngine.soundSources.value[selectedIndex.value]
              return src.instance.playing ? "Pause" : "Play"
            })
const playPauseAllSound = () => { 
              const src = audioEngine.soundSources.value[selectedIndex.value]
              src.instance.playing ? src.instance.stop() : src.instance.play()
            }

// Action Manager Setup
const actionManager = new ActionManager()
const actionStackEmpty = computed(() => actionManager.actionStackEmpty.value)
const redoStackEmpty = computed(() => actionManager.redoStackEmpty.value)


// Selected Source Logic
const { selectedSource, getSourceName } = useSelectedSource(audioEngine.soundSources, selectedIndex)
const { onStart, onChange, onEnd } = useVolumeSlider(audioEngine.soundSources, selectedIndex, actionManager)

// Canvas Rendering & Drag-Drop Logic
const { draw } = useCanvasRenderer({
  soundSources: audioEngine.soundSources,
  ctxRef: canvasCtx,
  selectedIndex,
  listener,
  room
})

const { handleDragStart, handleDrop } = useDragDropAudio({
  draggedSource,
  canvasRef: canvas,
  actionManager,
  draw
})

// Keyboard Interaction
const { handleKeyDown } = useKeyboardControls({
  listener,
  selectedIndex,
  soundSources: audioEngine.soundSources,
  draw,
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
    draw()
  },
  (payload) => {
    audioEngine.deleteSoundSource(payload)
    draw()
  }
)

registerAction(
  "delete_canvas_sound_source",
  (payload) => {
    audioEngine.deleteSoundSource(payload)
    draw()
  },
  (payload) => {
    audioEngine.addSoundSource(payload)
    draw()
  }
)

const moveSoundSource = (src, coords) => {
  src.instance.state.x = coords.x
  src.instance.state.y = coords.y
  src.instance.updateAudio()
  draw()
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

registerAction(
  "move_listener",
  (payload) => {
    listener.x = payload.to.x
    listener.y = payload.to.y
    draw()
  },
  (payload) => {
    listener.x = payload.from.x
    listener.y = payload.from.y
    draw()
  }
)

// Context Menu Actions

const contextMenuActions = [
  {
    label: computed(() => {
      const src = audioEngine.soundSources.value[selectedIndex.value]
      return src.instance.playing ? "Pause" : "Play"
    }),
    function: () => {
      const src = audioEngine.soundSources.value[selectedIndex.value]
      src.instance.playing ? src.instance.stop() : src.instance.play()
    }
  },
  {
    label: 'Delete',
    function: () => {
      actionManager.doAction("delete_canvas_sound_source", { index: selectedIndex.value, src: audioEngine.soundSources.value[selectedIndex.value] })
      contextMenu.value.visible = false
    }
  }
]

// Initializes all source instances with audio + connects listener to context
function setupAudioContext() {
  audioEngine.setupAudioEngine()
  audioContext = audioEngine.getAudioContext()
  listener.setAudioContext(audioContext)
}


// Mount Hook
onMounted(() => {
  canvasCtx.value = canvas.value.getContext('2d')
  listener.setCanvasContext(canvasCtx)
  useCanvasControls({
    canvas,
    ctx: canvasCtx,
    soundSources: audioEngine.soundSources,
    selectedIndex,
    draw,
    listener,
    actionManager,
    contextMenu
  })

  setupAudioContext()
  draw()
})
</script>

