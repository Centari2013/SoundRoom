<script setup>
import { ref } from 'vue'
import { persistState, loadPersistedState } from './utils/localStore'

const emit = defineEmits(['directory-loaded'])
const supportedExtensions = ['.mp3', '.wav', '.ogg', '.flac']
const persisted = loadPersistedState()
const lastDirectoryName = ref(persisted.lastDirectoryName ?? null)
const pickerBusy = ref(false)
const dragActive = ref(false)
const supportsNativePicker = typeof window !== 'undefined' && 'showDirectoryPicker' in window
let dragDepth = 0

function resetDragState() {
  dragDepth = 0
  dragActive.value = false
}

function handleDragEnter(e) {
  e.preventDefault()
  dragDepth++
  dragActive.value = true
}

function handleDragLeave(e) {
  e.preventDefault()
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dragActive.value = false
}

function handleDragOver(e) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  dragActive.value = true
}

function normalizeRelativePath(file) {
  return file.webkitRelativePath || file.name
}

function isSupportedExtension(name = '') {
  const lower = name.toLowerCase()
  return supportedExtensions.some((ext) => lower.endsWith(ext))
}

function deriveDirectoryName(fileList) {
  if (!fileList?.length) return 'Unknown folder'
  const firstPath = normalizeRelativePath(fileList[0])
  return firstPath.includes('/') ? firstPath.split('/')[0] : 'Loose files'
}

function filterSupported(list) {
  return Array.from(list || [])
    .filter((file) => isSupportedExtension(file.name))
    .map((file) => ({
      file,
      relativePath: normalizeRelativePath(file)
    }))
}

function emitFiles(selected, name) {
  lastDirectoryName.value = name
  persistState({ lastDirectoryName: name })
  emit('directory-loaded', { directoryName: name, files: selected })
}

function handleInput(e) {
  const selected = filterSupported(e.target.files)
  emitFiles(selected, deriveDirectoryName(e.target.files))
}

async function handleSystemPicker() {
  if (!supportsNativePicker) return
  pickerBusy.value = true

  try {
    const dirHandle = await window.showDirectoryPicker()
    const collected = []

    async function walkDirectory(handle, prefix = '') {
      for await (const entry of handle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile()
          if (!isSupportedExtension(file.name)) continue
          const rel = prefix ? `${prefix}/${entry.name}` : entry.name

          Object.defineProperty(file, 'webkitRelativePath', {
            value: rel,
            enumerable: true,
            configurable: true
          })

          collected.push({ file, relativePath: rel })
        }

        if (entry.kind === 'directory') {
          const next = prefix ? `${prefix}/${entry.name}` : entry.name
          await walkDirectory(entry, next)
        }
      }
    }

    await walkDirectory(dirHandle)
    emitFiles(collected, dirHandle.name)
  } catch (_err) {
    /* user cancelled — ignore */
  } finally {
    pickerBusy.value = false
  }
}

async function walkDroppedEntry(entry, prefix = '', collected = []) {
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => entry.file(resolve, reject)).catch(() => null)
    if (file && isSupportedExtension(file.name)) {
      const rel = prefix ? `${prefix}/${file.name}` : file.name
      Object.defineProperty(file, 'webkitRelativePath', {
        value: rel,
        enumerable: true,
        configurable: true
      })
      collected.push({ file, relativePath: rel })
    }
    return collected
  }

  if (entry.isDirectory) {
    const reader = entry.createReader()
    const readEntries = () =>
      new Promise((resolve, reject) => reader.readEntries(resolve, reject))

    const next = prefix ? `${prefix}/${entry.name}` : entry.name
    let batch = await readEntries()

    while (batch.length) {
      for (const child of batch) {
        await walkDroppedEntry(child, next, collected)
      }
      batch = await readEntries()
    }
  }

  return collected
}

async function handleDrop(e) {
  e.preventDefault()
  resetDragState()

  const dt = e.dataTransfer
  if (!dt) return

  const items = Array.from(dt.items || [])
  const entries = items
    .map((item) =>
      item.kind === 'file' && typeof item.webkitGetAsEntry === 'function'
        ? item.webkitGetAsEntry()
        : null
    )
    .filter(Boolean)

  if (entries.length) {
    const collected = []
    for (const entry of entries) {
      await walkDroppedEntry(entry, '', collected)
    }
    if (collected.length) {
      const label =
        entries.length === 1 && entries[0].isDirectory
          ? entries[0].name
          : deriveDirectoryName([{ webkitRelativePath: collected[0].relativePath }])
      emitFiles(collected, label)
    }
    return
  }

  if (dt.files?.length) {
    const selected = filterSupported(dt.files)
    if (selected.length) {
      emitFiles(selected, deriveDirectoryName(dt.files))
    }
  }
}
</script>

<template>
  <section class="rounded-xl p-6 bg-gray-900 border border-gray-800 shadow-lg space-y-6">
    <!-- Header -->
    <header class="space-y-1">
      <h2 class="text-xl font-semibold tracking-tight">Directory Picker</h2>
      <p class="text-sm text-gray-400">
        Supported formats:
        <code class="text-gray-300">.mp3</code>,
        <code class="text-gray-300">.wav</code>,
        <code class="text-gray-300">.ogg</code>,
        <code class="text-gray-300">.flac</code>
      </p>
      <p v-if="lastDirectoryName" class="text-xs text-gray-500">
        Last used: {{ lastDirectoryName }}
      </p>
    </header>

    <!-- Buttons -->
    <div class="flex flex-wrap items-center gap-4">
      <!-- Fallback/HTML picker -->
      <label
        class="inline-flex items-center px-4 py-2 rounded-md bg-emerald-600 text-black font-semibold cursor-pointer hover:bg-emerald-500 transition"
      >
        <span>Select folder</span>
        <input
          type="file"
          class="hidden"
          multiple
          webkitdirectory
          @change="handleInput"
        />
      </label>

      <!-- System picker -->
      <button
        type="button"
        @click="handleSystemPicker"
        :disabled="pickerBusy || !supportsNativePicker"
        class="px-4 py-2 rounded-md bg-gray-800 border border-gray-700 font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        Use System Picker
      </button>

      <p v-if="!supportsNativePicker" class="text-xs text-gray-500">
        Browser does not support showDirectoryPicker — using fallback mode.
      </p>
    </div>

    <!-- Drag + Drop area -->
    <div
      class="rounded-lg border border-dashed p-8 text-center transition-colors text-sm"
      :class="
        dragActive
          ? 'border-emerald-400 bg-emerald-600/10 text-emerald-200'
          : 'border-gray-700 bg-gray-900/40 text-gray-400'
      "
      @dragenter="handleDragEnter"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <p class="font-medium text-gray-200 mb-1">Or drag & drop a folder here</p>
      <p class="text-xs text-gray-500">
        Nested files will be read recursively.
      </p>
    </div>
  </section>
</template>
