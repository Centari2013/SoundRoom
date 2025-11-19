<script setup>
import { ref } from 'vue'
import { persistState, loadPersistedState } from './utils/localStore'

const emit = defineEmits(['directory-loaded'])
const supportedExtensions = ['.mp3', '.wav', '.ogg', '.flac']
const persisted = loadPersistedState()
const lastDirectoryName = ref(persisted.lastDirectoryName ?? null)
const pickerBusy = ref(false)
const supportsNativePicker = typeof window !== 'undefined' && 'showDirectoryPicker' in window

function normalizeRelativePath(file) {
  if (file.webkitRelativePath) return file.webkitRelativePath
  return file.name
}

function deriveDirectoryName(fileList) {
  if (!fileList?.length) return 'Unknown folder'
  const firstPath = normalizeRelativePath(fileList[0])
  if (firstPath.includes('/')) {
    return firstPath.split('/')[0]
  }
  return 'Loose files'
}

function filterSupported(list) {
  const allowed = []
  Array.from(list || []).forEach((file) => {
    const lower = file.name.toLowerCase()
    if (supportedExtensions.some((ext) => lower.endsWith(ext))) {
      allowed.push({ file, relativePath: normalizeRelativePath(file) })
    }
  })
  return allowed
}

function emitFiles(selectedFiles, directoryLabel) {
  lastDirectoryName.value = directoryLabel
  persistState({ lastDirectoryName: directoryLabel })
  emit('directory-loaded', {
    directoryName: directoryLabel,
    files: selectedFiles
  })
}

function handleInput(event) {
  const selected = filterSupported(event.target.files)
  emitFiles(selected, deriveDirectoryName(event.target.files))
}

async function handleSystemPicker() {
  if (!supportsNativePicker) {
    return
  }
  pickerBusy.value = true
  try {
    const dirHandle = await window.showDirectoryPicker()
    const collected = []

    // Recursively traverse directory handles to match <input webkitdirectory> behaviour.
    async function walkDirectory(handle, prefix = '') {
      for await (const entry of handle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile()
          const name = prefix ? `${prefix}/${entry.name}` : entry.name
          const lower = entry.name.toLowerCase()
          if (supportedExtensions.some((ext) => lower.endsWith(ext))) {
            Object.defineProperty(file, 'webkitRelativePath', {
              configurable: true,
              enumerable: true,
              value: name
            })
            collected.push({ file, relativePath: name })
          }
        } else if (entry.kind === 'directory') {
          await walkDirectory(entry, prefix ? `${prefix}/${entry.name}` : entry.name)
        }
      }
    }

    await walkDirectory(dirHandle)
    emitFiles(collected, dirHandle.name)
  } catch (error) {
    console.warn('[admin-ingest] Directory picker cancelled', error)
  } finally {
    pickerBusy.value = false
  }
}
</script>

<template>
  <section class="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
    <header class="flex flex-col gap-1 mb-4">
      <h2 class="text-lg font-semibold">Directory picker</h2>
      <p class="text-sm text-gray-400">
        Supported formats: <code>.mp3</code>, <code>.wav</code>, <code>.ogg</code>, <code>.flac</code>
      </p>
      <p v-if="lastDirectoryName" class="text-xs text-gray-500">Last directory: {{ lastDirectoryName }}</p>
    </header>

    <div class="flex flex-wrap gap-3 items-center">
      <label
        class="px-4 py-2 rounded-md bg-emerald-500 text-black font-semibold cursor-pointer hover:bg-emerald-400"
      >
        <span>Select folder</span>
        <input type="file" class="hidden" multiple webkitdirectory @change="handleInput" />
      </label>

      <button
        type="button"
        :disabled="pickerBusy || !supportsNativePicker"
        @click="handleSystemPicker"
        class="px-4 py-2 rounded-md bg-gray-900 border border-gray-700 hover:bg-gray-800 disabled:opacity-50"
      >
        Use File System Access API
      </button>

      <p v-if="!supportsNativePicker" class="text-xs text-gray-500">
        Browser does not support showDirectoryPicker — fallback input is used.
      </p>
    </div>
  </section>
</template>
