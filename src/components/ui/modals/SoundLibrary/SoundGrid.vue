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
                  placeholder="Search sounds, tags, categories"
                  class="w-full rounded-full border border-border-subtle bg-surface-base py-2 pl-9 pr-9 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-strong"
                >
                <button
                  v-if="searchQuery.trim()"
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-muted hover:text-text-primary"
                  aria-label="Clear search"
                  @click="clearSearch"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-full border border-border-subtle bg-surface-base p-2 text-text-muted hover:text-text-primary"
                :class="{ 'text-text-primary border-border-strong': showTagFilters }"
                aria-label="Toggle filters"
                @click="showTagFilters = !showTagFilters"
              >
                <SlidersHorizontal class="h-4 w-4" />
              </button>
              <button
                v-if="hasActiveFilters"
                type="button"
                class="rounded-full border border-border-subtle bg-surface-base px-3 py-2 text-xs text-text-muted hover:text-text-primary"
                @click="clearAllFilters"
              >
                Clear all
              </button>
            </div>

            <div v-if="showTagFilters" class="mt-3 space-y-3">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs uppercase tracking-wide text-text-muted">Category</span>
                <button
                  type="button"
                  class="rounded-full border border-border-subtle px-3 py-1 text-xs"
                  :class="!activeCategory ? 'text-text-primary border-border-strong' : 'text-text-muted hover:text-text-primary'"
                  @click="setCategory('')"
                >
                  All
                </button>
                <button
                  v-for="category in categoryOptions"
                  :key="category.id"
                  type="button"
                  class="rounded-full border border-border-subtle px-3 py-1 text-xs"
                  :class="activeCategory === category.id ? 'bg-[color-mix(in_srgb,var(--color-accent)_20%,transparent)] text-text-primary border-border-strong' : 'text-text-muted hover:text-text-primary'"
                  @click="setCategory(category.id)"
                >
                  {{ category.label }}
                </button>
                <button
                  v-if="activeCategory"
                  type="button"
                  class="text-xs text-text-muted hover:text-text-primary underline"
                  @click="setCategory('')"
                >
                  Clear category
                </button>
              </div>

              <div class="space-y-2">
                <div v-if="selectedTags.length" class="flex flex-wrap items-center gap-2">
                  <span class="text-xs uppercase tracking-wide text-text-muted">Selected</span>
                  <button
                    v-for="tag in selectedTags"
                    :key="`selected-${tag}`"
                    type="button"
                    class="rounded-full border border-border-strong bg-[color-mix(in_srgb,var(--color-accent)_20%,transparent)] px-3 py-1 text-xs text-text-primary"
                    @click="toggleTag(tag)"
                  >
                    {{ tag }}
                  </button>
                  <button
                    type="button"
                    class="text-xs text-text-muted hover:text-text-primary underline"
                    @click="clearTags"
                  >
                    Clear tags
                  </button>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-xs uppercase tracking-wide text-text-muted">Suggested tags</span>
                  <button
                    v-for="tag in visibleTagSuggestions"
                    :key="tag"
                    type="button"
                    class="rounded-full border border-border-subtle px-3 py-1 text-xs text-text-muted hover:text-text-primary"
                    :class="selectedTags.includes(tag) ? 'bg-[color-mix(in_srgb,var(--color-accent)_20%,transparent)] text-text-primary border-border-strong' : ''"
                    @click="toggleTag(tag)"
                  >
                    {{ tag }}
                  </button>
                  <button
                    v-if="contextTagSuggestions.length > TAG_SUGGESTION_LIMIT"
                    type="button"
                    class="text-xs text-text-muted hover:text-text-primary underline"
                    @click="showAllTags = !showAllTags"
                  >
                    {{ showAllTags ? 'Less tags' : `More tags (${contextTagSuggestions.length - TAG_SUGGESTION_LIMIT})` }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <BaseButton id="close-lib-btn" class="text-sm mt-1" @click="$emit('close')">Close</BaseButton>
      </div>
    </div>
    <div ref="gridScroll" class="mt-5 place-content-start p-6 pt-52 overflow-y-auto h-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

      <template v-if="!visibleSounds.length && !waiting">
        <div class="col-span-full text-center text-text-muted mt-20">
          <div class="text-lg font-semibold mb-2">No sounds match these filters.</div>
          <button type="button" class="text-sm underline hover:text-text-primary" @click="clearAllFilters">
            Clear filters
          </button>
        </div>
      </template>

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

const emit = defineEmits(['close', 'toggleSound', 'updateCurrent', 'upload', 'delete', 'locked', 'update:activeCategory'])

const INITIAL_VISIBLE_LIMIT = 50
const VISIBLE_STEP = 50
const TAG_SUGGESTION_LIMIT = 10

const categoryOptions = [
  { id: 'nature', label: 'Nature' },
  { id: 'human', label: 'Human' },
  { id: 'musical', label: 'Musical' },
  { id: 'tools', label: 'Work/Focus' },
  { id: 'atmospheric', label: 'Atmospheric' },
  { id: 'misc', label: 'Misc' }
]

const searchQuery = ref('')
const showTagFilters = ref(false)
const selectedTags = ref([])
const showAllTags = ref(false)
const visibleLimit = ref(INITIAL_VISIBLE_LIMIT)

const activeCategory = computed(() => props.activeCategory || '')

const normalizedSounds = computed(() => {
  const soundList = Array.isArray(props.sounds) ? props.sounds : []
  return soundList.map((sound) => {
    const tags = Array.isArray(sound.tags)
      ? sound.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : typeof sound.tags === 'string'
        ? sound.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : []

    return {
      ...sound,
      tags
    }
  })
})

const searchMatchedSounds = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return normalizedSounds.value

  return normalizedSounds.value.filter((sound) => {
    const tagsText = sound.tags.join(' ').toLowerCase()
    const categoryText = String(sound.category || sound.bucket || '').toLowerCase()
    const descriptionText = String(sound.description || '').toLowerCase()
    const nameText = String(sound.name || '').toLowerCase()

    return (
      nameText.includes(query) ||
      tagsText.includes(query) ||
      categoryText.includes(query) ||
      descriptionText.includes(query)
    )
  })
})

const categoryFilteredSounds = computed(() => {
  if (!activeCategory.value || activeCategory.value === 'your-sounds') {
    return searchMatchedSounds.value
  }

  return searchMatchedSounds.value.filter((sound) => {
    const soundCategory = String(sound.category || sound.bucket || '').toLowerCase()
    return soundCategory === activeCategory.value
  })
})

const contextTagSuggestions = computed(() => {
  const counts = new Map()
  for (const sound of categoryFilteredSounds.value) {
    for (const tag of sound.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1)
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag)
})

const filteredSounds = computed(() => {
  if (!selectedTags.value.length) {
    return categoryFilteredSounds.value
  }

  return categoryFilteredSounds.value.filter((sound) =>
    selectedTags.value.every((tag) => sound.tags.includes(tag))
  )
})

const visibleSounds = computed(() => filteredSounds.value.slice(0, visibleLimit.value))
const remainingSoundsCount = computed(() => Math.max(filteredSounds.value.length - visibleSounds.value.length, 0))
const showLoadMore = computed(() => remainingSoundsCount.value > 0)

const visibleTagSuggestions = computed(() => {
  const suggestions = contextTagSuggestions.value.filter((tag) => !selectedTags.value.includes(tag))
  if (showAllTags.value) {
    return suggestions
  }
  return suggestions.slice(0, TAG_SUGGESTION_LIMIT)
})

const hasActiveFilters = computed(() => {
  return Boolean(searchQuery.value.trim()) || Boolean(activeCategory.value) || selectedTags.value.length > 0
})

watch([searchQuery, activeCategory, selectedTags], () => {
  visibleLimit.value = INITIAL_VISIBLE_LIMIT
  showAllTags.value = false
}, { deep: true })

function setCategory(categoryId) {
  emit('update:activeCategory', categoryId)
}

function toggleTag(tag) {
  if (!tag) return
  if (selectedTags.value.includes(tag)) {
    selectedTags.value = selectedTags.value.filter((t) => t !== tag)
    return
  }
  selectedTags.value = [...selectedTags.value, tag]
}

function clearSearch() {
  searchQuery.value = ''
}

function clearTags() {
  selectedTags.value = []
}

function clearAllFilters() {
  clearSearch()
  clearTags()
  setCategory('')
}

function loadMoreSounds() {
  visibleLimit.value += VISIBLE_STEP
}

const { isAuthenticated } = useAuth()
const { canAccess, requireEntitlement } = useEntitlements()

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
