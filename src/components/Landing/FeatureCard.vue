<template>
  <article
    class="rounded-xl border border-[var(--color-border-subtle)]
           bg-surface-raised/50 p-6 space-y-3 hover:bg-surface-raised
           transition-colors"
  >
    <h3 class="text-base font-semibold">{{ title }}</h3>

    <p class="text-sm text-text-secondary leading-relaxed">
      {{ text }}
    </p>

    <div class="h-20 flex items-center justify-center text-text-muted/50 pt-2">
      <slot name="visual">
        <span class="text-xs text-text-muted">Placeholder</span>
      </slot>
    </div>
  </article>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  text: { type: String, required: true }
})
</script>
