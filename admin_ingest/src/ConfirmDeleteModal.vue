<!--
  Type-to-confirm modal. The user must retype the exact string in
  `expectedConfirmation` for the confirm button to enable. Mirrors the
  GitHub repo-deletion UX. Prevents accidental destructive clicks.

  Props:
    title:                  Modal header
    description:            HTML-safe explanation of what will happen
    expectedConfirmation:   The string the user must type back
    confirmLabel:           Button label (default "Delete")
    busy:                   When true, disables inputs and shows "Working..."
    error:                  Optional error string to surface
-->
<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  expectedConfirmation: { type: String, required: true },
  confirmLabel: { type: String, default: 'Delete' },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['close', 'confirm'])

const typed = ref('')

// Reset typed text whenever we open a fresh modal (the parent
// remounts via v-if). Defensive: also clear when expectedConfirmation
// changes within the same instance.
watch(
  () => props.expectedConfirmation,
  () => {
    typed.value = ''
  }
)

const matches = computed(() => typed.value === props.expectedConfirmation)
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    @click.self="!busy && emit('close')"
  >
    <div class="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl space-y-4">
      <header>
        <h3 class="text-lg font-semibold text-gray-100">{{ title }}</h3>
      </header>

      <p class="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
        {{ description }}
      </p>

      <div class="rounded-md border border-red-500/30 bg-red-500/5 p-3 space-y-2">
        <p class="text-xs text-gray-300">
          To confirm, type
          <code class="px-1.5 py-0.5 rounded bg-gray-800 text-red-300 text-[12px] font-mono">{{ expectedConfirmation }}</code>
          below.
        </p>
        <input
          v-model="typed"
          type="text"
          autofocus
          :disabled="busy"
          class="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 font-mono focus:(outline-none ring-2 ring-red-500/50) disabled:opacity-50"
          placeholder="Type to confirm"
        />
      </div>

      <p v-if="error" class="text-sm text-red-300">{{ error }}</p>

      <footer class="flex items-center justify-end gap-3">
        <button
          type="button"
          class="px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-sm text-gray-200 hover:bg-gray-700 disabled:opacity-40"
          :disabled="busy"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-md bg-red-500 text-black text-sm font-semibold hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="!matches || busy"
          @click="emit('confirm')"
        >
          {{ busy ? 'Working…' : confirmLabel }}
        </button>
      </footer>
    </div>
  </div>
</template>
