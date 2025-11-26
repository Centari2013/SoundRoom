<template>
  <button
  :type="type"
  :disabled="disabled"
  :class="[
    'transition focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base disabled:opacity-50 disabled:cursor-not-allowed',
    variant === 'default' && 'px-4 py-2 rounded text-sm font-medium bg-accent hover:bg-accent-strong text-text-inverse',
    variant === 'naked' && 'bg-transparent text-text-primary hover:text-accent-soft'
  ]"
  @click="(e) => $emit('click', e)"
>
    <span v-if="!loading">
      <slot />
    </span>
    <span v-else class="flex items-center justify-center space-x-2">
      <svg
        class="w-4 h-4 animate-spin text-text-inverse"
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
