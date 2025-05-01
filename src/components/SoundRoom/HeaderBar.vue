<template>
  <header class="px-6 py-4 border-b border-neutral-300 dark:border-neutral-800 flex items-center justify-between">
    <h1 class="text-xl font-bold tracking-wide">SoundRoom</h1>
    <nav class="space-x-4">
      <button @click="$emit('openHelp')" class="px-3 py-1 text-sm rounded hover:bg-neutral-200 dark:hover:bg-neutral-800">Help</button>
    </nav>
  </header>
</template>

