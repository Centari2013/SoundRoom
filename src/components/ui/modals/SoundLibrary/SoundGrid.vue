<template>
  <div class="flex-1 relative overflow-hidden">
    <div class="absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-6 py-4 bg-[color-mix(in_srgb,var(--color-bg-surface)_70%,transparent)] backdrop-blur-md border-b border-border-subtle text-text-primary">
      <h2 class="text-2xl font-bold">SoundLibrary</h2>
      <BaseButton id="close-lib-btn" class="text-sm" @click="$emit('close')">Close</BaseButton>
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
          <div class="col-span-full text-center text-text-muted mt-32">
            <div class="text-xl font-semibold mb-2">Nothing to hear!</div>
            <div class="mb-4">Upload your first sound below and it'll show up here.</div>
          </div>
        </template>
    </div>
     <div
        v-if="isAuthenticated && activeCategory === 'your-sounds'"
        class="absolute bottom-0 left-0 right-0 p-4 bg-surface-base border-t border-border-subtle text-text-primary"
      >
        <div class="flex items-center justify-between gap-3">
          <button
            type="button"
            class="text-sm font-medium text-text-primary hover:underline"
            @click="handleUploadClick"
          >
            {{ uploadCtaLabel }}
          </button>
        <span v-if="!canUpload" class="text-xs uppercase tracking-wide text-accent">Pro feature</span>
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
