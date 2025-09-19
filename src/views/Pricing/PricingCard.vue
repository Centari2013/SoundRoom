<template>
  <div
    class="rounded-sm p-6 shadow-md border hover:shadow-lg transition-all flex flex-col justify-between bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
    :class="highlight ? 'border-black dark:border-white' : 'border-neutral-300 dark:border-neutral-800'"
  >
    <div>
      <h2 class="text-xl font-bold mb-2">{{ title }}</h2>
      <p class="text-2xl font-semibold mb-4">{{ price }}</p>
      <ul class="space-y-2 mb-6">
        <li v-for="(feature, index) in features" :key="index" class="flex items-start text-sm">
          <span class="mr-2">✔️</span>
          <span>{{ feature }}</span>
        </li>
      </ul>
    </div>
    <button
      class="w-full py-2 rounded-xl font-semibold transition border border-transparent bg-[#d3d3d3e1] dark:bg-[#1a1a1a] hover:border-[#646cff] disabled:opacity-50 disabled:cursor-not-allowed disabled:dark:bg-neutral-700"
      :disabled="ctaDisabled"
      type="button"
    >
      {{ ctaLabel }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  price: String,
  features: Array,
  highlight: Boolean,
  ctaLabel: {
    type: String,
    default: 'Select Plan'
  },
  ctaDisabled: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
</style>
