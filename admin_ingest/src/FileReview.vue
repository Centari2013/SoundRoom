<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  fileEntry: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  planOptions: {
    type: Array,
    default: () => []
  },
  categories: {
    type: Array,
    default: () => []
  },
  uploading: Boolean
})

const emit = defineEmits([
  'update-field',
  'upload',
  'next',
  'previous',
  'duration-detected'
])

const tagString = ref(props.fileEntry.tags?.join(', ') ?? '')

watch(
  () => props.fileEntry,
  (next) => {
    tagString.value = next.tags?.join(', ') ?? ''
  },
  { deep: true }
)

const progressLabel = computed(() => `File ${props.index + 1} of ${props.total}`)

function handleAudioMetadata(event) {
  const duration = event.target.duration
  if (Number.isFinite(duration)) {
    emit('duration-detected', duration)
  }
}

function emitField(field, value) {
  emit('update-field', { field, value })
}

function handleTagBlur() {
  const tags = tagString.value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
  emitField('tags', tags)
}

function handleEnter(event) {
  if (event.key === 'ArrowRight') {
    emit('next')
  } else if (event.key === 'ArrowLeft') {
    emit('previous')
  }
}
</script>

<template>
  <section
    class="bg-panel-base rounded-2xl border border-slate-800 p-6"
    tabindex="0"
    @keyup="handleEnter"
  >
    <header class="flex flex-col gap-1 mb-4">
      <div class="text-sm text-slate-400">{{ progressLabel }}</div>
      <h3 class="text-2xl font-semibold">{{ fileEntry.name }}</h3>
      <p class="text-xs text-slate-500">Original file: {{ fileEntry.originalName }}</p>
    </header>

    <div class="grid gap-6 md:grid-cols-2">
      <div class="space-y-4">
        <audio
          class="w-full"
          controls
          preload="metadata"
          :src="fileEntry.previewUrl"
          @loadedmetadata="handleAudioMetadata"
        ></audio>

        <div class="grid gap-2">
          <label class="text-sm font-medium">Name</label>
          <input type="text" :value="fileEntry.name" @input="emitField('name', $event.target.value)" />
        </div>

        <div class="grid gap-2">
          <label class="text-sm font-medium">Category</label>
          <select :value="fileEntry.category" @change="emitField('category', $event.target.value)">
            <option disabled value="">Select category</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </div>

        <div class="grid gap-2">
          <label class="text-sm font-medium">Plan tier</label>
          <select :value="fileEntry.plan_tier" @change="emitField('plan_tier', $event.target.value)">
            <option disabled value="">Select tier</option>
            <option v-for="tier in planOptions" :key="tier" :value="tier">
              {{ tier }}
            </option>
          </select>
        </div>

        <div class="grid gap-2">
          <label class="text-sm font-medium">Tags (comma separated)</label>
          <input
            type="text"
            v-model="tagString"
            @blur="handleTagBlur"
            @keyup.enter="handleTagBlur"
            placeholder="rain, mellow, storm"
          />
        </div>
      </div>

      <div class="space-y-4">
        <div class="grid gap-2">
          <label class="text-sm font-medium">Cone inner</label>
          <input
            type="number"
            min="0"
            step="1"
            :value="fileEntry.cone_inner"
            @input="emitField('cone_inner', Number($event.target.value))"
          />
        </div>

        <div class="grid gap-2">
          <label class="text-sm font-medium">Cone outer</label>
          <input
            type="number"
            min="0"
            step="1"
            :value="fileEntry.cone_outer"
            @input="emitField('cone_outer', Number($event.target.value))"
          />
        </div>

        <div class="grid gap-2">
          <label class="text-sm font-medium">Duration (seconds)</label>
          <input type="number" :value="fileEntry.duration_seconds ?? ''" readonly class="bg-slate-900" />
        </div>

        <div class="grid gap-2">
          <label class="text-sm font-medium">Size</label>
          <input type="text" :value="fileEntry.sizeLabel" readonly class="bg-slate-900" />
        </div>

        <div class="grid gap-2">
          <label class="text-sm font-medium">MIME type</label>
          <input type="text" :value="fileEntry.mime_type" readonly class="bg-slate-900" />
        </div>

        <div class="flex gap-3 pt-4">
          <button
            type="button"
            class="bg-slate-800 border border-slate-700"
            @click="emit('previous')"
            :disabled="index === 0 || uploading"
          >
            Previous
          </button>
          <button
            type="button"
            class="bg-slate-800 border border-slate-700"
            @click="emit('next')"
            :disabled="index >= total - 1 || uploading"
          >
            Next
          </button>
          <button
            type="button"
            class="bg-emerald-500 text-black font-semibold ml-auto"
            @click="emit('upload')"
            :disabled="uploading || fileEntry.uploaded"
          >
            {{ fileEntry.uploaded ? 'Uploaded' : uploading ? 'Uploading…' : 'Upload' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
