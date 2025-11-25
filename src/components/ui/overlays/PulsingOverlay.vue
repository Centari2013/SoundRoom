<template>
  <transition name="fade" @after-leave="emit('done')">
    <div
      v-if="visible"
      class="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-[color-mix(in_srgb,var(--color-bg-app)_70%,transparent)] z-50"
    >
      <div
        class="text-xl font-medium tracking-wide text-text-primary animate-pulse"
      >
        {{ text }}
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const emit = defineEmits(['done'])

const props = defineProps({
  text: {
    type: String,
    default: 'Hehehehehe...'
  },
  duration: {
    type: Number,
    default: null // stays forever unless specified
  }
})

const visible = ref(true)

onMounted(() => {
  if (props.duration !== null) {
    setTimeout(() => {
      visible.value = false
    }, props.duration)
  }
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
