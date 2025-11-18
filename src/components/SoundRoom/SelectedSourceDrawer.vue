<template>
  <Transition
    enter-active-class="transform transition ease-out duration-300"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transform transition ease-in duration-200"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="selectedSource"
      class="md:hidden fixed inset-x-0 bottom-24 z-30 px-4 pointer-events-none"
      aria-live="polite"
    >
      <div class="pointer-events-auto rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xl overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <span class="text-sm font-semibold">Selected Source</span>
          <button
            type="button"
            class="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200"
            @click="$emit('close')"
          >
            Close
          </button>
        </div>
        <div class="max-h-[60vh] overflow-y-auto">
          <SidebarRight
            class="w-full"
            v-bind="{ selectedSource }"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import SidebarRight from '@/components/SoundRoom/SidebarRight/SidebarRight.vue'

defineProps({
  selectedSource: {
    type: Object,
    default: null
  }
})

defineEmits(['close'])
</script>
