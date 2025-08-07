<template>
  <button
  :type="type"
  :disabled="disabled"
  :class="[
    'transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed',
    variant === 'default' && 'px-4 py-2 rounded text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white',
    variant === 'naked' && ''
  ]"
  @click="(e) => $emit('click', e)"
>
    <span v-if="!loading">
      <slot />
    </span>
    <span v-else class="flex items-center justify-center space-x-2">
      <svg
        class="w-4 h-4 animate-spin text-white"
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
