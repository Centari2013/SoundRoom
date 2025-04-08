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
            <li v-for="s in soundSources" class="hover:bg-neutral-200 dark:hover:bg-neutral-800 px-2 py-1 rounded cursor-pointer">{{s.audioPath.split('/').pop()}}</li>
            
          </ul>
          <button class="mt-4 w-full bg-neutral-200 dark:bg-neutral-800 text-xs py-1 rounded hover:bg-neutral-300 dark:hover:bg-neutral-700">+ Add Source</button>
        </section>

        <!-- Listener Info -->
        <section>
          <h2 class="text-sm font-semibold uppercase text-neutral-500 dark:text-neutral-400 mb-2">Listener</h2>
          <div class="text-xs space-y-1">
            <p>X: {{listener.x}}</p>
            <p>Y: {{listener.y}}</p>
            <p>Angle: {{displayListenerAngle}}°</p>
          </div>
        </section>
      </aside>

      <!-- Canvas + Controls -->
      <main class="flex-1 flex flex-col">
        <!-- Toolbar -->
        <div class="flex items-center justify-between p-4 border-b border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
          <div class="space-x-2">
            <button @click="playAll" class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700">Play All</button>
            <button @click="pauseAll" class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700">Pause All</button>
            <button class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700">Undo</button>
          </div>
          <span class="text-xs text-neutral-500">Press 'U' to restore last deleted</span>
        </div>

        <!-- Canvas Placeholder -->
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
          <h2 class="text-sm font-semibold uppercase text-neutral-500 dark:text-neutral-400 mb-2">Selected Source</h2>
          <div class="text-xs space-y-1">
            <p>X: 500</p>
            <p>Y: 0</p>
            <p>Angle: 90°</p>
            <p>Inner Cone: 360°</p>
            <p>Outer Cone: 360°</p>
          </div>
          <button class="mt-3 w-full bg-red-600 text-xs py-1 rounded hover:bg-red-500">Delete</button>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { createListenerTools } from '@/composables/useListener'
import { useCanvasControls } from '@/composables/useCanvasControls'
import { useAudioEngine } from '@/composables/useAudioEngine'
import { useKeyboardControls } from '@/composables/useKeyboardControls'

const { listener, updateListener, setAudioContext } = createListenerTools()
const displayListenerAngle = computed(() => {
  const angle = ((listener.value.angle % 360) + 360) % 360;
  return Math.min(angle, 360);
});

const canvas = ref(null)
const ctx = ref(null)
let audioContext = null

const room = { width: 600, height: 400 }
const clamp = (val, min, max) => Math.max(min, Math.min(val, max)) // for keeping objects in canvas bounds

// Refs to source data and components
const soundSources = ref([
  { x: 100, y: 100, angle: 0, audioPath: '/ambient.mp3', component: null },
  { x: 500, y: 0, angle: 90, audioPath: '/water.mp3', coneInner: 360, coneOuter: 360, component: null }
])
const deletedSources = ref([])

const selectedIndex = ref(null)

const { setupAudioEngine, deleteSoundSource, getAudioContext, undoDeleteSoundSource, playAll, pauseAll } = useAudioEngine({
  soundSources,
  ctxRef: ctx,
  selectedIndex,
  deletedSources
})

const draw = () => {
  

  ctx.value.clearRect(0, 0, room.width, room.height)

  soundSources.value.forEach((src, i) => {
    if (src.instance) {
      const state = src.instance.state

      // Clamp state positions
      state.x = clamp(state.x, 0, room.width)
      state.y = clamp(state.y, 0, room.height)

      src.x = state.x
      src.y = state.y
      src.angle = state.angle
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

  ctx.value.beginPath()
  ctx.value.arc(listener.value.x, listener.value.y, 10, 0, Math.PI * 2)
  ctx.value.fillStyle = '#00f'
  ctx.value.fill()

  const angleRad = (listener.value.angle * Math.PI) / 180
  const dx = Math.cos(angleRad) * 20
  const dy = Math.sin(angleRad) * 20
  ctx.value.beginPath()
  ctx.value.moveTo(listener.value.x, listener.value.y)
  ctx.value.lineTo(listener.value.x - dx, listener.value.y - dy)
  ctx.value.strokeStyle = '#fff'
  ctx.value.stroke()
}

const { handleKeyDown } = useKeyboardControls({
  listener,
  selectedIndex,
  soundSources,
  draw,
  deleteSoundSource,
  undoDeleteSoundSource,
  updateListener,
  clamp,
  room
})

const setupAudioContext = async () => {
  setupAudioEngine()
  audioContext = getAudioContext()
  setAudioContext(audioContext)
  updateListener()

  draw()
}

onMounted(async () => {
  ctx.value = canvas.value.getContext('2d')
  draw()
  //canvas.value.focus()

  useCanvasControls({
    canvas,
    ctx,
    soundSources,
    selectedIndex,
    draw
  })

  await setupAudioContext()
})
</script>

<style scoped>
/* Tailwind handles all styling */
</style>
