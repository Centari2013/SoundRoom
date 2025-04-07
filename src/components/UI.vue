<template>
  <div class="min-h-screen min-w-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white flex flex-col">
    <!-- Header -->
    <header class="px-6 py-4 border-b border-neutral-300 dark:border-neutral-800 flex items-center justify-between">
      <h1 class="text-xl font-bold tracking-wide">F-SEA Spatial Audio Engine</h1>
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
            <li class="hover:bg-neutral-200 dark:hover:bg-neutral-800 px-2 py-1 rounded cursor-pointer">Ambient.mp3</li>
            <li class="hover:bg-neutral-200 dark:hover:bg-neutral-800 px-2 py-1 rounded cursor-pointer">Water.mp3</li>
          </ul>
          <button class="mt-4 w-full bg-neutral-200 dark:bg-neutral-800 text-xs py-1 rounded hover:bg-neutral-300 dark:hover:bg-neutral-700">+ Add Source</button>
        </section>

        <!-- Listener Info -->
        <section>
          <h2 class="text-sm font-semibold uppercase text-neutral-500 dark:text-neutral-400 mb-2">Listener</h2>
          <div class="text-xs space-y-1">
            <p>X: 120</p>
            <p>Y: 80</p>
            <p>Angle: 45°</p>
          </div>
        </section>
      </aside>

      <!-- Canvas + Controls -->
      <main class="flex-1 flex flex-col">
        <!-- Toolbar -->
        <div class="flex items-center justify-between p-4 border-b border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
          <div class="space-x-2">
            <button class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700">Play All</button>
            <button class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700">Stop All</button>
            <button class="px-3 py-1 rounded text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700">Undo</button>
          </div>
          <span class="text-xs text-neutral-500">Press 'U' to restore last deleted</span>
        </div>

        <!-- Canvas Placeholder -->
        <div class="flex-1 bg-neutral-200 dark:bg-black flex items-center justify-center">
          <div class="w-[600px] h-[400px] border-2 border-neutral-400 dark:border-neutral-700 flex items-center justify-center">
            <RoomCanvas />
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
import RoomCanvas from './RoomCanvas.vue';
// No logic here, just layout shell
</script>

<style scoped>
/* Tailwind handles all styling */
</style>
