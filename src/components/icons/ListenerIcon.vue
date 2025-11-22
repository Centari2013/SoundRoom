<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    fill="none"
    :class="[
      'w-8 h-8 text-blue-400 transition duration-150 ease-out',
      isActive ? 'scale-110 drop-shadow-[0_0_10px_rgba(96,165,250,0.7)]' : 'scale-100'
    ]"
    aria-hidden="true"
  >
    <circle
      cx="16"
      cy="16"
      r="10"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
    />
    <path
      d="M16 4.8 19.5 9.8h-7z"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
    <path
      d="M16 9.5v2.5"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
    />
  </svg>
</template>

<script setup>
const { isActive } = defineProps({
  isActive: {
    type: Boolean,
    default: false,
  },
})
</script>
