// src/components/RoomCanvas.vue

<template>
  <canvas
    ref="canvas"
    width="600"
    height="400"
    @keydown="handleKeyDown"
    tabindex="0"
    style="border: 1px solid #333"
  />
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { createListenerTools } from '@/composables/useListener'
import { useCanvasControls } from '@/composables/useCanvasControls'
import { useAudioEngine } from '@/composables/useAudioEngine'
import { useKeyboardControls } from '@/composables/useKeyboardControls'

const { listener, updateListener, setAudioContext } = createListenerTools()


const canvas = ref(null)
const ctx = ref(null)
let audioContext = null
const audioInitialized = ref(false)



const room = { width: 600, height: 400 }


// Refs to source data and components
const soundSources = ref([
  { x: 100, y: 100, angle: 0, audioPath: '/ambient.mp3', component: null },
  { x: 500, y: 0, angle: 90, audioPath: '/water.mp3', coneInner: 360, coneOuter: 360, component: null }
])
const deletedSources = ref([])

const selectedIndex = ref(null)


const { setupAudioEngine, deleteSoundSource, getAudioContext } = useAudioEngine({ soundSources, ctxRef: ctx, selectedIndex, deletedSources })

const draw = () => {
  ctx.value.clearRect(0, 0, room.width, room.height)

  soundSources.value.forEach((src, i) => {
    if (src.instance) {
      src.x = src.instance.state.x
      src.y = src.instance.state.y
      src.angle = src.instance.state.angle
      src.instance.updateAudio() // ← ADD THIS
      src.instance.draw()


      if (selectedIndex.value === i) {
        const s = src.instance.state
        ctx.value.beginPath()
        ctx.value.arc(s.x, s.y, 14, 0, Math.PI * 2)
        ctx.value.strokeStyle = 'rgba(255, 255, 0, 0.6)'
        ctx.value.lineWidth = 2
        ctx.value.stroke()
      }
    }
  })

  ctx.value.beginPath()
  ctx.value.arc(listener.value.x, listener.value.y, 10, 0, Math.PI * 2)
  ctx.value.fillStyle = '#00f'
  ctx.value.fill()

  const angleRad = (listener.value.angle * Math.PI) / 180
  const dx = Math.cos(angleRad) * 20
  const dy = Math.sin(angleRad) * 20
  ctx.value.beginPath()
  ctx.value.moveTo(listener.value.x, listener.value.y)
  ctx.value.lineTo(listener.value.x + dx, listener.value.y + dy)
  ctx.value.strokeStyle = '#00f'
  ctx.value.stroke()
}

const { handleKeyDown } = useKeyboardControls({ 
  listener, 
  selectedIndex, 
  soundSources, 
  draw, 
  deleteSoundSource, 
  updateListener,
  deletedSources, 
  getAudioContext, 
  ctx
})

const setupAudioContext = async () => {
  await setupAudioEngine()
  audioContext = getAudioContext()
  setAudioContext(audioContext)
  updateListener()

  draw()
}

onMounted(() => {
  ctx.value = canvas.value.getContext('2d')
  draw()
  canvas.value.focus()

  canvas.value.addEventListener('click', async () => {
  if (audioInitialized.value) return;

  audioInitialized.value = true;
  await setupAudioContext(); // this will now create the AudioContext safely
})



  useCanvasControls({
  canvas,
  ctx,
  soundSources,
  selectedIndex,
  draw
})


  })
</script>
