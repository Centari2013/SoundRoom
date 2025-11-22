<template>
  <div class="flex-1 relative overflow-hidden">
    <div class="absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-6 py-4 bg-neutral-100/90 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-300/80 dark:border-neutral-800">
      <h2 class="text-2xl font-bold text-neutral-800 dark:text-neutral-50">SoundLibrary</h2>
      <BaseButton class="text-sm" @click="$emit('close')">Close</BaseButton>
    </div>
    <div ref="gridScroll" class="mt-5 place-content-start p-6 pt-20 overflow-y-auto h-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <SoundGridItem
        v-for="sound in sounds"
        :key="sound.libraryId || sound.id"
        :sound="sound"
        :userSound="activeCategory === 'your-sounds'"
        v-bind="{ waiting, soundLibrarySources, currentlyPlayingId }"
        @toggle="$emit('toggleSound', $event)"
        @updateCurrent="$emit('updateCurrent', $event)"
        @delete="$emit('delete', $event)"
        @locked="$emit('locked', $event)"
        />
      <template v-if="canUpload && activeCategory === 'your-sounds' && sounds.length === 0">
          <div class="col-span-full text-center text-neutral-600 mt-32">
            <div class="text-xl font-semibold mb-2 text-neutral-800">Nothing to hear!</div>
            <div class="mb-4 text-neutral-700">Upload your first sound below and it'll show up here.</div>
          </div>
        </template>
    </div>
     <div
        v-if="isAuthenticated && activeCategory === 'your-sounds'"
        class="absolute bottom-0 left-0 right-0 p-4 bg-neutral-100 dark:bg-neutral-950 border-t border-neutral-300/80 dark:border-neutral-800 shadow-[0_-8px_18px_rgba(0,0,0,0.08)]"
      >
        <div class="flex items-center justify-between gap-3">
          <button
            type="button"
            class="text-sm font-medium text-neutral-800 dark:text-neutral-100 hover:underline"
            @click="handleUploadClick"
          >
            {{ uploadCtaLabel }}
          </button>
        <span v-if="!canUpload" class="text-xs uppercase tracking-wide text-violet-500 dark:text-violet-300">Pro feature</span>
        </div>
      </div>
  </div>
  
</template>

<script setup>
import { computed, ref } from 'vue'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import SoundGridItem from './SoundGridItem.vue'
import { useAuth } from '@/composables/useAuth'
import { useEntitlements } from '@/composables/useEntitlements'

const props = defineProps({
  sounds: Array,
  waiting: Boolean,
  soundLibrarySources: Array,
  currentlyPlayingId: String,
  activeCategory: String
})

const { isAuthenticated } = useAuth()
const { canAccess, requireEntitlement } = useEntitlements()
const emit = defineEmits(['close', 'toggleSound', 'updateCurrent', 'upload', 'delete', 'locked'])

const gridScroll = ref(null)
function scrollTop() {
  gridScroll.value?.scrollTo({ top: 0 })
}

const canUpload = computed(() => canAccess('canUpload'))
const uploadCtaLabel = computed(() =>
  canUpload.value ? 'Upload your own sound' : 'Upgrade to upload your own sounds'
)

function handleUploadClick() {
  if (!requireEntitlement('canUpload')) return
  emit('upload')
}

defineExpose({ scrollTop })
</script>
