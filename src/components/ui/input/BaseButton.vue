<template>
  <button
  :type="type"
  :disabled="disabled"
  :class="[
    'inline-flex items-center justify-center rounded-lg border border-transparent px-4 py-2 text-sm font-medium transition',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60',
    variant === 'default' && 'bg-accent text-accent-foreground shadow-sm hover:bg-accent/90',
    variant === 'naked' && 'bg-transparent text-primary hover:text-accent',
    loading && 'pointer-events-none'
  ]"
  @click="(e) => $emit('click', e)"
>
    <span v-if="!loading">
      <slot />
    </span>
    <span v-else class="flex items-center justify-center space-x-2">
      <svg
        class="h-4 w-4 animate-spin text-accent-foreground"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4l4-4-4-4v4a12 12 0 100 24v-4l-4 4 4 4v-4a8 8 0 01-8-8z"
        />
      </svg>
      <span>Loading…</span>
    </span>
  </button>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    default: 'button',
  },
  disabled: Boolean,
  loading: Boolean,
  variant: {
    type: String,
    default: 'default', // or 'naked'
  },
})
defineEmits(['click'])
</script>
