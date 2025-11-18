<template>
  <section class="w-full">
    <button
      type="button"
      class="w-full flex items-center justify-between rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-4 py-3 text-left font-medium"
      :aria-expanded="open"
      @click="toggleDrawer"
    >
      <span>Sound Sources</span>
      <span class="text-xs text-neutral-500">{{ open ? 'Hide' : 'Show' }}</span>
    </button>
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="open"
        class="mt-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-md overflow-hidden"
      >
        <div class="max-h-[55vh] overflow-y-auto">
          <SidebarLeft
            class="w-full"
            v-bind="{
              MAX_SOURCES,
              handleDragStart,
              listener
            }"
          />
        </div>
      </div>
    </Transition>
  </section>
</template>

<script setup>
import SidebarLeft from '@/components/SoundRoom/SidebarLeft/SidebarLeft.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  MAX_SOURCES: { type: Number, required: true },
  handleDragStart: { type: Function, required: true },
  listener: { type: Object, default: null }
})

const emit = defineEmits(['update:open'])

function toggleDrawer() {
  emit('update:open', !props.open)
}
</script>
