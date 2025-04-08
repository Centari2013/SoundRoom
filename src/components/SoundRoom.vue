<template>
  <div class="min-h-screen min-w-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white flex flex-col">
    <!-- Header -->
    <header class="px-6 py-4 border-b border-neutral-300 dark:border-neutral-800 flex items-center justify-between">
      <h1 class="text-xl font-bold tracking-wide">SoundRoom</h1>
      <nav class="space-x-4">
        <button class="px-3 py-1 text-sm rounded hover:bg-neutral-100 dark:hover:bg-neutral-800">Settings</button>
        <button class="px-3 py-1 text-sm rounded hover:bg-neutral-100 dark:hover:bg-neutral-800">Help</button>
      </nav>
    </header>

    <!-- Main Layout -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Left Sidebar -->
      <aside class="w-64 bg-neutral-100 dark:bg-neutral-900 border-r border-neutral-300 dark:border-neutral-800 p-4 space-y-6">
        <!-- Sound Sources -->
        <section>
          <h2 class="text-sm font-semibold uppercase text-neutral-500 dark:text-neutral-400 mb-2">Sound Sources</h2>
          <ul class="space-y-2 text-sm">
            <li v-for="s in soundSources" >{{ getSourceName(s.audioPath) }}</li>

          </ul>
          <button class="mt-4 w-full bg-neutral-200 dark:bg-neutral-800 text-xs py-1 rounded hover:bg-neutral-300 dark:hover:bg-neutral-700">
            + Add Source
          </button>
        </section>

        <!-- Listener Info -->
        <section>
          <h2 class="text-sm font-semibold uppercase text-neutral-500 dark:text-neutral-400 mb-2">Listener</h2>
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
            <button @click="playingAudio ? pauseAll() : playAll()" class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700">{{playingAudio ? "Pause All" : "Play All"}}</button>
            
            <button @click="() => { undoDeleteSoundSource(); draw()}" :disabled="deletedSources.length == 0" class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700">Undo</button>
          </div>
          <span class="text-xs text-neutral-500">Press 'U' to restore last deleted</span>
        </div>

        <!-- Canvas Area -->
        <div class="flex-1 bg-neutral-200 dark:bg-black flex items-center justify-center">
          <div class="w-[600px] h-[400px] border-2 border-neutral-400 dark:border-neutral-700 flex items-center justify-center">
            <canvas
              ref="canvas"
              width="600"
              height="400"
              @keydown="handleKeyDown"
              tabindex="0"
              style="border: 1px solid #333"
            />
          </div>
        </div>
      </main>

      <!-- Right Sidebar -->
      <aside class="w-64 bg-neutral-100 dark:bg-neutral-900 border-l border-neutral-300 dark:border-neutral-800 p-4 space-y-4">
        <!-- Source Details -->
        <section>
          <h5 class="text-sm font-semibold uppercase text-neutral-500 dark:text-neutral-400 mb-2">Selected Source</h5>
          <div v-if="selectedSource" class="text-xs space-y-1">
            <h4>{{ selectedSource.name }}</h4>
            <p>X: {{selectedSource.x}}</p>
            <p>Y: {{ selectedSource.y }}</p>
            <p>Angle: {{selectedSource.angle}}°</p>
            <p>Inner Cone: {{selectedSource.innerCone}}°</p>
            <p>Outer Cone: {{selectedSource.outerCone}}°</p>
          </div>
          <div v-else>
            <p>No Source Selected</p>
          </div>
          <button v-if="selectedSource" class="mt-3 w-full bg-red-600 text-xs py-1 rounded hover:bg-red-500">Delete</button>
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

// Listener Setup
const { listener, setAudioContext, draw: drawListener } = createListenerTools()
const displayListenerAngle = computed(() => ((listener.value.angle % 360 + 360) % 360))


// Canvas and Drawing Context
const canvas = ref(null)
const ctx = ref(null)
let audioContext = null
const room = { width: 600, height: 400 }
const clamp = (val, min, max) => Math.max(min, Math.min(val, max))

// Data and State
const soundSources = ref([
  { x: 100, y: 100, angle: 0, audioPath: '/ambient.mp3'},
  { x: 500, y: 0, angle: 90, audioPath: '/water.mp3', coneInner: 360, coneOuter: 360 }
])
const deletedSources = ref([])
const selectedIndex = ref(null)
const getSourceName = (path) => {
  const file = path.split('/').pop()
  return file.replace(/\.[^/.]+$/, '') // removes extension
}
const selectedSource = computed(() => {
  const index = selectedIndex.value
  const sources = soundSources.value

  if (index == null || index < 0 || index >= sources.length) return null

  const src = sources[index]

  const name = getSourceName(src.audioPath)
  const instanceState = src.instance?.state
  let calculatedAngle = instanceState?.angle ?? src.angle
  calculatedAngle = (calculatedAngle % 360 + 360) % 360
  return {
    name,
    x: instanceState?.x ?? src.x,
    y: instanceState?.y ?? src.y,
    angle: calculatedAngle,
    innerCone: instanceState?.coneInner ?? src.coneInner ?? 360,
    outerCone: instanceState?.coneOuter ?? src.coneOuter ?? 360
  }
})



// Audio Engine Hooks
const {
  setupAudioEngine,
  deleteSoundSource,
  getAudioContext,
  undoDeleteSoundSource,
  playAll,
  pauseAll,
  playingAudio
} = useAudioEngine({
  soundSources,
  ctxRef: ctx,
  selectedIndex,
  deletedSources
})

// Canvas Drawing Logic
const draw = () => {
  ctx.value.clearRect(0, 0, room.width, room.height)

  soundSources.value.forEach((src, i) => {
    if (src.instance) {
      const state = src.instance.state
      state.x = clamp(state.x, 0, room.width)
      state.y = clamp(state.y, 0, room.height)
      Object.assign(src, { x: state.x, y: state.y, angle: state.angle })
      src.instance.updateAudio()
      src.instance.draw()

   

      if (selectedIndex.value === i) {
        ctx.value.beginPath()
        ctx.value.arc(state.x, state.y, 14, 0, Math.PI * 2)
        ctx.value.strokeStyle = 'rgba(255, 255, 0, 0.6)'
        ctx.value.lineWidth = 2
        ctx.value.stroke()
      }
    }
  })

  listener.value.x = clamp(listener.value.x, 0, room.width)
  listener.value.y = clamp(listener.value.y, 0, room.height)
  drawListener(ctx)
}

// Keyboard Controls
const { handleKeyDown } = useKeyboardControls({
  listener,
  selectedIndex,
  soundSources,
  draw,
  deleteSoundSource,
  undoDeleteSoundSource,
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

// Mount Hook
onMounted(() => {
  ctx.value = canvas.value.getContext('2d')
  draw()

  useCanvasControls({
    canvas,
    ctx,
    soundSources,
    selectedIndex,
    draw,
    listener
  })

  setupAudioContext()
})
</script>

<style scoped>
/* Tailwind handles all styling */
</style>
