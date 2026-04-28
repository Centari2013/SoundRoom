<template>
  <div class="flex-1 relative overflow-hidden">
    <div class="absolute top-0 left-0 right-0 z-10 px-6 py-4 bg-[color-mix(in_srgb,var(--color-bg-surface)_70%,transparent)] backdrop-blur-md border-b border-border-subtle text-text-primary">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1 min-w-0">
          <h2 class="text-2xl font-bold">SoundLibrary</h2>
          <div class="mt-3">
            <div class="flex items-center gap-2">
              <div class="relative flex-1">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search sounds"
                  class="w-full rounded-full border border-border-subtle bg-surface-base py-2 pl-9 pr-9 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-strong"
                >
                <button
                  v-if="hasActiveFilters"
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-muted hover:text-text-primary"
                  aria-label="Clear search and category filter"
                  @click="clearFilters"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-full border border-border-subtle bg-surface-base p-2 text-text-muted hover:text-text-primary"
                :class="{ 'text-text-primary border-border-strong': isCategoryFilterOpen }"
                aria-label="Toggle category filters"
                @click="isCategoryFilterOpen = !isCategoryFilterOpen"
              >
                <SlidersHorizontal class="h-4 w-4" />
              </button>
            </div>
            <div v-if="isCategoryFilterOpen" class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="category in categories"
                :key="category"
                type="button"
                class="rounded-full border border-border-subtle px-3 py-1 text-xs text-text-muted hover:text-text-primary"
                :class="{
                  'bg-[color-mix(in_srgb,var(--color-accent)_20%,transparent)] text-text-primary border-border-strong': selectedCategory === category
                }"
                @click="toggleCategory(category)"
              >
                {{ category }}
              </button>
            </div>
          </div>
        </div>
        <BaseButton id="close-lib-btn" class="text-sm mt-1" @click="$emit('close')">Close</BaseButton>
      </div>
    </div>
    <div ref="gridScroll" class="mt-5 place-content-start p-6 pt-44 overflow-y-auto h-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <SoundGridItem
        v-for="sound in visibleSounds"
        :key="sound.libraryId || sound.id"
        :sound="sound"
        :userSound="activeCategory === 'your-sounds'"
        v-bind="{ waiting, soundLibrarySources, currentlyPlayingId }"
        @toggle="$emit('toggleSound', $event)"
        @updateCurrent="$emit('updateCurrent', $event)"
        @delete="$emit('delete', $event)"
        @locked="$emit('locked', $event)"
      />

      <div v-if="showLoadMore" class="col-span-full flex justify-center pt-2">
        <BaseButton class="text-xs px-3 py-1" @click="loadMoreSounds">
          Show more ({{ remainingSoundsCount }})
        </BaseButton>
      </div>

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
          :disabled="!canUpload"
          :title="!canUpload ? lockTooltip : undefined"
          :class="{ 'opacity-60 cursor-not-allowed': !canUpload }"
        >
          <span class="inline-flex items-center gap-1">
            <span>{{ uploadCtaLabel }}</span>
          </span>
        </button>
        <span v-if="!canUpload" class="text-xs uppercase tracking-wide text-accent">Pro feature</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Search, SlidersHorizontal, X } from 'lucide-vue-next'
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

const INITIAL_VISIBLE_LIMIT = 50
const VISIBLE_STEP = 50

const categories = ['Nature', 'Human', 'Musical', 'Work/Focus', 'Atmospheric', 'Misc']
const searchQuery = ref('')
const isCategoryFilterOpen = ref(false)
const selectedCategory = ref('')
const visibleLimit = ref(INITIAL_VISIBLE_LIMIT)

const filteredSounds = computed(() => {
  const normalizedSearch = searchQuery.value.trim().toLowerCase()

  const soundList = Array.isArray(props.sounds) ? props.sounds : []

  if (!normalizedSearch && !selectedCategory.value) {
    return soundList
  }

  return soundList.filter((sound) => {
    const matchesCategory = !selectedCategory.value || sound.category === selectedCategory.value

    if (!normalizedSearch) {
      return matchesCategory
    }

    const tags = Array.isArray(sound.tags) ? sound.tags.join(' ').toLowerCase() : ''
    const matchesSearch =
      sound.name?.toLowerCase().includes(normalizedSearch) ||
      sound.category?.toLowerCase().includes(normalizedSearch) ||
      tags.includes(normalizedSearch)

    return matchesCategory && matchesSearch
  })
})

const visibleSounds = computed(() => filteredSounds.value.slice(0, visibleLimit.value))
const remainingSoundsCount = computed(() => Math.max(filteredSounds.value.length - visibleSounds.value.length, 0))
const showLoadMore = computed(() => remainingSoundsCount.value > 0)
const hasActiveFilters = computed(() => Boolean(searchQuery.value.trim()) || Boolean(selectedCategory.value))

watch([searchQuery, selectedCategory, () => props.activeCategory], () => {
  visibleLimit.value = INITIAL_VISIBLE_LIMIT
})

function toggleCategory(category) {
  selectedCategory.value = selectedCategory.value === category ? '' : category
}

function clearFilters() {
  searchQuery.value = ''
  selectedCategory.value = ''
}

function loadMoreSounds() {
  visibleLimit.value += VISIBLE_STEP
}

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
const lockTooltip = 'Available on Pro tier.'

function handleUploadClick() {
  if (!requireEntitlement('canUpload')) return
  emit('upload')
}

defineExpose({ scrollTop })
</script>
