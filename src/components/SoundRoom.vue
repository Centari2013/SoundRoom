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
          <button :disabled="canvasSoundSources.length == 20" class="mt-4 w-full bg-neutral-300 dark:bg-neutral-800 text-xs py-1 rounded hover:bg-neutral-400 dark:hover:bg-neutral-700">
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
          <div class="space-x-2">
            <button :disabled="canvasSoundSources.length == 0" @click="playingAudio ? pauseAll() : playAll()" class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700">{{playingAudio ? "Pause All" : "Play All"}}</button>
            
            <button @click="undoLastAction" :disabled="actionStackEmpty" class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700">Undo</button>
            <button @click="redoLastAction" :disabled="redoStackEmpty" class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700">Redo</button>
          </div>
          <span class="text-xs text-neutral-500">Press 'U' to restore last deleted</span>
        </div>

        <!-- Canvas Area -->
        <div class="flex-1 bg-neutral-200 dark:bg-black flex items-center justify-center">
          <ContextMenu
            ref="contextMenu"
            :functionList="contextMenuActions"
          />

          <div class="w-[600px] h-[400px] border-2 border-neutral-400 dark:border-neutral-700 flex items-center justify-center">
            <canvas
              ref="canvas"
              width="600"
              height="400"
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
            <p>X: {{selectedSource.x}}</p>
            <p>Y: {{ selectedSource.y }}</p>
            <p>Angle: {{selectedSource.angle}}°</p>
            <p>Inner Cone: {{selectedSource.innerCone}}°</p>
            <p>Outer Cone: {{selectedSource.outerCone}}°</p>
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
          <button v-if="selectedSource" 
          @click="() => { 
            const src = canvasSoundSources[selectedIndex]
            src.instance.playing ? src.instance.stop() : src.instance.play()
          }" 
          class="mt-10 w-full bg-red-600 text-xs py-1 rounded hover:bg-red-500">
            {{ computed(() => {const src = canvasSoundSources[selectedIndex]
          return src.instance.playing ? "Pause" : "Play"}) }}
          </button>
          <button v-if="selectedSource" 
          @click="() => { 
            doAction('delete_canvas_sound_source',{index: selectedIndex, src: canvasSoundSources[selectedIndex]})
          }" 
            class="mt-3 w-full bg-red-600 text-xs py-1 rounded hover:bg-red-500">Delete</button>
        
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup>
// Imports
import { ref, onMounted, computed } from 'vue'
import { createListenerTools } from '@/composables/useListener'
import { useCanvasControls } from '@/composables/useCanvasControls'
import { useAudioEngine } from '@/composables/useAudioEngine'
import { useKeyboardControls } from '@/composables/useKeyboardControls'
import { useDragDropAudio } from '@/composables/useDragDropAudio'
import { useCanvasRenderer } from '@/composables/useCanvasRenderer'
import { useSelectedSource } from '@/composables/useSelectedSource'
import { useActionManager } from '@/composables/useActionManager'
import { useVolumeSlider } from '@/composables/useVolumeSlider'
import { useRoom } from '@/composables/useRoom'

import ContextMenu from '@/components/ui/context/ContextMenu.vue'
import VueSlider from 'vue-3-slider-component'

// for do, undo, and redo
const { actionStackEmpty, redoStackEmpty, registerActionHandlers, doAction, undoLastAction, redoLastAction } = useActionManager()

// Listener Setup
const { listener, setAudioContext, draw: drawListener } = createListenerTools()
const displayListenerAngle = computed(() => ((listener.value.angle % 360 + 360) % 360))


// Canvas and Drawing Context
const canvas = ref(null)
const ctx = ref(null)
let audioContext = null

const { room, clamp } = useRoom()

// Data and State

// for populating sound library
const soundLibrarySources = ref([
  { audioPath: '/ambient.mp3' },
  { audioPath: '/water.mp3' },
  // Add more templates
])

// for playing in canvas
const canvasSoundSources = ref([])
/* const soundSources = ref([
    { x: 100, y: 100, angle: 0, audioPath: '/ambient.mp3'},
    { x: 500, y: 0, angle: 90, audioPath: '/water.mp3', coneInner: 360, coneOuter: 360 }
  ])
 */

// for Audio Engine management
const selectedIndex = ref(null)
const { selectedSource, getSourceName } = useSelectedSource(canvasSoundSources, selectedIndex)

const { onStart, onChange, onEnd } = useVolumeSlider(canvasSoundSources, selectedIndex, doAction)


// Audio Engine Hooks
const {
  setupAudioEngine,
  addSoundSource,
  deleteSoundSource,
  getAudioContext,
  playAll,
  pauseAll,
  playingAudio
} = useAudioEngine({
  soundSources: canvasSoundSources,
  ctxRef: ctx
})



// Canvas Drawing Logic
const { draw } = useCanvasRenderer({
  soundSources: canvasSoundSources,
  ctxRef: ctx,
  selectedIndex,
  listener,
  drawListener,
  room,
  clamp
})

const draggedSource = ref(null)
const { handleDragStart, handleDrop } = useDragDropAudio({
  draggedSource,
  canvasRef: canvas,
  doAction,
  draw
})

// Keyboard Controls
const { handleKeyDown } = useKeyboardControls({
  listener,
  selectedIndex,
  soundSources: canvasSoundSources,
  draw,
  doAction,
  undoLastAction,
  redoLastAction,
  clamp,
  room
})

// Audio Initialization
const setupAudioContext = () => {
  setupAudioEngine()
  audioContext = getAudioContext()
  setAudioContext(audioContext)
  draw()
}

// Set Action Handlers
registerActionHandlers(
  "add_canvas_sound_source", 
  (payload) => {addSoundSource(payload); draw()}, 
  (payload) => { deleteSoundSource(payload); draw() }
)
registerActionHandlers(
  "delete_canvas_sound_source", 
  (payload) => { deleteSoundSource(payload); draw() }, 
  (payload) => {addSoundSource(payload); draw()}
)

registerActionHandlers(
  "move_canvas_sound_source",
  (payload) => {
    const src = canvasSoundSources.value[payload.index]
    src.instance.state.x = payload.to.x
    src.instance.state.y = payload.to.y
    src.instance.updateAudio()
    draw()
  },
  (payload) => {
    const src = canvasSoundSources.value[payload.index]
    src.instance.state.x = payload.from.x
    src.instance.state.y = payload.from.y
    src.instance.updateAudio()
    draw()
  }
)

registerActionHandlers(
  "move_listener",
  (payload) => {
    listener.value.x = payload.to.x
    listener.value.y = payload.to.y
    draw()
  },
  (payload) => {
    listener.value.x = payload.from.x
    listener.value.y = payload.from.y
    draw()
  }
)


registerActionHandlers(
  "set_sound_source_volume",
  (payload) => {
    const src = canvasSoundSources.value[payload.index]
    src.instance.setVolume(payload.to)
  },
  (payload) => {
    const src = canvasSoundSources.value[payload.index]
    src.instance.setVolume(payload.from)
  }
)


const contextMenu = ref(null)
const contextMenuActions = [
      {
        label: computed(() => {
          const src = canvasSoundSources.value[selectedIndex.value]
          return src.instance.playing ? "Pause" : "Play"
        }),
        function: () => {
         const src = canvasSoundSources.value[selectedIndex.value]
         src.instance.playing ? src.instance.stop() : src.instance.play()
        }
      },
      {
        label: 'Delete',
        function: () => {
          doAction("delete_canvas_sound_source", {index: selectedIndex.value, src: canvasSoundSources.value[selectedIndex.value]})
          contextMenu.value.visible = false
        }
      },
      /* {
        label: sourceHasCone(source) ? 'Remove Cone' : 'Add Cone',
        function: () => {
          toggleCone(source)
          contextMenu.visible = false
        }
      },
      {
        label: 'Replace Sound',
        function: () => {
          openSoundPicker(source)
          contextMenu.visible = false
        }
      } */
  ]




// Mount Hook
onMounted(() => {
  ctx.value = canvas.value.getContext('2d')
  draw()

  useCanvasControls({
    canvas,
    ctx,
    soundSources: canvasSoundSources,
    selectedIndex,
    draw,
    listener,
    doAction,
    contextMenu
  })

  setupAudioContext()
})
</script>

<style scoped>
/* Tailwind handles all styling */
</style>