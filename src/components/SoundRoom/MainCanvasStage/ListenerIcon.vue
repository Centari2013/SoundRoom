<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="transition-transform duration-150 ease-out"
    :class="isActive ? 'scale-105 drop-shadow-[0_0_10px_rgba(59,130,246,0.35)]' : ''"
    aria-hidden="true"
  >
    <circle cx="16" cy="16" r="10.5" />
    <path d="M16 4.5 19.5 10h-7Z" />
    <path d="M12.5 15.75a3.5 3.5 0 1 1 7 0c0 1.93-1.57 4-3.5 4s-3.5-2.07-3.5-4Z" />
  </svg>
</template>

<script setup>
defineProps({
  isActive: {
    type: Boolean,
    default: false,
  },
})
</script>
