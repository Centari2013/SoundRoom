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
    class="bg-gray-900/60 rounded-2xl border border-gray-800 p-6 shadow-xl backdrop-blur-sm"
    tabindex="0"
    @keyup="handleEnter"
  >
    <!-- Header -->
    <header class="flex flex-col gap-1 mb-6">
      <div class="text-xs uppercase tracking-wide text-gray-500">{{ progressLabel }}</div>
      <h3 class="text-2xl font-semibold text-gray-100">{{ fileEntry.name }}</h3>
      <p class="text-sm text-gray-500">Original file: {{ fileEntry.originalName }}</p>
    </header>

    <div class="grid gap-8 md:grid-cols-2">
      <!-- LEFT COLUMN -->
      <div class="space-y-6">
        <audio
          class="w-full rounded-lg overflow-hidden shadow border border-gray-800"
          controls
          preload="metadata"
          :src="fileEntry.previewUrl"
          @loadedmetadata="handleAudioMetadata"
        ></audio>

        <!-- Name -->
        <div class="space-y-1.5">
          <label class="text-sm text-gray-300 font-medium">Display Name</label>
          <input
            type="text"
            class="w-full bg-gray-800/70 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 focus:(outline-none ring-2 ring-emerald-500)"
            :value="fileEntry.name"
            @input="emitField('name', $event.target.value)"
          />
        </div>

        <!-- Category -->
        <div class="space-y-1.5">
          <label class="text-sm text-gray-300 font-medium">Category</label>
          <select
            class="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 focus:(outline-none ring-2 ring-emerald-500)"
            :value="fileEntry.category"
            @change="emitField('category', $event.target.value)"
          >
            <option disabled value="">Select category</option>
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>

        <!-- Plan tier -->
        <div class="space-y-1.5">
          <label class="text-sm text-gray-300 font-medium">Plan tier</label>
          <select
            class="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 focus:(outline-none ring-2 ring-emerald-500)"
            :value="fileEntry.plan_tier"
            @change="emitField('plan_tier', $event.target.value)"
          >
            <option disabled value="">Select tier</option>
            <option v-for="t in planOptions" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>

        <!-- Tags -->
        <div class="space-y-1.5">
          <label class="text-sm text-gray-300 font-medium">Tags (comma separated)</label>
          <input
            type="text"
            class="w-full bg-gray-800/70 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 focus:(outline-none ring-2 ring-emerald-500)"
            v-model="tagString"
            @blur="handleTagBlur"
            @keyup.enter="handleTagBlur"
            placeholder="rain, mellow, storm"
          />
        </div>
      </div>

      <!-- RIGHT COLUMN -->
      <div class="space-y-6">
        <!-- Cone inner -->
        <div class="space-y-1.5">
          <label class="text-sm text-gray-300 font-medium">Cone inner</label>
          <input
            type="number"
            min="0"
            step="1"
            class="w-full bg-gray-800/70 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 focus:(outline-none ring-2 ring-emerald-500)"
            :value="fileEntry.cone_inner"
            @input="emitField('cone_inner', Number($event.target.value))"
          />
        </div>

        <!-- Cone outer -->
        <div class="space-y-1.5">
          <label class="text-sm text-gray-300 font-medium">Cone outer</label>
          <input
            type="number"
            min="0"
            step="1"
            class="w-full bg-gray-800/70 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 focus:(outline-none ring-2 ring-emerald-500)"
            :value="fileEntry.cone_outer"
            @input="emitField('cone_outer', Number($event.target.value))"
          />
        </div>

        <!-- Duration -->
        <div class="space-y-1.5">
          <label class="text-sm text-gray-300 font-medium">Duration (seconds)</label>
          <input
            type="number"
            readonly
            class="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-400"
            :value="fileEntry.duration_seconds ?? ''"
          />
        </div>

        <!-- Size -->
        <div class="space-y-1.5">
          <label class="text-sm text-gray-300 font-medium">File size</label>
          <input
            type="text"
            readonly
            class="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-400"
            :value="fileEntry.sizeLabel"
          />
        </div>

        <!-- MIME -->
        <div class="space-y-1.5">
          <label class="text-sm text-gray-300 font-medium">MIME type</label>
          <input
            type="text"
            readonly
            class="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-400"
            :value="fileEntry.mime_type"
          />
        </div>

        <!-- Buttons -->
        <div class="flex gap-3 pt-4">
          <button
            type="button"
            class="px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-gray-200 hover:bg-gray-700 disabled:opacity-40"
            @click="emit('previous')"
            :disabled="index === 0 || uploading"
          >
            Previous
          </button>

          <button
            type="button"
            class="px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-gray-200 hover:bg-gray-700 disabled:opacity-40"
            @click="emit('next')"
            :disabled="index >= total - 1 || uploading"
          >
            Next
          </button>

          <button
            type="button"
            class="ml-auto px-4 py-2 rounded-md bg-emerald-500 text-black font-semibold hover:bg-emerald-400 disabled:opacity-40"
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


