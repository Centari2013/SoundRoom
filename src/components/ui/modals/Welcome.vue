<template>
  <div @click.self="emit('close')" class="modal-backdrop">
    <div class="bg-white dark:bg-neutral-950 rounded-2xl w-[80vw] max-w-xl h-auto relative flex flex-col overflow-hidden shadow-2xl border border-neutral-300 dark:border-neutral-800">
      
      <!-- Floating Header -->
      <div class="modal-header p-6 border-b border-neutral-300 dark:border-neutral-800">
        <h1 class="text-2xl font-bold tracking-tight">Welcome to SoundRoom</h1>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-6 text-sm leading-relaxed">
        <p class="text-neutral-700 dark:text-neutral-300">
          You’re all set. SoundRoom is your canvas for immersive 3D sound. Place audio sources, move your listener, and create rich soundscapes that evolve around you.
        </p>

        <ul class="list-disc list-inside space-y-1 text-neutral-600 dark:text-neutral-400">
          <li>Use <strong>+ Add Source</strong> to begin layering sounds.</li>
          <li>Drag and drop sounds onto the canvas.</li>
          <li>Move the listener with <strong>WASD</strong> or arrow keys.</li>
          <li>Rotate sounds with <strong>Z</strong> and <strong>C</strong>.</li>
          <li>Undo/redo with <strong>U</strong> / <strong>R</strong>.</li>
        </ul>

        <div class="rounded bg-blue-50 dark:bg-blue-900/30 p-4 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
          <strong>Pro tip:</strong> You can layer ambience, nature, music, and directional audio for maximum effect.
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end p-4 border-t border-neutral-300 dark:border-neutral-800">
        <BaseButton @click="router.push('/')" class="text-sm px-4 py-2 font-medium rounded hover:text-neutral-600 dark:hover:text-neutral-300">
          Let's Go
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import BaseButton from '@/components/ui/input/BaseButton.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5rem;
}
</style>
