<template>
  <div class="w-full flex justify-center bg-[var(--color-bg-app)] py-16 px-4">
    <div
      class="prose prose-neutral dark:prose-invert max-w-3xl w-full 
             bg-white rounded-2xl shadow-lg 
             p-8 sm:p-10 md:p-12 overflow-hidden"
      v-html="privacyHtml"
    />
  </div>
</template>

<script setup>
import privacyHtml from '@/content/privacy.html?raw'
</script>
