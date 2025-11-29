<template>
  <article
    class="rounded-xl border border-[var(--color-border-subtle)] 
           bg-surface-raised/70 p-6 space-y-4 hover:bg-surface-raised 
           transition-colors"
  >
    <div class="flex items-center gap-3">
      <span
        class="h-10 w-10 rounded-full flex items-center justify-center 
               text-xl select-none 
               bg-[color-mix(in_srgb,var(--color-accent)_20%,transparent)] 
               text-[color-mix(in_srgb,var(--color-accent)_80%,white)]"
      >
        {{ emoji }}
      </span>
      <h3 class="text-lg font-medium">{{ title }}</h3>
    </div>

    <p class="text-sm text-text-secondary leading-relaxed">
      {{ text }}
    </p>

    <div
      class="h-24 rounded-lg 
              flex items-center justify-center"
    >
      <slot name="visual">
        <span class="text-xs text-text-muted">Placeholder</span>
      </slot>
    </div>
  </article>
</template>

<script setup>
defineProps({
  emoji: { type: String, required: true },
  title: { type: String, required: true },
  text: { type: String, required: true }
})
</script>
