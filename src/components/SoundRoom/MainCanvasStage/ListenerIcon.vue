<template>
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="presentation"
    :class="['transition duration-150 ease-out drop-shadow-sm', isActive ? 'scale-110 drop-shadow-[0_0_10px_rgba(96,165,250,0.65)]' : '']"
  >
    <circle
      cx="16"
      cy="16"
      r="10"
      stroke="currentColor"
      stroke-width="2"
    />
    <path
      d="M16 19 L20 13 H12 Z"
      stroke="currentColor"
      stroke-width="2"
      stroke-linejoin="round"
      fill="none"
    />
    <path
      d="M16 11 L16 19"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>
</template>

<script setup>
defineProps({
  isActive: {
    type: Boolean,
    default: false,
  }
})
</script>
