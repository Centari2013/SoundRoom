<template>
  <div @click.self="emit('close')" class="modal-backdrop">
    <div class="bg-surface-base text-text-primary rounded-2xl w-[80vw] max-w-xl h-auto relative flex flex-col overflow-hidden shadow-2xl border border-border-subtle">
      
      <!-- Floating Header -->
      <div class="modal-header p-6 border-b border-border-subtle">
        <h1 class="text-2xl font-bold tracking-tight">Welcome to SoundRoom</h1>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-6 text-sm leading-relaxed">
        <p class="text-[var(--color-text-secondary)]">
          You’re all set. SoundRoom is your canvas for immersive 3D sound. Place audio sources, move your listener, and create rich soundscapes that evolve around you.
        </p>

        <ul class="list-disc list-inside space-y-1 text-[var(--color-text-muted)]">
          <li>Use <strong>+ Add Source</strong> to begin layering sounds.</li>
          <li>Drag and drop sounds onto the canvas.</li>
          <li>Move the listener with <strong>WASD</strong> or arrow keys.</li>
          <li>Rotate sounds with <strong>Z</strong> and <strong>C</strong>.</li>
          <li>Undo/redo with <strong>U</strong> / <strong>R</strong>.</li>
        </ul>

        <div class="rounded p-4 text-[var(--color-accent-strong)] border border-[rgba(var(--color-accent-rgb),0.35)] bg-[rgba(var(--color-accent-rgb),0.08)]">
          <strong>Pro tip:</strong> You can layer ambience, nature, music, and directional audio for maximum effect.
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end p-4 border-t border-border-subtle">
        <BaseButton @click="router.push('/')" class="text-sm px-4 py-2 font-medium rounded hover:text-[var(--color-text-muted)]">
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
  background-color: rgba(var(--base-black-rgb), 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5rem;
}
</style>
